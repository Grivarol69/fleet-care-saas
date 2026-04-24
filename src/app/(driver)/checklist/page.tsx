'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  saveChecklistDraft,
  type ChecklistItemDraft,
} from '../_lib/checklist-db';

type TemplateItem = {
  id?: string;
  category: string;
  label: string;
  isRequired: boolean;
  order: number;
};

type TemplateResponse = {
  template: { id: string; name: string; items: TemplateItem[] } | null;
  source: 'tenant_exact' | 'tenant_type' | 'global' | 'default';
  items?: TemplateItem[];
};

type DriverInfo = {
  vehicleId: string;
  licensePlate: string;
  brandName: string | null;
  lineName: string | null;
  driverId: string;
};

function groupByCategory(items: TemplateItem[]) {
  const groups: Record<string, number> = {};
  for (const item of items) {
    groups[item.category] = (groups[item.category] ?? 0) + 1;
  }
  return groups;
}

const CATEGORY_LABELS: Record<string, string> = {
  lights: 'Luces',
  brakes: 'Frenos',
  tires: 'Neumáticos',
  leaks: 'Fugas',
  seatbelt: 'Cinturón',
  extinguisher: 'Extintor',
  documents: 'Documentos',
  wipers: 'Limpiaparabrisas',
  mirrors: 'Espejos',
  cargo: 'Carga',
};

export default function ChecklistEntryScreen() {
  const router = useRouter();
  const [fromGate, setFromGate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [info, setInfo] = useState<DriverInfo | null>(null);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [odometer, setOdometer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFromGate(params.get('from') === 'gate');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch('/api/driver/me');
        if (!meRes.ok)
          throw new Error('No se pudo obtener datos del conductor');
        const me = await meRes.json();
        if (!me.vehicle) throw new Error('Sin vehículo asignado');

        setInfo({
          vehicleId: me.vehicle.id,
          licensePlate: me.vehicle.licensePlate,
          brandName: me.vehicle.brandName,
          lineName: me.vehicle.lineName,
          driverId: me.driver.id,
        });

        const tplRes = await fetch(
          `/api/hseq/checklists/template?vehicleId=${me.vehicle.id}`
        );

        const DEFAULT_ITEMS: TemplateItem[] = [
          {
            category: 'lights',
            label: 'Luces (delanteras, traseras, emergencia)',
            isRequired: true,
            order: 1,
          },
          {
            category: 'brakes',
            label: 'Frenos (pedal y freno de mano)',
            isRequired: true,
            order: 2,
          },
          {
            category: 'tires',
            label: 'Neumáticos (presión y desgaste visible)',
            isRequired: true,
            order: 3,
          },
          {
            category: 'leaks',
            label: 'Fugas (aceite, combustible)',
            isRequired: true,
            order: 4,
          },
          {
            category: 'seatbelt',
            label: 'Cinturón de seguridad',
            isRequired: true,
            order: 5,
          },
          {
            category: 'extinguisher',
            label: 'Extintor (cargado y accesible)',
            isRequired: true,
            order: 6,
          },
        ];

        let resolvedItems: TemplateItem[];
        let resolvedTemplateId: string | null = null;
        if (!tplRes.ok) {
          resolvedItems = DEFAULT_ITEMS;
        } else {
          const tplData: TemplateResponse = await tplRes.json();
          resolvedItems = tplData.template
            ? tplData.template.items
            : (tplData.items ?? DEFAULT_ITEMS);
          resolvedTemplateId = tplData.template?.id ?? null;
        }

        const sorted = [...resolvedItems].sort((a, b) => a.order - b.order);
        setItems(sorted);
        setTemplateId(resolvedTemplateId);
      } catch (e: any) {
        setError(e.message ?? 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleStart = () => {
    if (!info || items.length === 0) return;
    const km = parseInt(odometer, 10);
    if (!odometer || isNaN(km) || km < 0) {
      setError('Ingresá el odómetro actual');
      return;
    }

    startTransition(async () => {
      const draftId = crypto.randomUUID();
      const draftItems: ChecklistItemDraft[] = items.map(item => ({
        category: item.category,
        label: item.label,
        status: null,
        notes: '',
        order: item.order,
      }));

      await saveChecklistDraft({
        id: draftId,
        tenantId: '',
        vehicleId: info.vehicleId,
        driverId: info.driverId,
        odometer: km,
        items: draftItems,
        templateId,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      });

      router.push(`/checklist/0?draft=${draftId}`);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const categoryGroups = groupByCategory(items);
  const categoryKeys = Object.keys(categoryGroups).slice(0, 3);

  return (
    <div>
      <header
        className="px-4 py-4 flex items-center gap-3"
        style={{ backgroundColor: '#1E3A5F', color: '#F8FAFC' }}
      >
        <button
          onClick={() => router.push('/home')}
          className="text-slate-300 hover:text-white"
        >
          ← Inicio
        </button>
        <span className="font-semibold flex-1 text-center">
          Checklist Pre-op
        </span>
      </header>

      <div className="px-4 py-5 space-y-5">
        {fromGate && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-amber-600 font-bold text-sm">⚠</span>
            <p className="text-sm text-amber-700 font-medium">
              Completá el preoperatorio para continuar usando la app. Tiempo
              estimado: 2-3 min.
            </p>
          </div>
        )}

        {error && !info ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
            <p className="text-red-700 font-bold text-lg">
              {error === 'Sin vehículo asignado'
                ? 'No tienes un vehículo asignado'
                : error}
            </p>
            <p className="text-red-600 text-sm mb-4">
              {error === 'Sin vehículo asignado'
                ? 'Para realizar el checklist necesitas tener un turno activo con un vehículo. Por favor, haz check-in primero.'
                : 'Ocurrió un error al cargar la información. Intenta nuevamente.'}
            </p>
            <button
              onClick={() => router.push('/home')}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold shadow-sm w-full active:scale-95 transition-transform"
            >
              Ir al Inicio
            </button>
          </div>
        ) : (
          <>
            {info && (
              <div>
                <p className="text-xl font-bold font-mono tracking-wider text-slate-900">
                  {info.licensePlate}
                </p>
                {[info.brandName, info.lineName].filter(Boolean).join(' ') && (
                  <p className="text-sm text-slate-500">
                    {[info.brandName, info.lineName].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
            )}

            {/* Odometer input */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Odómetro actual <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej: 142830"
                  value={odometer}
                  onChange={e => {
                    setOdometer(e.target.value);
                    setError(null);
                  }}
                  className={`flex-1 h-12 px-3 rounded-lg border-2 text-slate-900 font-mono text-lg outline-none transition-colors ${
                    error
                      ? 'border-red-500'
                      : 'border-slate-200 focus:border-primary'
                  }`}
                />
                <span className="text-slate-500 font-medium">km</span>
              </div>
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            {/* Preview */}
            {items.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-slate-800">
                    {items.length} ítems a inspeccionar
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Tiempo estimado: 2-3 minutos
                </p>
                <div className="flex flex-wrap gap-2">
                  {categoryKeys.map(cat => (
                    <span
                      key={cat}
                      className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-full"
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                  ))}
                  {Object.keys(categoryGroups).length > 3 && (
                    <span className="bg-slate-100 text-slate-400 text-xs font-medium px-2 py-1 rounded-full">
                      +{Object.keys(categoryGroups).length - 3} más
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={isPending || !info || items.length === 0}
              className="w-full h-14 bg-primary text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-transform"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Comenzar inspección
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
