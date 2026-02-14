export type DriverListProps = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};
