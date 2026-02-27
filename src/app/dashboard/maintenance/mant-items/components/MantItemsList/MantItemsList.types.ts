export type MantItemsListProps = {
  id: string;
  name: string;
  description?: string | null;
  mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  categoryId: string;
  type: 'ACTION' | 'PART' | 'SERVICE';
  status: 'ACTIVE' | 'INACTIVE';
  isGlobal?: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  };
};
