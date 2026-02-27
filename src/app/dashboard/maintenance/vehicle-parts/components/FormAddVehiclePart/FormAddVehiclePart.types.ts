import { VehiclePartEntry } from '../VehiclePartsList/VehiclePartsList.types';

export type SelectOption = {
  id: string;
  name: string;
};

export type MasterPartOption = {
  id: string;
  code: string;
  description: string;
};

export type MantItemOption = {
  id: string;
  name: string;
  type: string;
};

export type LineOption = {
  id: string;
  name: string;
  brandId: string;
};

export interface FormAddVehiclePartProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAdd: (entry: VehiclePartEntry) => void;
  brands: SelectOption[];
  lines: LineOption[];
  mantItems: MantItemOption[];
  masterParts: MasterPartOption[];
  isSuperAdmin: boolean;
}
