import { DocumentStatus } from '@prisma/client';

// Document type config from the API
export interface DocumentTypeConfigProps {
  id: number;
  code: string;
  name: string;
  description: string | null;
  requiresExpiry: boolean;
  isMandatory: boolean;
  isGlobal: boolean;
  countryCode: string;
}

// Tipos para la relacion Vehicles Documents
// Este tipo debe coincidir con lo que devuelve la API (/api/vehicles/documents)
export interface DocumentProps {
  id: string;
  vehicleId: number;
  documentTypeId: number;
  documentType: DocumentTypeConfigProps;
  fileName: string;
  fileUrl: string;
  documentNumber: string | null;
  entity: string | null;
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
