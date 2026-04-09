export interface SerialItemEventDialogProps {
  itemId: string;
  itemSerialNumber: string;
  itemType: string;
  currentStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
