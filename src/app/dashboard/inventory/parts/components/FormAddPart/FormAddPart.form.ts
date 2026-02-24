import { z } from 'zod';

export const formSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  category: z.string().min(1, 'La categoría es requerida'),
  subcategory: z.string().optional(),
  unit: z.string().min(1, 'La unidad es requerida'),
  referencePrice: z.coerce
    .number()
    .min(0, 'El precio debe ser mayor o igual a 0')
    .optional()
    .or(z.literal('')),
});

export type FormAddPartValues = z.infer<typeof formSchema>;
