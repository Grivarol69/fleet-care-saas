export type MantItemsListProps = {
    id: number;
    name: string;
    description?: string | null;
    mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
    categoryId: number;
    type: 'ACTION' | 'PART' | 'SERVICE';
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    // Join con MantCategory
    category: {
        id: number;
        name: string;
    };
};
