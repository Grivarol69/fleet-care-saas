export type FormAddTypeProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddType: (brand: { id: number; name: string }) => void;
};
