import { z } from 'zod';

export const formEditPurchaseSchema = z.object({
    invoiceNumber: z.string().min(1, 'El número de factura es requerido'),
    invoiceDate: z.string().min(1, 'La fecha de factura es requerida'),
    supplierId: z.string().min(1, 'El proveedor es requerido'),
});
