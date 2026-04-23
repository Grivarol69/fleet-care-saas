import { Truck } from 'lucide-react';

type VehicleSituation =
  | 'AVAILABLE'
  | 'IN_USE'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE';

interface VehicleCardProps {
  licensePlate: string;
  brandName?: string | null;
  lineName?: string | null;
  lastOdometerKm?: number | null;
  situation?: VehicleSituation | null;
}

const SITUATION_CONFIG: Record<
  VehicleSituation,
  { dot: string; label: string }
> = {
  AVAILABLE: { dot: 'bg-green-500', label: 'Disponible' },
  IN_USE: { dot: 'bg-blue-500', label: 'En uso' },
  MAINTENANCE: { dot: 'bg-amber-500', label: 'En mantenimiento' },
  OUT_OF_SERVICE: { dot: 'bg-red-500', label: 'Fuera de servicio' },
};

export function VehicleCard({
  licensePlate,
  brandName,
  lineName,
  lastOdometerKm,
  situation,
}: VehicleCardProps) {
  const sit = situation ?? 'AVAILABLE';
  const { dot, label } = SITUATION_CONFIG[sit] ?? SITUATION_CONFIG.AVAILABLE;
  const modelName = [brandName, lineName].filter(Boolean).join(' ');

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 min-h-[80px]">
      <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Truck className="w-8 h-8 text-driver-header" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold font-mono tracking-wider text-slate-900">
          {licensePlate}
        </p>
        {modelName && (
          <p className="text-sm text-slate-500 mt-0.5 truncate">{modelName}</p>
        )}
        {lastOdometerKm != null && (
          <p className="text-sm text-slate-400">
            Último: {lastOdometerKm.toLocaleString('es-CO')} km
          </p>
        )}
        <p className="flex items-center gap-1 mt-1">
          <span className={`w-2 h-2 rounded-full ${dot} inline-block`} />
          <span className="text-xs text-slate-500">{label}</span>
        </p>
      </div>
    </div>
  );
}

export function VehicleCardEmpty() {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-4 min-h-[80px] border-2 border-dashed border-slate-200">
      <div className="w-14 h-14 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
        <Truck className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-sm text-slate-400">Sin vehículo asignado</p>
    </div>
  );
}
