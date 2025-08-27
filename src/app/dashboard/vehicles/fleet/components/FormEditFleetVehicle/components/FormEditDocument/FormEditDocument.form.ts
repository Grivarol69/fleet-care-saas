import { z } from "zod";

export const formSchema = z.object({
    id: z.string(),
    type: z.string(),
    fileName: z.string().min(1, "El número es requerido"),
    fileUrl: z.string().url("La URL del archivo debe ser válida"),
    uploadDate: z.date({
        required_error: "A date of upload is required.",
    }),
    expiryDate: z.date({
        required_error: "A date of expiry is required.",
    }),
    insurance: z.string().optional(),
    status: z.string(),
    vehiclePlate: z.string(),
});
