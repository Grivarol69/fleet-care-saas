import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";
import { z } from 'zod';

// GET - List document types: global for tenant's country + custom for tenant
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Get tenant country
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { country: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const documentTypes = await prisma.documentTypeConfig.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { isGlobal: true, countryCode: tenant.country },
          { tenantId: user.tenantId },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(documentTypes);
  } catch (error) {
    console.error("[DOCUMENT_TYPES_GET]", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

const createDocTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  requiresExpiry: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
  expiryWarningDays: z.number().int().min(0).optional(),
  expiryCriticalDays: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isGlobal: z.boolean().optional(),
  countryCode: z.string().length(2).optional(),
});

// POST - Create a document type (global = SUPER_ADMIN only, custom = OWNER/MANAGER)
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createDocTypeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const isGlobal = data.isGlobal === true;

    // Only SUPER_ADMIN can create global types
    if (isGlobal && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo SUPER_ADMIN puede crear tipos globales' },
        { status: 403 }
      );
    }

    // OWNER/MANAGER can create tenant-specific types
    if (!isGlobal && !['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear tipos de documento' },
        { status: 403 }
      );
    }

    // Get tenant country for the countryCode
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { country: true },
    });

    const countryCode = isGlobal
      ? (data.countryCode || tenant?.country || 'CO')
      : (tenant?.country || 'CO');

    const docType = await prisma.documentTypeConfig.create({
      data: {
        tenantId: isGlobal ? null : user.tenantId,
        isGlobal,
        countryCode,
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description ?? null,
        requiresExpiry: data.requiresExpiry ?? true,
        isMandatory: data.isMandatory ?? false,
        expiryWarningDays: data.expiryWarningDays ?? 30,
        expiryCriticalDays: data.expiryCriticalDays ?? 7,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    return NextResponse.json(docType, { status: 201 });
  } catch (error) {
    console.error("[DOCUMENT_TYPES_POST]", error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un tipo de documento con ese código' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
