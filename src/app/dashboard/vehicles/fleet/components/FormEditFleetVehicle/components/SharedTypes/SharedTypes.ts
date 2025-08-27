import { DocumentStatus, DocumentType } from "@prisma/client";

// Tipos para la relacion Vehicles Documents
// Este tipo debe coincidir con lo que devuelve la API (/api/vehicles/documents)
export interface DocumentProps {
    id: string;
    vehicleId: number;
    type: DocumentType;
    fileName: string;
    fileUrl: string;
    expiryDate: string | null;
    status: DocumentStatus;
    uploadedAt: string;
    createdAt: string;
    updatedAt: string;
}

// Props para formularios
export interface FormAddDocumentProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    vehiclePlate: string;
    onAddDocument: (document: DocumentProps) => void;
}

export interface FormEditDocumentProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    document: DocumentProps;
    onEditDocument: (document: DocumentProps) => void;
}
