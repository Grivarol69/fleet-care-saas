import { z } from "zod";

export const formSchema = z.object({
    name: z.string().min(2, {
        message: "El nombre debe tener al menos 2 caracteres",
    }),
    description: z.string().optional(),
    mantType: z.enum(['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'], {
        required_error: 'Debe seleccionar un tipo de mantenimiento',
    }),
    estimatedTime: z.number().min(0.1, {
        message: 'El tiempo estimado debe ser mayor a 0',
    }),
    categoryId: z.number().min(1, {
        message: 'Debe seleccionar una categoría',
    }),
});

