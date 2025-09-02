export interface TemplateItemsListProps {
  templateId: number;
}

export interface TemplateItem {
  id: number;
  planId: number;
  mantItemId: number;
  triggerKm: number;
  createdAt: string;
  mantItem: {
    id: number;
    name: string;
    description?: string | null;
    mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
    estimatedTime: string;
    category: {
      id: number;
      name: string;
    };
  };
}