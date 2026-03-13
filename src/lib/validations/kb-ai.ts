import { z } from "zod";

export const AIKBProposalSchema = z.object({
    vehicleInfo: z.object({
        brand: z.string().describe("Marca del vehículo, ej. Toyota, Ford"),
        model: z.string().describe("Modelo del vehículo principal, ej. Hilux, F-150"),
        engine: z.string().optional().describe("Motor asociado si especifica en el manual"),
        years: z.string().optional().describe("Rango de años al que aplica el manual"),
    }),
    maintenanceItems: z.array(z.object({
        name: z.string().describe("Nombre descriptivo corto del mantenimiento, ej. 'Cambio de aceite de motor y filtro'"),
        type: z.enum(["PREVENTIVE", "CORRECTIVE", "PREDICTIVE", "EMERGENCY"]).describe("Casi siempre PREVENTIVE si viene de un manual de servicio programado"),
        intervalKm: z.number().nullable().describe("Frecuencia en kilómetros, ej. 5000. Null si solo es por tiempo"),
        intervalMonths: z.number().nullable().describe("Frecuencia en meses, ej. 6. Null si solo es por uso en Km"),
        partsRequired: z.array(z.object({
            name: z.string().describe("Nombre de la pieza, ej. 'Filtro de aceite', 'Aceite 5W30'"),
            partNumber: z.string().optional().describe("Número de parte OEM exacto si lo indica el manual, ej. '90915-YZZD1'"),
            quantity: z.number().describe("Cantidad requerida, puede ser decimal para liquidos (ej. 5.5 litros)"),
        })).describe("Lista de repuestos requeridos para esta tarea específica")
    }))
});

export type AIKBProposal = z.infer<typeof AIKBProposalSchema>;
