import { z } from 'zod';

export const formSchema = z.object({
  id: z.string().min(1),
  photo: z.string(),
  licensePlate: z.string(),
  typePlate: z.string(),
  brandId: z.string().nullable(),
  lineId: z.string().nullable(),
  typeId: z.string().nullable(),
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
});
