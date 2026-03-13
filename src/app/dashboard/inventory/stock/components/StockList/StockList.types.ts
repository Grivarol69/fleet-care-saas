export type InventoryItemRow = {
    id: string;
    masterPartId: string;
    warehouse: string;
    location: string | null;
    quantity: number;
    minStock: number;
    maxStock: number | null;
    averageCost: number;
    totalValue: number;
    status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
    masterPart: {
        id: string;
        code: string;
        description: string;
        unit: string;
    };
};

export type StockListProps = {
    initialItems: InventoryItemRow[];
    userCanManage: boolean;
};
