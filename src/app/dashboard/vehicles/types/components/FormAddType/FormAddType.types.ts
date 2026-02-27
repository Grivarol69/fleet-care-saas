export type FormAddTypeProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddType: (brand: { id: string; name: string }) => void;
};
