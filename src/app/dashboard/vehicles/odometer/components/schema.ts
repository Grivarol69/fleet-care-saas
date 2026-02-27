import { z } from 'zod';

export const odometerFormSchema = z
  .object({
    vehicleId: z.string().min(1).min(1, 'Debe seleccionar un vehículo'),
    driverId: z.string().optional(),
    measureType: z.enum(['KILOMETERS', 'HOURS'], {
      required_error: 'Debe seleccionar el tipo de medida',
    }),
    measureValue: z.number().min(0, 'El valor debe ser mayor a 0'),
    recordedAt: z.date({
      required_error: 'La fecha es requerida',
    }),
  })
  .refine(
    data => {
      if (data.measureType === 'KILOMETERS') {
        return data.measureValue >= 0;
      }
      if (data.measureType === 'HOURS') {
        return data.measureValue >= 0;
      }
      return true;
    },
    {
      message: 'El valor debe ser válido para el tipo de medida seleccionado',
    }
  );

export type OdometerFormValues = z.infer<typeof odometerFormSchema>;
