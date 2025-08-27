import { z } from "zod";

export const formSchema = z.object({
    photo: z.string(),
    licensePlate: z.string(),
    typePlate: z.string(),
    brandId: z.number(),
    lineId: z.number(),
    typeId: z.number(),
    mileage: z.number(),
    cylinder: z.number(),
    bodyWork: z.string(),
    engineNumber: z.string(),
    chasisNumber: z.string(),
    ownerCard: z.string(),
    color: z.string(),
    owner: z.string(),
    year: z.number(),
    situation: z.string(),
    tenantId: z.string(),
});
