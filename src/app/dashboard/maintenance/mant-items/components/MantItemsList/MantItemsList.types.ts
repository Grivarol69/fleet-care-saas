export type MantItemsListProps = {
    id: number;
    name: string;
    description?: string | null;
    mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
    categoryId: number;
    type: 'ACTION' | 'PART' | 'SERVICE';
    status: 'ACTIVE' | 'INACTIVE';
    isGlobal?: boolean;
    createdAt: string;
    updatedAt: string;
    category: {
        id: number;
        name: string;
    };
};
