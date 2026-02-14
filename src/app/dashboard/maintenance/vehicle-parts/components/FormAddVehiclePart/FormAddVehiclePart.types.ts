import { VehiclePartEntry } from '../VehiclePartsList/VehiclePartsList.types';

export type SelectOption = {
  id: number;
  name: string;
};

export type MasterPartOption = {
  id: string;
  code: string;
  description: string;
};

export type MantItemOption = {
  id: number;
  name: string;
  type: string;
};

export type LineOption = {
  id: number;
  name: string;
  brandId: number;
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
