import { DriverListProps } from "../DriverList/DriverList.types";

export type FormAddDriverProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddDriver: (driver: DriverListProps) => void;
};