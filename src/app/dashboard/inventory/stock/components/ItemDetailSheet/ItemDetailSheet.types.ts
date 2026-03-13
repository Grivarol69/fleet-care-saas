import { InventoryItemRow } from '../StockList/StockList.types';

export type MovementRow = {
    id: string;
    movementType: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    previousStock: number;
    newStock: number;
    referenceType: string;
    referenceId: string;
    performedAt: string;
};

export type ItemDetailSheetProps = {
    item: InventoryItemRow | null;
    open: boolean;
    onOpenChange: (v: boolean) => void;
    userCanManage: boolean;
    onItemUpdated: (item: InventoryItemRow) => void;
};
