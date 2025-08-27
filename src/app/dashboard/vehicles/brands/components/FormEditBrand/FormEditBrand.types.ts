export type FormEditBrandProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    brand: { id: number; name: string };
    onEditBrand: (category: { id: number; name: string }) => void;
};
