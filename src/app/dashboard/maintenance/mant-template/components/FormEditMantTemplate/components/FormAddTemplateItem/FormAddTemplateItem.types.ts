import { TemplateItem } from '../TemplateItemsList/TemplateItemsList.types';

export interface FormAddTemplateItemProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  templateId: number;
  onAddItem: (item: TemplateItem) => void;
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