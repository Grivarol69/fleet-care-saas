import { z } from 'zod';

export const serialItemEventSchema = z.object({
  eventType: z.string().min(1, 'Requerido'),
  performedAt: z.string(),
  vehicleKm: z.number().int().min(0).optional(),
  specs: z.record(z.unknown()).optional(),
  notes: z.string().max(500).optional(),
});

export type SerialItemEventFormValues = z.infer<typeof serialItemEventSchema>;
