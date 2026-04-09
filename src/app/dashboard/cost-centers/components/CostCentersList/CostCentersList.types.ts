export interface CostCenter {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    taxId: string | null;
    billingEmail: string | null;
    phone: string | null;
    address: string | null;
    siigoId: string | null;
    siigoIdType: string | null;
    siigoPersonType: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: {
        vehicles: number;
    };
}

export interface CostCenterFormData {
    code: string;
    name: string;
    description?: string | null;
    isActive?: boolean;
    taxId?: string | null;
    billingEmail?: string | null;
    phone?: string | null;
    address?: string | null;
}
