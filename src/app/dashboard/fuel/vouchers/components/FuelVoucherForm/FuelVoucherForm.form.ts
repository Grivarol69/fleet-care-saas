import { z } from 'zod';

export const FUEL_TYPE_LABELS: Record<string, string> = {
  NAFTA_SUPER: 'Nafta Super',
  NAFTA_PREMIUM: 'Nafta Premium',
  GASOIL: 'Gasoil',
  GNC: 'GNC',
  DIESEL: 'Diesel',
  DIESEL_PREMIUM: 'Diesel Premium',
} as const;

export const FUEL_TYPES = Object.keys(FUEL_TYPE_LABELS);

export const fuelVoucherFormSchema = z.object({
  vehicleId: z.string().min(1, 'Debe seleccionar un vehículo'),
  date: z.date({ required_error: 'La fecha es requerida' }),
  odometer: z.coerce.number().min(0, 'El odómetro debe ser mayor o igual a 0'),
  fuelType: z.string().min(1, 'Debe seleccionar el tipo de combustible'),
  liters: z.coerce.number().min(0.001, 'Los litros deben ser mayores a 0'),
  driverId: z.string().optional(),
  providerId: z.string().optional(),
  pricePerLiter: z.preprocess(
    v => (v === '' || v === null ? undefined : v),
    z.coerce.number().positive().optional()
  ),
  notes: z.string().optional(),
});

export type FuelVoucherFormValues = z.infer<typeof fuelVoucherFormSchema>;
