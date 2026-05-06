export interface SelectSerialDialogProps {
  vehicleId: string;
  vehicleLicensePlate: string;
  position: string;
  itemType: string;
  installedAtKm?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
