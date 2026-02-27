export interface Vehicle {
  id: string;
  licensePlate: string;
  brand: {
    name: string;
  };
  line: {
    name: string;
  };
  type: {
    name: string;
  };
  year: number;
  mileage: number;
}

export interface Driver {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
}

export interface OdometerFormData {
  vehicleId: string;
  driverId?: string;
  kilometers?: number;
  hours?: number;
  measureType: 'KILOMETERS' | 'HOURS';
  recordedAt: Date;
}

export interface OdometerLog {
  id: string;
  vehicleId: string;
  driverId?: string;
  kilometers?: number;
  hours?: number;
  measureType: 'KILOMETERS' | 'HOURS';
  recordedAt: Date;
  createdAt: Date;
  vehicle: Vehicle;
  driver?: Driver;
}
