export type FormAddBrandProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddBrand: (brand: { id: string; name: string }) => void;
};
