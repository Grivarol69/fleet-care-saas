'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startDriverShift } from '@/actions/driver';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Search,
  QrCode,
} from 'lucide-react';

type VehicleOption = {
  id: string;
  licensePlate: string;
  brand: { name: string } | null;
  line: { name: string } | null;
};

export function VehicleSelector({
  vehicles,
  preselectedId = null,
}: {
  vehicles: VehicleOption[];
  preselectedId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (preselectedId && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [preselectedId]);

  const filteredVehicles = vehicles.filter(
    v =>
      v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartShift = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await startDriverShift(selectedId);
      if (res.success) {
        router.push('/home'); // Al hacer push a home, verá su dashboard de vehículo
      } else {
        setError(res.error || 'Error al iniciar turno');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {preselectedId && vehicles.some(v => v.id === preselectedId) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <QrCode className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700 font-medium">
            Vehículo detectado por QR. Confirmá para iniciar turno.
          </p>
        </div>
      )}

      {preselectedId && !vehicles.some(v => v.id === preselectedId) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            Vehículo del QR no disponible. Seleccioná otro.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por placa o marca..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1E3A5F] shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="max-h-[50vh] overflow-y-auto p-2 space-y-2">
          {filteredVehicles.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No se encontraron vehículos.
            </div>
          ) : (
            filteredVehicles.map(v => (
              <button
                key={v.id}
                ref={v.id === preselectedId ? selectedRef : null}
                onClick={() => setSelectedId(v.id)}
                className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition-all ${
                  selectedId === v.id
                    ? 'border-[#1E3A5F] bg-blue-50/50 shadow-sm'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedId === v.id ? 'bg-[#1E3A5F]' : 'bg-gray-100'}`}
                  >
                    <Truck
                      className={`w-6 h-6 ${selectedId === v.id ? 'text-white' : 'text-gray-500'}`}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {v.licensePlate}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {v.brand?.name} {v.line?.name}
                    </p>
                  </div>
                </div>
                {selectedId === v.id && (
                  <CheckCircle2 className="w-6 h-6 text-[#1E3A5F]" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <button
        onClick={handleStartShift}
        disabled={!selectedId || loading}
        className="w-full fixed bottom-6 left-0 right-0 mx-4 md:static md:mx-0 bg-[#1E3A5F] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-[#1E3A5F]/20 hover:bg-[#152a45] transition-all disabled:opacity-50 disabled:cursor-not-allowed z-50 max-w-[calc(100%-2rem)] md:max-w-none"
      >
        {loading ? 'Iniciando turno...' : 'Tomar Vehículo'}
      </button>
    </div>
  );
}
