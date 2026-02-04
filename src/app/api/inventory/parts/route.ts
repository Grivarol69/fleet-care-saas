import { prisma } from "@/lib/prisma";
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";
import { z } from 'zod';

// Schema for creating a MasterPart
const createMasterPartSchema = z.object({
    code: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    subcategory: z.string().optional(),
    unit: z.string().default('UNIDAD'),
    referencePrice: z.number().min(0).optional(),
    isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        const whereClause: Prisma.MasterPartWhereInput = {
            isActive: true,
            AND: [
                {
                    OR: [
                        { tenantId: null },
                        { tenantId: user.tenantId }
                    ]
                }
            ]
        };

        if (category) {
            whereClause.category = category;
        }

        if (search) {
            // Safely add search conditions to AND array
            if (Array.isArray(whereClause.AND)) {
                whereClause.AND.push({
                    OR: [
                        { description: { contains: search, mode: 'insensitive' } },
                        { code: { contains: search, mode: 'insensitive' } }
                    ]
                });
            }
        }

        const parts = await prisma.masterPart.findMany({
            where: whereClause,
            orderBy: { description: 'asc' },
        });

        return NextResponse.json(parts);
    } catch (error) {
        console.error("[MASTER_PARTS_GET]", error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Only authorized roles can create parts
        // Assuming OWNER, MANAGER, PURCHASER
        const allowedRoles = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'PURCHASER'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await req.json();
        const validation = createMasterPartSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos', details: validation.error.flatten() }, { status: 400 });
        }

        const data = validation.data;

        // Check if code exists in this scope
        const existing = await prisma.masterPart.findFirst({
            where: {
                code: data.code,
                OR: [
                    { tenantId: null }, // Conflict with global
                    { tenantId: user.tenantId } // Conflict with local
                ]
            }
        });

        if (existing) {
            return NextResponse.json({ error: `El código ${data.code} ya existe` }, { status: 409 });
        }

        const part = await prisma.masterPart.create({
            data: {
                tenantId: user.tenantId,
                code: data.code,
                description: data.description,
                category: data.category,
                subcategory: data.subcategory ?? null,
                unit: data.unit,
                referencePrice: data.referencePrice ?? null,
                isActive: data.isActive,
            },
        });

        return NextResponse.json(part, { status: 201 });
    } catch (error) {
        console.error("[MASTER_PARTS_POST]", error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
