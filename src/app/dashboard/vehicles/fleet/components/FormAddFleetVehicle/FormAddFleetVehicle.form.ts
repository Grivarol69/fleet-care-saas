import { z } from 'zod';

export const formSchema = z.object({
  photo: z.string(),
  licensePlate: z.string(),
  typePlate: z.string(),
  brandId: z.string().min(1),
  lineId: z.string().min(1),
  typeId: z.string().min(1),
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
