export type VehiclePartEntry = {
  id: string;
  isGlobal: boolean;
  yearFrom: number | null;
  yearTo: number | null;
  quantity: string; // Decimal comes as string from API
  alternativePartNumbers: string | null;
  notes: string | null;
  mantItem: {
    id: string;
    name: string;
    type: 'ACTION' | 'PART' | 'SERVICE';
  };
  vehicleBrand: {
    id: string;
    name: string;
  };
  vehicleLine: {
    id: string;
    name: string;
  };
  masterPart: {
    id: string;
    code: string;
    description: string;
  };
};
