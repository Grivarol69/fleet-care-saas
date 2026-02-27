export type FormEditTypeProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  type: { id: string; name: string };
  onEditType: (category: { id: string; name: string }) => void;
};
