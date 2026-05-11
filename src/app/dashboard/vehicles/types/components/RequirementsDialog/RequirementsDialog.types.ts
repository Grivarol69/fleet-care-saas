export interface RequirementsDialogProps {
  vehicleType: {
    id: string;
    name: string;
    isGlobal: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
}

export interface DocumentTypeRow {
  id: string;
  name: string;
  code: string;
  requiresExpiry: boolean;
}

export interface RequirementRow {
  id: string;
  documentTypeId: string;
  vehicleTypeId: string;
  documentType: DocumentTypeRow;
}
