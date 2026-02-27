export type FormAddCategoryProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddCategory: (category: { id: string; name: string }) => void;
};
