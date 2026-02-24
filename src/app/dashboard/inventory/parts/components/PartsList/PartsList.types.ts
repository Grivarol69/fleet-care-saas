import { MasterPart, InventoryItem } from '@prisma/client';

export type MasterPartRow = MasterPart & {
  inventoryItems: InventoryItem[];
};

export interface PartsListProps {
  initialParts: MasterPartRow[];
  userIsSuperAdmin: boolean;
  userCanManage: boolean;
}
