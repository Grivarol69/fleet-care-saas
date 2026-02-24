import { MasterPart } from '@prisma/client';

export interface FormEditPartProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  part: MasterPart;
  onEditPart: (part: MasterPart) => void;
}
