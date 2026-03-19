export interface FuelVoucherRow {
  id: string;
  voucherNumber: string;
  date: string;
  fuelType: string;
  quantity: string | number;
  volumeUnit: 'LITERS' | 'GALLONS';
  odometer: number;
  pricePerUnit?: string | number | null;
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
  countryCode?: string;
}
