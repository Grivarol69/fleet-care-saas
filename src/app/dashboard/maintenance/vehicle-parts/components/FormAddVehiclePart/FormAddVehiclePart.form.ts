import { z } from 'zod';

export const formSchema = z.object({
  mantItemId: z
    .string()
    .min(1)
    .min(1, 'Debe seleccionar un item de mantenimiento'),
  vehicleBrandId: z.string().min(1).min(1, 'Debe seleccionar una marca'),
  vehicleLineId: z.string().min(1).min(1, 'Debe seleccionar una linea'),
  yearFrom: z.number().nullable(),
  yearTo: z.number().nullable(),
  masterPartId: z.string().min(1, 'Debe seleccionar una autoparte'),
  quantity: z.number().min(0.1, 'La cantidad debe ser mayor a 0'),
  notes: z.string().nullable(),
  isGlobal: z.boolean().default(false),
});

export type FormValues = z.infer<typeof formSchema>;
