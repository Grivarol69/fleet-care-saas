import { z } from "zod";

// Mismo schema que el de agregar, pero todos los campos son opcionales para edición
export const formSchema = z.object({
  vehicleId: z.number().min(1, "Debe seleccionar un vehículo"),
  mantPlanId: z.number().min(1, "Debe seleccionar un plan de mantenimiento"),
  assignedAt: z.date({
    required_error: "La fecha de asignación es requerida",
  }),
  lastKmCheck: z.number().min(0, "El kilometraje debe ser mayor o igual a 0").optional(),
  status: z.enum(["ACTIVE", "INACTIVE"], {
    required_error: "Debe seleccionar un estado",
  }),
});