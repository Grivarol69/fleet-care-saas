import { z } from 'zod';

export const vehicleFormSchema = z
  .object({
    photo: z.string().optional(),
    licensePlate: z.string().min(3, 'La placa debe tener al menos 3 caracteres'),
    typePlate: z.enum(['PARTICULAR', 'PUBLICO']),
    brandId: z.string().min(1, 'Seleccione una marca'),
    lineId: z.string().min(1, 'Seleccione una línea'),
    typeId: z.string().min(1, 'Seleccione un tipo'),
    mileage: z.coerce.number().min(0, 'El kilometraje debe ser positivo'),
    cylinder: z.coerce.number().optional(),
    bodyWork: z.string().optional(),
    engineNumber: z.string().optional(),
    chasisNumber: z.string().optional(),
    ownerCard: z.string().optional(),
    color: z.string().min(1, 'El color es requerido'),
    owner: z.enum(['OWN', 'LEASED', 'RENTED', 'THIRD_PARTY']),
    costCenterId: z.string().optional().nullable(),
    year: z.coerce
      .number()
      .min(1900, 'Ingrese un año válido')
      .max(new Date().getFullYear() + 1),
    situation: z.string().min(1, 'Seleccione el estado'),
    fuelType: z
      .enum(['DIESEL', 'GASOLINA', 'GAS', 'ELECTRICO', 'HIBRIDO'])
      .optional()
      .nullable(),
    serviceType: z
      .enum(['PUBLICO', 'PARTICULAR', 'OFICIAL'])
      .optional()
      .nullable(),
  })
  .refine(data => data.owner !== 'THIRD_PARTY' || !!data.costCenterId, {
    message: 'El centro de costos es requerido para vehículos de terceros',
    path: ['costCenterId'],
  });

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
