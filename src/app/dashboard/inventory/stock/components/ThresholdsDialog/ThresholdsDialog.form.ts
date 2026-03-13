import { z } from 'zod';

export const thresholdsSchema = z
    .object({
        minStock: z.number().min(0, 'No puede ser negativo'),
        maxStock: z.number().positive('Debe ser positivo').optional().nullable(),
        location: z.string().optional().nullable(),
    })
    .refine(
        (data) => {
            if (
                data.maxStock !== undefined &&
                data.maxStock !== null &&
                data.minStock !== undefined
            ) {
                return data.maxStock > data.minStock;
            }
            return true;
        },
        {
            message: 'maxStock debe ser mayor a minStock',
            path: ['maxStock'],
        }
    );

export type ThresholdsFormValues = z.infer<typeof thresholdsSchema>;
