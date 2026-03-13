import { MasterPart, InventoryItem } from '@prisma/client';

export type InventoryItemClient = Omit<
  InventoryItem,
  'quantity' | 'minStock' | 'maxStock' | 'averageCost' | 'totalValue'
> & {
  quantity: number;
  minStock: number;
  maxStock: number | null;
  averageCost: number;
  totalValue: number;
};

export type MasterPartRow = Omit<MasterPart, 'referencePrice'> & {
  referencePrice: number | null;
  inventoryItems: InventoryItemClient[];
};

export interface PartsListProps {
  initialParts: MasterPartRow[];
  userIsSuperAdmin: boolean;
  userCanManage: boolean;
}
