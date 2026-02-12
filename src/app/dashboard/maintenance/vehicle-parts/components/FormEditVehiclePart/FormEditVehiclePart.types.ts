import { VehiclePartEntry } from '../VehiclePartsList/VehiclePartsList.types';
import { MasterPartOption } from '../FormAddVehiclePart/FormAddVehiclePart.types';

export interface FormEditVehiclePartProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    entry: VehiclePartEntry;
    onEdit: (updated: VehiclePartEntry) => void;
    masterParts: MasterPartOption[];
}
