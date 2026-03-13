import { MasterPart } from '@prisma/client';

export type MasterPartClient = Omit<MasterPart, 'referencePrice'> & {
  referencePrice: number | null;
};

export interface FormAddPartProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAddPart: (part: MasterPartClient) => void;
}
