import { z } from 'zod';

export const formSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  email: z
    .string()
    .email({
      message: 'Ingrese un email válido.',
    })
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  specialty: z.string().optional(),
});
