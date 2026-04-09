import { MasterPart } from '@prisma/client';

export type MasterPartClient = Omit<MasterPart, 'referencePrice'> & {
  referencePrice: number | null;
};

export interface FormEditPartProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  part: MasterPartClient;
  onEditPart: (part: MasterPartClient) => void;
}
