export type MantItemsListProps = {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  type: 'PART' | 'SERVICE';
  status: 'ACTIVE' | 'INACTIVE';
  isGlobal?: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  };
};
