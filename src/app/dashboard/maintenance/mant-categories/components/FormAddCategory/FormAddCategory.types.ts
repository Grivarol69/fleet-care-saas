export type FormAddCategoryProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onAddCategory: (category: { id: number; name: string }) => void;
};
