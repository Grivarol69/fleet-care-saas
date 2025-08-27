import { z } from "zod";

export const formSchema = z.object({
    name: z.string().min(2, {
        message: "El nombre al menos debe tener 2 caractéres",
    }),
});
