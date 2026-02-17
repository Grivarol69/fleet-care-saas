import { MantTemplatesList } from '../mant-template/components/MantTemplatesList';

export const dynamic = 'force-dynamic';

export default function MaintenancePackagesPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
        <strong>Gestión de Paquetes:</strong> Selecciona una plantilla (Modelo
        de Vehículo) para ver y crear sus paquetes de mantenimiento (Preventivos
        o Correctivos).
      </div>
      <MantTemplatesList />
    </div>
  );
}
