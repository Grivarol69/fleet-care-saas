export type FormEditCategoryProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  category: { id: string; name: string };
  onEditCategory: (category: { id: string; name: string }) => void;
};
