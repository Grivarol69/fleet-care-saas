import { TemplateItem } from '../TemplateItemsList/TemplateItemsList.types';

export interface FormEditTemplateItemProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: TemplateItem;
  onEditItem: (item: TemplateItem) => void;
}

export interface MantItem {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  estimatedTime: string;
  categoryId: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    name: string;
  };
}