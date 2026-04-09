import { z } from 'zod';

export const adjustmentSchema = z
    .object({
        type: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
        quantity: z.number().positive('La cantidad debe ser mayor a 0'),
        unitCost: z.number().positive('El costo unitario debe ser mayor a 0').optional(),
        notes: z.string().min(5, 'Mínimo 5 caracteres'),
    })
    .superRefine((data, ctx) => {
        if (data.type === 'ADJUSTMENT_IN' && !data.unitCost) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Requerido para entrada',
                path: ['unitCost'],
            });
        }
    });

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
