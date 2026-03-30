import { z } from 'zod';

export const serialIntakeSchema = z.object({
  batchNumber: z.string().optional(),
  items: z
    .array(
      z.object({
        serialNumber: z.string().min(1, 'Número de serie requerido'),
        specs: z.record(z.unknown()).optional(),
      })
    )
    .min(1),
});

export type SerialIntakeFormValues = z.infer<typeof serialIntakeSchema>;
