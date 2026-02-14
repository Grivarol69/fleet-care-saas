import { TechnicianListProps } from '../TechnicianList/TechnicianList.types';

export type FormEditTechnicianProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onEditTechnician: (technician: TechnicianListProps) => void;
  defaultValues: TechnicianListProps;
};
