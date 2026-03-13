import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/auth';
import { canManagePurchases } from '@/lib/permissions';
import { StockList } from './components/StockList';
import { InventoryItemRow } from './components/StockList/StockList.types';

export default async function InventoryStockPage() {
    const { user, tenantPrisma } = await requireCurrentUser();

    if (!user) {
        redirect('/sign-in');
    }

    if (user.role === 'DRIVER') {
        redirect('/dashboard');
    }

    const items = await tenantPrisma.inventoryItem.findMany({
        include: { masterPart: true },
        orderBy: { masterPart: { description: 'asc' } },
    });

    const serializedItems: InventoryItemRow[] = items.map((item: any) => ({
        id: item.id,
        masterPartId: item.masterPartId,
        warehouse: item.warehouse,
        location: item.location,
        quantity: Number(item.quantity),
        minStock: Number(item.minStock),
        maxStock: item.maxStock ? Number(item.maxStock) : null,
        averageCost: Number(item.averageCost),
        totalValue: Number(item.totalValue),
        status: item.status,
        masterPart: {
            id: item.masterPart.id,
            code: item.masterPart.code,
            description: item.masterPart.description,
            unit: item.masterPart.unit,
        },
    }));

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Stock de Inventario</h1>
                <p className="text-muted-foreground">
                    Gestión de stock, umbrales y ajustes manuales de inventario.
                </p>
            </div>
            <StockList
                initialItems={serializedItems}
                userCanManage={canManagePurchases(user)}
            />
        </div>
    );
}
