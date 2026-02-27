export type FormEditBrandProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  brand: { id: string; name: string };
  onEditBrand: (category: { id: string; name: string }) => void;
};
