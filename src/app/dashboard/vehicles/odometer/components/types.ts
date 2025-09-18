export interface Vehicle {
  id: number;
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
  id: number;
  name: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
}

export interface OdometerFormData {
  vehicleId: number;
  driverId?: number;
  kilometers?: number;
  hours?: number;
  measureType: 'KILOMETERS' | 'HOURS';
  recordedAt: Date;
}

export interface OdometerLog {
  id: number;
  vehicleId: number;
  driverId?: number;
  kilometers?: number;
  hours?: number;
  measureType: 'KILOMETERS' | 'HOURS';
  recordedAt: Date;
  createdAt: Date;
  vehicle: Vehicle;
  driver?: Driver;
}