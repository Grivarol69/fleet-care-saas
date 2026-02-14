export type TechnicianListProps = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type FormAddTechnicianProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddTechnician: (technician: TechnicianListProps) => void;
};

export type FormEditTechnicianProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onEditTechnician: (technician: TechnicianListProps) => void;
  defaultValues: TechnicianListProps;
};
