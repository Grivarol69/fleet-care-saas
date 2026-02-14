export type FormEditTypeProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  type: { id: number; name: string };
  onEditType: (category: { id: number; name: string }) => void;
};
