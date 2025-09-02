export type MantItemsListProps = {
    id: number;
    name: string;
    description?: string | null;
    mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
    estimatedTime: number; // En decimal para horas
    categoryId: number;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    // Join con MantCategory
    category: {
        id: number;
        name: string;
    };
};
