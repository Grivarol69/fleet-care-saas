import { Invoice, InvoiceItem, MasterPart, Provider } from '@prisma/client';

export type PurchaseInvoiceItem = InvoiceItem & {
    masterPart: MasterPart;
};

export type PurchaseInvoiceRow = Invoice & {
    supplier: Provider;
    items: PurchaseInvoiceItem[];
};
