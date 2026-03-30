import * as z from 'zod';

export const workOrderSubTaskSchema = z.object({
  id: z.string().optional(),
  procedureId: z.string().optional().nullable(),
  temparioItemId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  standardHours: z.number().optional().nullable(),
  directHours: z.number().optional().nullable(),
  status: z
    .enum(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
    .default('PENDING'),
  notes: z.string().optional().nullable(),
});

export const workOrderItemSchema = z.object({
  id: z.string().optional(),
  mantItemId: z.string(),
  description: z.string(),
  closureType: z
    .enum([
      'PENDING',
      'EXTERNAL_INVOICE',
      'INTERNAL_TICKET',
      'NOT_APPLICABLE',
      'PURCHASE_ORDER',
    ])
    .default('PENDING'),
  itemSource: z
    .enum(['EXTERNAL', 'INTERNAL_STOCK', 'INTERNAL_PURCHASE'])
    .default('EXTERNAL'),
  providerId: z.string().optional().nullable(),
  unitPrice: z.number().min(0, 'Price must be >= 0'),
  quantity: z.number().min(1, 'Quantity must be >= 1'),
  masterPartId: z.string().optional().nullable(),
  subTasks: z.array(workOrderSubTaskSchema).optional(),
});

export const workOrderPayloadSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional().nullable(),
  mantType: z.enum(['PREVENTIVE', 'CORRECTIVE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: z
    .enum([
      'PENDING',
      'PENDING_APPROVAL',
      'APPROVED',
      'IN_PROGRESS',
      'PENDING_INVOICE',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
    ])
    .default('PENDING'),
  workType: z.enum(['EXTERNAL', 'INTERNAL', 'MIXED']).default('EXTERNAL'),
  alertIds: z.array(z.string()).optional(),
  technicianId: z.string().optional().nullable(),
  costCenterId: z.string().optional().nullable(),
  scheduledDate: z.string().or(z.date()).optional().nullable(),
  items: z.array(workOrderItemSchema).min(1, 'At least one item is required'),
});

export type WorkOrderPayload = z.infer<typeof workOrderPayloadSchema>;
export type WorkOrderItemPayload = z.infer<typeof workOrderItemSchema>;
export type WorkOrderSubTaskPayload = z.infer<typeof workOrderSubTaskSchema>;
