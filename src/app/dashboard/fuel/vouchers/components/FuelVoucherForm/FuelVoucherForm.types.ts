export interface FuelVehicle {
  id: string;
  licensePlate: string;
  brand?: { name: string };
  line?: { name: string };
  mileage?: number;
}

export interface FuelDriver {
  id: string;
  name: string;
}

export interface FuelProvider {
  id: string;
  name: string;
}

export interface FuelVoucherFormProps {
  onSubmit: (values: FuelVoucherFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export interface FuelVoucherFormValues {
  vehicleId: string;
  date: Date;
  odometer: number;
  fuelType: string;
  quantity: number;
  volumeUnit: 'LITERS' | 'GALLONS';
  driverId?: string;
  providerId?: string;
  pricePerUnit?: number;
  notes?: string;
}
