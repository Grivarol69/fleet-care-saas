import { MasterPart } from '@prisma/client';

export interface FormAddPartProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAddPart: (part: MasterPart) => void;
}
