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
  address: z.string().optional(),
  specialty: z.string().optional(),
  nit: z.string().optional(),
  siigoIdType: z.enum(['NIT', 'CC', 'CE', 'PASAPORTE']).optional().nullable().or(z.literal('')),
  siigoPersonType: z.enum(['PERSON', 'COMPANY']).optional().nullable().or(z.literal('')),
  stateCode: z.string().optional(),
  cityCode: z.string().optional(),
  fiscalResponsibilities: z.array(z.string()).optional(),
  vatResponsible: z.boolean().default(false),
});
