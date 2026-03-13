import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManagePurchases } from '@/lib/permissions';

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get('page')) || 1;
        const pageSize = 20;

        const item = await tenantPrisma.inventoryItem.findUnique({
            where: { id },
            include: {
                masterPart: true,
                movements: {
                    orderBy: { performedAt: 'desc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                },
            },
        });

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        const total = await tenantPrisma.inventoryMovement.count({
            where: { inventoryItemId: id },
        });

        const serializedItem = {
            ...item,
            quantity: Number(item.quantity),
            minStock: Number(item.minStock),
            maxStock: item.maxStock ? Number(item.maxStock) : null,
            averageCost: Number(item.averageCost),
            totalValue: Number(item.totalValue),
            movements: item.movements.map((m: any) => ({
                ...m,
                quantity: Number(m.quantity),
                unitCost: Number(m.unitCost),
                totalCost: Number(m.totalCost),
                previousStock: Number(m.previousStock),
                newStock: Number(m.newStock),
                previousAvgCost: Number(m.previousAvgCost),
                newAvgCost: Number(m.newAvgCost),
            })),
        };

        return NextResponse.json({
            item: serializedItem,
            movements: serializedItem.movements,
            pagination: { total, page, pageSize },
        });
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!canManagePurchases(user)) {
            return NextResponse.json(
                { error: 'No tienes permisos para esta acción' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { minStock, maxStock, location, warehouse } = body;

        if (maxStock !== undefined && minStock !== undefined && maxStock <= minStock) {
            return NextResponse.json(
                { error: 'maxStock debe ser mayor a minStock' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (minStock !== undefined) updateData.minStock = minStock;
        if (maxStock !== undefined) updateData.maxStock = maxStock;
        if (location !== undefined) updateData.location = location;
        if (warehouse !== undefined) updateData.warehouse = warehouse;

        const updatedItem = await tenantPrisma.inventoryItem.update({
            where: { id },
            data: updateData,
            include: {
                masterPart: true,
            },
        });

        const serializedItem = {
            ...updatedItem,
            quantity: Number(updatedItem.quantity),
            minStock: Number(updatedItem.minStock),
            maxStock: updatedItem.maxStock ? Number(updatedItem.maxStock) : null,
            averageCost: Number(updatedItem.averageCost),
            totalValue: Number(updatedItem.totalValue),
        };

        return NextResponse.json(serializedItem);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
