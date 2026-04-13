import { ReactNode } from 'react';

export type LookupItem = {
  id: string;
  name: string;
  isGlobal: boolean;
};

export type LookupSelectFieldProps<T extends LookupItem> = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (id: string) => void;
  items: T[];
  onItemsChange: (items: T[]) => void;
  disabled?: boolean;
  renderCreateDialog: (props: {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    onSuccess: (item: T) => void;
  }) => ReactNode;
  renderEditDialog: (props: {
    item: T;
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    onSuccess: (item: T) => void;
  }) => ReactNode;
  deleteEndpoint: (id: string) => string;
};
