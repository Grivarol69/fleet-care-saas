import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { canManageCostCenters } from '@/lib/permissions';

const costCenterSchema = z.object({
    code: z.string().min(1, 'El código es requerido'),
    name: z.string().min(1, 'El nombre es requerido'),
    description: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
    taxId: z.string().optional().nullable(),
    billingEmail: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!canManageCostCenters(user)) {
            return NextResponse.json(
                { error: 'No tienes permisos para esta acción' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const includeDeleted = searchParams.get('includeDeleted') === 'true';

        const costCenters = await tenantPrisma.costCenter.findMany({
            where: {
                tenantId: user.tenantId,
                ...(includeDeleted ? {} : { isActive: true }),
                ...(search
                    ? {
                        OR: [
                            { code: { contains: search, mode: 'insensitive' } },
                            { name: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            include: {
                _count: {
                    select: { vehicles: true }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(costCenters);
    } catch (error) {
        console.error('[COST_CENTERS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!canManageCostCenters(user)) {
            return NextResponse.json(
                { error: 'No tienes permisos para esta acción' },
                { status: 403 }
            );
        }

        const json = await req.json();
        const body = costCenterSchema.parse(json);

        // Validate unique code per tenant
        const existing = await tenantPrisma.costCenter.findUnique({
            where: {
                tenantId_code: {
                    tenantId: user.tenantId,
                    code: body.code,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Ya existe un centro de costos con este código' },
                { status: 400 }
            );
        }

        const costCenter = await tenantPrisma.costCenter.create({
            data: {
                ...body,
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(costCenter);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 });
        }
        console.error('[COST_CENTERS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
