import { PurchaseInvoiceRow } from '../PurchasesList.types';

export interface FormEditPurchaseProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    purchase: PurchaseInvoiceRow;
    onEditPurchase: (updatedPurchase: PurchaseInvoiceRow) => void;
}
