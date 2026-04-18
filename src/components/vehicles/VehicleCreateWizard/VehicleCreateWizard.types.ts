export type WizardStep = 1 | 2 | 3;

export interface PropertyCardOCRData {
  confidence: number;
  licensePlate: string | null;
  brandName: string | null;
  lineName: string | null;
  typeName: string | null;
  year: number | null;
  color: string | null;
  engineNumber: string | null;
  chasisNumber: string | null;
  ownerCard: string | null;
  cylinder: number | null;
  fuelType: 'DIESEL' | 'GASOLINA' | 'GAS' | 'ELECTRICO' | 'HIBRIDO' | null;
  serviceType: 'PUBLICO' | 'PARTICULAR' | 'OFICIAL' | null;
}

export interface VehicleWizardState {
  step: WizardStep;
  propertyCardUrl: string | null;
  ocr: PropertyCardOCRData | null;
  createdVehicleId: string | null;
  createdLicensePlate: string | null;
}

export interface VehicleBrand {
  id: string;
  name: string;
  isGlobal: boolean;
}

export interface VehicleLine {
  id: string;
  name: string;
  brandId: string;
  isGlobal: boolean;
}

export interface VehicleType {
  id: string;
  name: string;
  isGlobal: boolean;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
}

export interface DocumentTypeConfig {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requiresExpiry: boolean;
  isMandatory: boolean;
  isGlobal: boolean;
  countryCode: string;
}
