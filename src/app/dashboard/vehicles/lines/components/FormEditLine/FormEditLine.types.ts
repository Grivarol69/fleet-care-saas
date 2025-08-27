export type FormEditLineProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    line: {
        id: number;
        name: string;
        brandId: number;
        brandName?: string;
    };
    onEditLine: (line: {
        id: number;
        name: string;
        brandId: number;
        brandName?: string;
    }) => void;
};

