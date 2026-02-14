import { ProviderListProps } from '../ProviderList/ProviderList.types';

export type FormAddProviderProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddProvider: (provider: ProviderListProps) => void;
};
