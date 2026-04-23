'use client';

import { useState } from 'react';
import { CheckCircle2, AlertOctagon, Eye, ChevronRight, X } from 'lucide-react';

type ChecklistItem = {
  status: 'OK' | 'OBSERVATION' | 'CRITICAL';
  category: string;
  label: string;
  notes: string | null;
};

type ChecklistEntry = {
  id: string;
  status: 'OK' | 'OBSERVATION' | 'CRITICAL';
  odometer: number;
  createdAt: string;
  vehicle: { licensePlate: string };
  items: ChecklistItem[];
};

const STATUS_CONFIG = {
  OK: {
    dot: 'bg-green-500',
    border: 'border-l-green-500',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
  },
  OBSERVATION: {
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
    icon: Eye,
    iconColor: 'text-amber-600',
  },
  CRITICAL: {
    dot: 'bg-red-500',
    border: 'border-l-red-500',
    icon: AlertOctagon,
    iconColor: 'text-red-600',
  },
};

function groupByMonth(items: ChecklistEntry[]) {
  const groups: Record<string, ChecklistEntry[]> = {};
  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = d.toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function statusSummary(entry: ChecklistEntry) {
  const crit = entry.items.filter(i => i.status === 'CRITICAL').length;
  const obs = entry.items.filter(i => i.status === 'OBSERVATION').length;
  if (crit > 0) return `${crit} crítico${crit > 1 ? 's' : ''}`;
  if (obs > 0) return `${obs} observación${obs > 1 ? 'es' : ''}`;
  return 'Todo OK';
}

function ChecklistDetailSheet({
  entry,
  onClose,
}: {
  entry: ChecklistEntry;
  onClose: () => void;
}) {
  const nonOk = entry.items.filter(i => i.status !== 'OK');
  const okItems = entry.items.filter(i => i.status === 'OK');

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-4 py-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-800">
              {entry.vehicle.licensePlate}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(entry.createdAt).toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}{' '}
              ·{' '}
              {new Date(entry.createdAt).toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <p className="text-sm text-slate-500">
            Odómetro:{' '}
            <span className="font-semibold text-slate-800">
              {entry.odometer.toLocaleString('es-CO')} km
            </span>
          </p>

          {nonOk.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Observaciones / Críticos
              </p>
              <div className="space-y-2">
                {nonOk.map((item, i) => {
                  const cfg = STATUS_CONFIG[item.status];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={i}
                      className="bg-slate-50 rounded-lg p-3 flex items-start gap-2"
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.iconColor}`}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {item.label}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              OK ({okItems.length})
            </p>
            <div className="space-y-1">
              {okItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HistoryList({ checklists }: { checklists: ChecklistEntry[] }) {
  const [selected, setSelected] = useState<ChecklistEntry | null>(null);

  if (checklists.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-slate-400">No hay checklists registrados aún.</p>
      </div>
    );
  }

  const groups = groupByMonth(checklists);

  return (
    <div className="px-4 py-4 space-y-6">
      {Object.entries(groups).map(([month, items]) => (
        <div key={month}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            {month}
          </p>
          <div className="space-y-2">
            {items.map(entry => {
              const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.OK;
              const d = new Date(entry.createdAt);
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className={`w-full bg-white rounded-xl p-4 flex items-start gap-3 border-l-4 text-left active:bg-slate-50 ${cfg.border}`}
                  style={{ minHeight: 72 }}
                >
                  <span
                    className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${cfg.dot}`}
                  />

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">
                        {d.toLocaleDateString('es-CO', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                      <span className="text-xs text-slate-400">
                        {d.toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {entry.vehicle.licensePlate} ·{' '}
                      {entry.odometer.toLocaleString('es-CO')} km
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {entry.items.length} ítems · {statusSummary(entry)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 self-center" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected && (
        <ChecklistDetailSheet
          entry={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
