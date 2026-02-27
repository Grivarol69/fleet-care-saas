import { z } from 'zod';

export const formSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres',
  }),
  description: z.string().optional(),
  mantType: z.enum(['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'], {
    required_error: 'Debe seleccionar un tipo de mantenimiento',
  }),
  categoryId: z.string().min(1).min(1, {
    message: 'Debe seleccionar una categoría',
  }),
  type: z.enum(['ACTION', 'PART', 'SERVICE']).default('ACTION'),
});
