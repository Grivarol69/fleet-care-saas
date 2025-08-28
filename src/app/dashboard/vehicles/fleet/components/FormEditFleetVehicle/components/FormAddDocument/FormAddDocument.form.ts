import { z } from "zod";

export const formSchema = z.object({
    vehiclePlate: z.string().min(1, "La placa del vehículo es requerida"),
    type: z.string(),
    fileName: z.string().min(1, "El número del documento es requerido"),
    fileUrl: z.string(),
    uploadDate: z.date(),
    expiryDate: z.date(),
    insurance: z.string().optional(),
});
