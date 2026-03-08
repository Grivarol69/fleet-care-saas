import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManagePurchases } from '@/lib/permissions';
import { z } from 'zod';

const patchSchema = z.object({
    invoiceNumber: z.string().min(1).optional(),
    invoiceDate: z.string().optional(),
    supplierId: z.string().optional(),
});

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!canManagePurchases(user)) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        const { id } = await params;

        const purchase = await tenantPrisma.invoice.findUnique({
            where: {
                id,
                tenantId: user.tenantId,
            },
            include: {
                supplier: true,
                items: {
                    include: {
                        masterPart: true,
                    },
                },
            },
        });

        if (!purchase) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        }

        return NextResponse.json(purchase);
    } catch (error) {
        console.error('[INVENTORY_PURCHASE_ID_GET]', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!canManagePurchases(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;

        const purchase = await tenantPrisma.invoice.findUnique({
            where: { id, tenantId: user.tenantId },
        });

        if (!purchase) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        }

        if (purchase.status === 'CANCELLED') {
            return NextResponse.json(
                { error: 'No se puede editar una compra cancelada' },
                { status: 400 }
            );
        }

        const json = await req.json();
        const body = patchSchema.parse(json);

        const updateData: any = {};
        if (body.invoiceNumber) updateData.invoiceNumber = body.invoiceNumber;
        if (body.invoiceDate) updateData.invoiceDate = new Date(body.invoiceDate);
        if (body.supplierId) updateData.supplierId = body.supplierId;

        const updated = await tenantPrisma.invoice.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(error.issues, { status: 422 });
        }
        console.error('[INVENTORY_PURCHASE_ID_PATCH]', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!canManagePurchases(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;

        const purchase = await tenantPrisma.invoice.findUnique({
            where: { id, tenantId: user.tenantId },
        });

        if (!purchase) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        }

        if (purchase.status === 'PAID') {
            return NextResponse.json(
                { error: 'No se puede eliminar una compra pagada' },
                { status: 400 }
            );
        }

        await tenantPrisma.invoice.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[INVENTORY_PURCHASE_ID_DELETE]', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
