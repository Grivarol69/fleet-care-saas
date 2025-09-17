export const PROVIDER_SPECIALTIES = [
  { value: "REPUESTOS", label: "Repuestos" },
  { value: "LUBRICANTES", label: "Lubricantes" },
  { value: "NEUMATICOS", label: "Neumáticos" },
  { value: "BATERIAS", label: "Baterías" },
  { value: "FILTROS", label: "Filtros" },
  { value: "FRENOS", label: "Frenos" },
  { value: "SUSPENSION", label: "Suspensión" },
  { value: "ELECTRICO", label: "Eléctrico" },
  { value: "PINTURA", label: "Pintura" },
  { value: "CARROCERIA", label: "Carrocería" },
  { value: "SOLDADURA", label: "Soldadura" },
  { value: "SERVICIOS_GENERALES", label: "Servicios Generales" },
  { value: "GRUA", label: "Grúa" },
  { value: "SEGUROS", label: "Seguros" },
] as const;

export const TECHNICIAN_SPECIALTIES = [
  { value: "MOTOR", label: "Motor" },
  { value: "TRANSMISION", label: "Transmisión" },
  { value: "FRENOS", label: "Frenos" },
  { value: "SUSPENSION", label: "Suspensión" },
  { value: "ELECTRICO", label: "Eléctrico" },
  { value: "ELECTRONICO", label: "Electrónico" },
  { value: "AIRE_ACONDICIONADO", label: "Aire Acondicionado" },
  { value: "PINTURA", label: "Pintura" },
  { value: "CARROCERIA", label: "Carrocería" },
  { value: "SOLDADURA", label: "Soldadura" },
  { value: "GENERAL", label: "General" },
] as const;

export type ProviderSpecialty = typeof PROVIDER_SPECIALTIES[number]["value"];
export type TechnicianSpecialty = typeof TECHNICIAN_SPECIALTIES[number]["value"];