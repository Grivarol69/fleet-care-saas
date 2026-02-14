import { z } from 'zod';

export const formSchema = z.object({
  name: z.string().min(2, {
    message: 'La descripción al menos debe tener 2 caractéres',
  }),
});
