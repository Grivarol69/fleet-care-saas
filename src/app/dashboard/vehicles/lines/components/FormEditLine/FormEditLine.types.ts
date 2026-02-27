export type FormEditLineProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  line: {
    id: string;
    name: string;
    brandId: string;
    brandName?: string;
  };
  onEditLine: (line: {
    id: string;
    name: string;
    brandId: string;
    brandName?: string;
  }) => void;
};
