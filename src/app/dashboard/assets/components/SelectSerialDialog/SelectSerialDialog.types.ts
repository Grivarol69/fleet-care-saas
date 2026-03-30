export interface SelectSerialDialogProps {
  vehicleId: string;
  vehicleLicensePlate: string;
  position: string;
  itemType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
