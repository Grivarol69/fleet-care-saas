'use client';

import { useEffect, useState, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Eye,
  AlertOctagon,
  Plus,
  X,
  ChevronLeft,
  Lightbulb,
  Disc,
  Settings,
  Droplets,
  Shield,
  FlameKindling,
  FileCheck,
  Wind,
  DoorOpen,
  Lamp,
  Cross,
  Gauge,
  ZapOff,
  ScanEye,
  Package,
  Triangle,
  Cog,
  Thermometer,
  Lock,
  Link,
  Pipette,
  Plug,
  HardHat,
  ShieldAlert,
  Volume2,
  Joystick,
  GlassWater,
  Bell,
  Radio,
  Construction,
} from 'lucide-react';
import {
  getChecklistDraft,
  saveChecklistDraft,
  type ChecklistDraft,
  type ChecklistItemDraft,
} from '../../_lib/checklist-db';

// ---- Category config ----
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  lights: Lightbulb,
  brakes: Disc,
  tires: Settings,
  leaks: Droplets,
  seatbelt: Shield,
  extinguisher: FlameKindling,
  documents: FileCheck,
  wipers: Wind,
  emergency_exits: DoorOpen,
  passenger_extinguisher: FlameKindling,
  interior_lights: Lamp,
  passenger_belts: Shield,
  first_aid: Cross,
  air_brakes: Gauge,
  lateral_lights: ZapOff,
  mirrors: ScanEye,
  cargo: Package,
  triangles: Triangle,
  differential: Cog,
  coolant: Thermometer,
  hydraulic: Pipette,
  body_lock: Lock,
  fifth_wheel: Link,
  air_lines: Wind,
  coupling: Plug,
  landing_gear: ChevronLeft,
  tires_tracks: Settings,
  chain: Link,
  helmet: HardHat,
  rops: ShieldAlert,
  reverse_alarm: Volume2,
  controls: Joystick,
  fluid_levels: GlassWater,
  siren: Bell,
  communication: Radio,
  machinery: Construction,
};

const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  brakes: { bg: 'bg-red-50', icon: 'text-red-600' },
  tires: { bg: 'bg-red-50', icon: 'text-red-600' },
  seatbelt: { bg: 'bg-red-50', icon: 'text-red-600' },
  air_brakes: { bg: 'bg-red-50', icon: 'text-red-600' },
  body_lock: { bg: 'bg-red-50', icon: 'text-red-600' },
  lights: { bg: 'bg-yellow-50', icon: 'text-yellow-600' },
  interior_lights: { bg: 'bg-yellow-50', icon: 'text-yellow-600' },
  lateral_lights: { bg: 'bg-yellow-50', icon: 'text-yellow-600' },
  leaks: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  coolant: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  hydraulic: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  fluid_levels: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  documents: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  extinguisher: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  first_aid: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  triangles: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  cargo: { bg: 'bg-slate-50', icon: 'text-slate-600' },
  fifth_wheel: { bg: 'bg-slate-50', icon: 'text-slate-600' },
  coupling: { bg: 'bg-slate-50', icon: 'text-slate-600' },
  chain: { bg: 'bg-slate-50', icon: 'text-slate-600' },
  landing_gear: { bg: 'bg-slate-50', icon: 'text-slate-600' },
  helmet: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  rops: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  controls: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  siren: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  communication: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  wipers: { bg: 'bg-teal-50', icon: 'text-teal-600' },
  mirrors: { bg: 'bg-teal-50', icon: 'text-teal-600' },
};

const CATEGORY_LABELS: Record<string, string> = {
  lights: 'Luces',
  brakes: 'Frenos',
  tires: 'Neumáticos',
  leaks: 'Fugas',
  seatbelt: 'Cinturón',
  extinguisher: 'Extintor',
  documents: 'Documentos',
  wipers: 'Limpiaparabrisas',
  emergency_exits: 'Salidas emergencia',
  passenger_extinguisher: 'Extintor pasajeros',
  interior_lights: 'Luces int.',
  passenger_belts: 'Cinturones pas.',
  first_aid: 'Botiquín',
  air_brakes: 'Frenos de aire',
  lateral_lights: 'Luces lat.',
  mirrors: 'Espejos',
  cargo: 'Carga',
  triangles: 'Triángulos',
  differential: 'Diferencial',
  coolant: 'Refrigerante',
  hydraulic: 'Hidráulico',
  body_lock: 'Traba carrocería',
  fifth_wheel: 'Quinta rueda',
  air_lines: 'Líneas aire',
  coupling: 'Acople',
  landing_gear: 'Kingpin/Patas',
  chain: 'Cadena',
  helmet: 'Casco',
  rops: 'ROPS',
  reverse_alarm: 'Alarma retroceso',
  controls: 'Controles',
  fluid_levels: 'Niveles fluidos',
  siren: 'Sirena',
  communication: 'Comunicación',
};

type ItemStatus = 'OK' | 'OBSERVATION' | 'CRITICAL' | null;

const STATUS_OPTIONS: {
  key: ItemStatus;
  label: string;
  icon: React.ElementType;
  bg: string;
  border: string;
}[] = [
  {
    key: 'OK',
    label: 'OK',
    icon: CheckCircle2,
    bg: 'bg-green-600',
    border: 'border-green-700',
  },
  {
    key: 'OBSERVATION',
    label: 'Observ.',
    icon: Eye,
    bg: 'bg-amber-600',
    border: 'border-amber-700',
  },
  {
    key: 'CRITICAL',
    label: 'Crítico',
    icon: AlertOctagon,
    bg: 'bg-red-600',
    border: 'border-red-700',
  },
];

function triggerHaptic(type: 'light' | 'medium' | 'heavy') {
  const patterns = { light: 20, medium: 40, heavy: 80 };
  try {
    navigator.vibrate?.(patterns[type]);
  } catch {}
}

function ItemContent({ params }: { params: Promise<{ index: string }> }) {
  const { index: indexStr } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft') ?? '';

  const currentIndex = parseInt(indexStr, 10);

  const [draft, setDraft] = useState<ChecklistDraft | null>(null);
  const [currentItem, setCurrentItem] = useState<ChecklistItemDraft | null>(
    null
  );
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ItemStatus>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [criticalPulse, setCriticalPulse] = useState(false);

  useEffect(() => {
    if (!draftId) return;
    getChecklistDraft(draftId).then(d => {
      if (!d) return;
      setDraft(d);
      const item = d.items[currentIndex];
      if (!item) return;
      setCurrentItem(item);
      setStatus(item.status);
      setNotes(item.notes);
      setShowNotes(
        item.notes !== '' ||
          item.status === 'OBSERVATION' ||
          item.status === 'CRITICAL'
      );
    });
  }, [draftId, currentIndex]);

  const handleSelectStatus = async (s: ItemStatus) => {
    if (!draft || !currentItem) return;
    setStatus(s);

    if (s === 'OBSERVATION' || s === 'CRITICAL') setShowNotes(true);
    if (s === 'OK') triggerHaptic('light');
    if (s === 'OBSERVATION') triggerHaptic('medium');
    if (s === 'CRITICAL') {
      triggerHaptic('heavy');
      setCriticalPulse(true);
    }

    const updatedItems = draft.items.map((item, i) =>
      i === currentIndex ? { ...item, status: s, notes } : item
    );
    const updated: ChecklistDraft = { ...draft, items: updatedItems };
    setDraft(updated);
    await saveChecklistDraft(updated);
  };

  const handleNavigate = async (direction: 'prev' | 'next') => {
    if (!draft) return;

    const updatedItems = draft.items.map((item, i) =>
      i === currentIndex ? { ...item, status, notes } : item
    );
    const updated: ChecklistDraft = { ...draft, items: updatedItems };
    await saveChecklistDraft(updated);

    if (direction === 'next') {
      if (currentIndex >= draft.items.length - 1) {
        router.push(`/checklist/summary?draft=${draftId}`);
      } else {
        router.push(`/checklist/${currentIndex + 1}?draft=${draftId}`);
      }
    } else {
      router.push(`/checklist/${currentIndex - 1}?draft=${draftId}`);
    }
  };

  if (!draft || !currentItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const total = draft.items.length;
  const progress = ((currentIndex + 1) / total) * 100;
  const category = currentItem.category;
  const Icon = CATEGORY_ICONS[category] ?? Settings;
  const iconColors = CATEGORY_COLORS[category] ?? {
    bg: 'bg-slate-100',
    icon: 'text-slate-500',
  };
  const categoryLabel = (CATEGORY_LABELS[category] ?? category).toUpperCase();
  const isLast = currentIndex === total - 1;

  return (
    <div className="flex flex-col min-h-screen bg-[#F1F5F9]">
      {/* Header */}
      <header
        className={`flex items-center justify-between px-4 py-3 ${criticalPulse ? 'drv-critical-pulse' : ''}`}
        style={{ backgroundColor: '#1E3A5F', color: '#F8FAFC' }}
        onAnimationEnd={() => setCriticalPulse(false)}
      >
        <button
          onClick={() => setShowExitConfirm(true)}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-semibold text-base">
          {currentIndex + 1} / {total}
        </span>
        <div className="w-11" />
      </header>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-200">
        <div
          className="h-full bg-primary rounded-r-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-4 py-5">
        {/* Category label */}
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center mb-4">
          {categoryLabel}
        </p>

        {/* Category icon */}
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${iconColors.bg}`}
        >
          <Icon className={`w-10 h-10 ${iconColors.icon}`} />
        </div>

        {/* Item label */}
        <h2 className="text-xl font-bold text-center text-slate-900 px-4 mb-8 line-clamp-3">
          {currentItem.label}
        </h2>

        {/* Status selector */}
        <div className="flex gap-2 status-selector">
          {STATUS_OPTIONS.map(({ key, label, icon: SIcon, bg, border }) => {
            const isSelected = status === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectStatus(key)}
                className={`flex-1 flex flex-col items-center justify-center gap-2 min-h-[88px] rounded-xl border-2 transition-all duration-150 select-none active:scale-95 ${
                  isSelected
                    ? `${bg} ${border} text-white scale-[1.02]`
                    : 'bg-slate-100 border-slate-200 text-slate-400 ' +
                      (status !== null ? 'opacity-60' : '')
                }`}
              >
                <SIcon className="w-7 h-7" strokeWidth={isSelected ? 2.5 : 2} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notes section */}
        <div className="mt-6">
          {showNotes ? (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describí la observación..."
              rows={3}
              className="w-full px-3 py-3 rounded-lg border-2 border-slate-200 focus:border-primary outline-none resize-none text-slate-900"
              style={{ fontSize: 'max(1rem, 16px)', minHeight: '80px' }}
            />
          ) : (
            <button
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-1 text-sm text-primary font-medium h-10"
            >
              <Plus className="w-4 h-4" />
              Agregar nota
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-auto pt-6">
          <button
            onClick={() => handleNavigate('prev')}
            disabled={currentIndex === 0}
            className="flex-1 h-14 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-transform"
          >
            ← Anterior
          </button>
          <button
            onClick={() => handleNavigate('next')}
            disabled={status === null}
            className="flex-1 h-14 rounded-xl bg-primary text-white font-semibold disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-transform"
          >
            {isLast ? 'Finalizar inspección' : 'Siguiente →'}
          </button>
        </div>
      </div>

      {/* Exit confirmation overlay */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <p className="text-base font-semibold text-slate-800 text-center">
              ¿Seguro que querés salir?
            </p>
            <p className="text-sm text-slate-500 text-center">
              Tu progreso no se guardará en el servidor.
            </p>
            <button
              onClick={() => router.push('/home')}
              className="w-full h-12 rounded-xl border-2 border-red-300 text-red-600 font-semibold"
            >
              Salir sin guardar
            </button>
            <button
              onClick={() => setShowExitConfirm(false)}
              className="w-full h-12 rounded-xl bg-primary text-white font-semibold"
            >
              Continuar inspección
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemScreen({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  return (
    <Suspense>
      <ItemContent params={params} />
    </Suspense>
  );
}
