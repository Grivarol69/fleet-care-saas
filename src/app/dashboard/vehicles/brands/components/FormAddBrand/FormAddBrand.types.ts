export type FormAddBrandProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddBrand: (brand: { id: number; name: string }) => void;
};
