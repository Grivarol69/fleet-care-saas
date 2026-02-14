export type VehiclePartEntry = {
  id: number;
  isGlobal: boolean;
  yearFrom: number | null;
  yearTo: number | null;
  quantity: string; // Decimal comes as string from API
  alternativePartNumbers: string | null;
  notes: string | null;
  mantItem: {
    id: number;
    name: string;
    type: 'ACTION' | 'PART' | 'SERVICE';
  };
  vehicleBrand: {
    id: number;
    name: string;
  };
  vehicleLine: {
    id: number;
    name: string;
  };
  masterPart: {
    id: string;
    code: string;
    description: string;
  };
};
