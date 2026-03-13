export type ProviderListProps = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  specialty: string | null;
  nit: string | null;
  siigoIdType: string | null;
  siigoPersonType: string | null;
  stateCode: string | null;
  cityCode: string | null;
  fiscalResponsibilities: string[];
  vatResponsible: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type FormAddProviderProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddProvider: (provider: ProviderListProps) => void;
};

export type FormEditProviderProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onEditProvider: (provider: ProviderListProps) => void;
  defaultValues: ProviderListProps;
};
