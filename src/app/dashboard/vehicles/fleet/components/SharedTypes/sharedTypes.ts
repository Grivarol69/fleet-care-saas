// SharedTypes/sharedTypes.ts
export interface FleetVehicle {
    id: number;
    licensePlate: string;
    typePlate: "PARTICULAR" | "PUBLICO";
    brandId: number;
    lineId: number;
    typeId: number;
    year: number;
    color: string;
    mileage: number;
    status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "SOLD";
    situation: "AVAILABLE" | "IN_USE" | "MAINTENANCE";
    photo: string | null;
    cylinder: number | null;
    bodyWork: string | null;
    engineNumber: string | null;
    chasisNumber: string | null;
    ownerCard: string | null;
    owner: "OWN" | "LEASED" | "RENTED";
    lastKilometers: number | null;
    lastRecorder: Date | null;
    createdAt: Date;
    updatedAt: Date;
    // Relaciones incluidas
    brand: {
        name: string;
    };
    line: {
        name: string;
    };
    type: {
        name: string;
    };
}

export interface FormAddFleetVehicleProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onAddFleetVehicle: (fleetVehicle: FleetVehicle) => void;
}

export interface FormEditFleetVehicleProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    fleetVehicle: FleetVehicle;
    onEditFleetVehicle: (fleetVehicle: FleetVehicle) => void;
}