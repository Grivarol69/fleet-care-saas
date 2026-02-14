import { z } from 'zod';

export const formSchema = z.object({
  id: z.string(),
  documentTypeId: z.number(),
  fileName: z.string().min(1, 'El número es requerido'),
  fileUrl: z.string().url('La URL del archivo debe ser válida'),
  uploadDate: z.date(),
  expiryDate: z.date(),
  insurance: z.string().optional(),
  status: z.string(),
  vehiclePlate: z.string(),
});
