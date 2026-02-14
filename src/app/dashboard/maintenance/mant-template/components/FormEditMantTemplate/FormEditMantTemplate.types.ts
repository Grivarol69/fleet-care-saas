import { MantTemplatesListProps } from '../MantTemplatesList/MantTemplatesList.types';

export interface FormEditMantTemplateProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  template: MantTemplatesListProps;
  onEditTemplate: (template: MantTemplatesListProps) => void;
}

export interface VehicleBrand {
  id: number;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleLine {
  id: number;
  tenantId: string;
  name: string;
  brandId: number;
  createdAt: string;
  updatedAt: string;
  brand?: {
    name: string;
  };
}
