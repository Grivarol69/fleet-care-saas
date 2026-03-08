import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { canManageCostCenters } from '@/lib/permissions';

const costCenterSchema = z.object({
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    taxId: z.string().optional().nullable(),
    billingEmail: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
});

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        const costCenter = await tenantPrisma.costCenter.findUnique({
            where: {
                id,
            },
            include: {
                vehicles: {
                    select: {
                        id: true,
                        licensePlate: true,
                        brand: { select: { name: true } },
                        line: { select: { name: true } },
                        status: true
                    }
                }
            }
        });

        if (!costCenter) {
            return NextResponse.json({ error: 'Centro de costos no encontrado' }, { status: 404 });
        }

        return NextResponse.json(costCenter);
    } catch (error) {
        console.error('[COST_CENTER_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        // Validate if code is changed
        if (body.code) {
            const existing = await tenantPrisma.costCenter.findFirst({
                where: {
                    tenantId: user.tenantId,
                    code: body.code,
                    id: { not: id } // Exclude current record
                },
            });

            if (existing) {
                return NextResponse.json(
                    { error: 'Ya existe otro centro de costos con este código' },
                    { status: 400 }
                );
            }
        }

        const costCenter = await tenantPrisma.costCenter.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(costCenter);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 });
        }
        console.error('[COST_CENTER_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        // Soft delete
        const costCenter = await tenantPrisma.costCenter.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json(costCenter);
    } catch (error) {
        console.error('[COST_CENTER_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
