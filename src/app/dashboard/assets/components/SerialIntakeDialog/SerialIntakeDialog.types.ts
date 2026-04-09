export interface SerialIntakeDialogProps {
  invoiceItemId: string;
  invoiceItemDescription: string;
  quantity: number;
  type: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdCount: number) => void;
}
