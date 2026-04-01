import { z } from 'zod';

export const formSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres',
  }),
  description: z.string().optional(),
  categoryId: z.string().min(1).min(1, {
    message: 'Debe seleccionar una categoría',
  }),
  type: z.enum(['PART', 'SERVICE']).default('SERVICE'),
});
