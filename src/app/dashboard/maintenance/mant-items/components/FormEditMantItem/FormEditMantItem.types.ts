import { MantItemsListProps } from '../MantItemsList/MantItemsList.types';

export type FormEditMantItemProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  mantItem: MantItemsListProps;
  onEditMantItem: (mantItem: MantItemsListProps) => void;
};
