import { z } from 'zod';

export const editFormSchema = z.object({
  yearFrom: z.number().nullable(),
  yearTo: z.number().nullable(),
  masterPartId: z.string().min(1, 'Debe seleccionar una autoparte'),
  quantity: z.number().min(0.1, 'La cantidad debe ser mayor a 0'),
  notes: z.string().nullable(),
});

export type EditFormValues = z.infer<typeof editFormSchema>;
