import { z } from 'zod';

export const fuelVoucherFormSchema = z.object({
  vehicleId: z.string().min(1, 'Debe seleccionar un vehículo'),
  date: z.date({ required_error: 'La fecha es requerida' }),
  odometer: z.coerce.number().min(0, 'El odómetro debe ser mayor o igual a 0'),
  fuelType: z.string().min(1, 'Debe seleccionar el tipo de combustible'),
  quantity: z.coerce.number().min(0.001, 'La cantidad debe ser mayor a 0'),
  volumeUnit: z.enum(['LITERS', 'GALLONS']).default('LITERS'),
  driverId: z.string().optional(),
  providerId: z.string().optional(),
  pricePerUnit: z.preprocess(
    v => (v === '' || v === null ? undefined : v),
    z.coerce.number().positive().optional()
  ),
  notes: z.string().optional(),
});

export type FuelVoucherFormValues = z.infer<typeof fuelVoucherFormSchema>;
