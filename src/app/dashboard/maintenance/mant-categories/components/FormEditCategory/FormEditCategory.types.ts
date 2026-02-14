export type FormEditCategoryProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  category: { id: number; name: string };
  onEditCategory: (category: { id: number; name: string }) => void;
};
