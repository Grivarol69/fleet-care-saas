export interface FuelVoucherRow {
  id: string;
  voucherNumber: string;
  date: string;
  fuelType: string;
  liters: string | number;
  odometer: number;
  pricePerLiter?: string | number | null;
  totalAmount?: string | number | null;
  notes?: string | null;
  vehicle: {
    id: string;
    licensePlate: string;
  };
  driver?: {
    id: string;
    name: string;
  } | null;
  provider?: {
    id: string;
    name: string;
  } | null;
  createdAt?: string;
}

export interface FuelVoucherTableProps {
  vouchers: FuelVoucherRow[];
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}
