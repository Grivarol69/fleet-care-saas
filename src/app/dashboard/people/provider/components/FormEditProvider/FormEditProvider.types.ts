import { ProviderListProps } from "../ProviderList/ProviderList.types";

export type FormEditProviderProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onEditProvider: (provider: ProviderListProps) => void;
  defaultValues: ProviderListProps;
};