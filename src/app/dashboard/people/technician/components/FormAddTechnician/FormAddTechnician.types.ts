import { TechnicianListProps } from '../TechnicianList/TechnicianList.types';

export type FormAddTechnicianProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddTechnician: (technician: TechnicianListProps) => void;
};
