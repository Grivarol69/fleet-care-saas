import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManagePurchases } from '@/lib/permissions';

export async function POST(request: Request) {
    try {
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
        const { inventoryItemId, type, quantity, unitCost, notes } = body;

        if (
            !inventoryItemId ||
            !type ||
            quantity === undefined ||
            !notes ||
            notes.length < 5
        ) {
            return NextResponse.json(
                { error: 'Missing required fields or invalid notes (min 5 chars)' },
                { status: 400 }
            );
        }

        if (type !== 'ADJUSTMENT_IN' && type !== 'ADJUSTMENT_OUT') {
            return NextResponse.json(
                { error: 'Invalid adjustment type' },
                { status: 400 }
            );
        }

        const qty = Number(quantity);
        if (qty <= 0) {
            return NextResponse.json(
                { error: 'Quantity must be greater than 0' },
                { status: 400 }
            );
        }

        if (type === 'ADJUSTMENT_IN' && unitCost === undefined) {
            return NextResponse.json(
                { error: 'unitCost is required for ADJUSTMENT_IN' },
                { status: 400 }
            );
        }

        const cost = unitCost ? Number(unitCost) : 0;

        const result = await tenantPrisma.$transaction(async tx => {
            const item = await tx.inventoryItem.findUnique({
                where: { id: inventoryItemId },
            });

            if (!item) {
                throw new Error('NOT_FOUND');
            }

            if (item.tenantId !== user.tenantId) {
                throw new Error('NOT_FOUND'); // Using NOT_FOUND for security, but could be unauthorized
            }

            const currentStock = Number(item.quantity);
            const currentTotalValue = Number(item.totalValue);
            const currentAvgCost = Number(item.averageCost);

            let newStock = currentStock;
            let newTotalValue = currentTotalValue;
            let newAvgCost = currentAvgCost;
            let movementTotalCost = 0;

            if (type === 'ADJUSTMENT_IN') {
                movementTotalCost = qty * cost;
                newStock = currentStock + qty;
                newTotalValue = currentTotalValue + movementTotalCost;

                if (newStock > 0) {
                    newAvgCost = newTotalValue / newStock;
                }
            } else {
                if (currentStock < qty) {
                    throw new Error('INSUFFICIENT_STOCK');
                }

                movementTotalCost = qty * currentAvgCost;
                newStock = currentStock - qty;
                newTotalValue = currentTotalValue - movementTotalCost;

                if (newStock === 0) {
                    newTotalValue = 0;
                }
            }

            const updatedItem = await tx.inventoryItem.update({
                where: { id: inventoryItemId },
                data: {
                    quantity: newStock,
                    totalValue: newTotalValue,
                    averageCost: newAvgCost,
                    status:
                        newStock <= Number(item.minStock)
                            ? newStock === 0
                                ? 'OUT_OF_STOCK'
                                : 'LOW_STOCK'
                            : 'ACTIVE',
                },
            });

            const movement = await tx.inventoryMovement.create({
                data: {
                    tenantId: user.tenantId,
                    inventoryItemId,
                    movementType: type,
                    quantity: qty,
                    unitCost: type === 'ADJUSTMENT_IN' ? cost : currentAvgCost,
                    totalCost: movementTotalCost,
                    previousStock: currentStock,
                    newStock: newStock,
                    previousAvgCost: currentAvgCost,
                    newAvgCost: newAvgCost,
                    referenceType: 'MANUAL_ADJUSTMENT',
                    referenceId: notes,
                    performedBy: user.id,
                },
            });

            return { movement, updatedItem };
        });

        const serializedResult = {
            movement: {
                ...result.movement,
                quantity: Number(result.movement.quantity),
                unitCost: Number(result.movement.unitCost),
                totalCost: Number(result.movement.totalCost),
                previousStock: Number(result.movement.previousStock),
                newStock: Number(result.movement.newStock),
                previousAvgCost: Number(result.movement.previousAvgCost),
                newAvgCost: Number(result.movement.newAvgCost),
            },
            updatedItem: {
                ...result.updatedItem,
                quantity: Number(result.updatedItem.quantity),
                minStock: Number(result.updatedItem.minStock),
                maxStock: result.updatedItem.maxStock ? Number(result.updatedItem.maxStock) : null,
                averageCost: Number(result.updatedItem.averageCost),
                totalValue: Number(result.updatedItem.totalValue),
            },
        };

        return NextResponse.json(serializedResult, { status: 201 });
    } catch (error: any) {
        console.error('Error processing inventory adjustment:', error);
        if (error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Inventory Item not found' }, { status: 404 });
        }
        if (error.message === 'INSUFFICIENT_STOCK') {
            return NextResponse.json({ error: 'Stock insuficiente para realizar el ajuste. Stock actual menor que la cantidad requerida.' }, { status: 422 });
        }
        return new NextResponse('Internal Error', { status: 500 });
    }
}
