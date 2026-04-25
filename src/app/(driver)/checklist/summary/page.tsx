'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertOctagon, Eye, CheckCircle2, Loader2 } from 'lucide-react';
import {
  getChecklistDraft,
  deleteChecklistDraft,
  type ChecklistDraft,
} from '../../_lib/checklist-db';

import { Suspense } from 'react';

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft') ?? '';

  const [draft, setDraft] = useState<ChecklistDraft | null>(null);
  const [generalNotes, setGeneralNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId) return;
    getChecklistDraft(draftId).then(d => {
      if (d) setDraft(d);
    });
  }, [draftId]);

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const okCount = draft.items.filter(i => i.status === 'OK').length;
  const obsCount = draft.items.filter(i => i.status === 'OBSERVATION').length;
  const critCount = draft.items.filter(i => i.status === 'CRITICAL').length;
  const nonOkItems = draft.items.filter(
    i => i.status !== 'OK' && i.status !== null
  );
  const hasCritical = critCount > 0;

  const overallStatus = hasCritical
    ? 'CRITICAL'
    : obsCount > 0
      ? 'OBSERVATION'
      : 'OK';

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      clientUuid: draft.id,
      vehicleId: draft.vehicleId,
      driverId: draft.driverId,
      odometer: draft.odometer,
      templateId: draft.templateId,
      status: overallStatus,
      notes: generalNotes || null,
      items: draft.items.map(item => ({
        category: item.category,
        label: item.label,
        status: item.status ?? 'OK',
        notes: item.notes || null,
      })),
    };

    const isOnline = navigator.onLine;

    if (!isOnline) {
      router.push(`/checklist/success?draft=${draftId}&offline=1`);
      return;
    }

    try {
      const res = await fetch('/api/hseq/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al enviar');
      }

      await deleteChecklistDraft(draftId);
      router.push(
        `/checklist/success?items=${draft.items.length}&plate=${draft.vehicleId}`
      );
    } catch (e: any) {
      setError(e.message ?? 'Error al enviar');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header
        className="px-4 py-4 flex items-center gap-3"
        style={{ backgroundColor: '#1E3A5F', color: '#F8FAFC' }}
      >
        <button
          onClick={() => router.back()}
          className="text-slate-300 hover:text-white"
        >
          ← Checklist
        </button>
        <span className="font-semibold flex-1 text-center">Resumen</span>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* Counters */}
        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-green-700">{okCount}</span>
            <span className="text-xs font-medium text-green-600">OK</span>
          </div>
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-amber-700">
              {obsCount}
            </span>
            <span className="text-xs font-medium text-amber-600">Observ.</span>
          </div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-red-700">{critCount}</span>
            <span className="text-xs font-medium text-red-600">Crítico</span>
          </div>
        </div>

        {/* Non-OK items list */}
        {nonOkItems.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Ítems con observación / crítico
            </p>
            <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
              {nonOkItems.map((item, i) => (
                <div key={i} className="p-3 flex items-start gap-3">
                  {item.status === 'CRITICAL' ? (
                    <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Eye className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
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
                  <span
                    className={`ml-auto text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                      item.status === 'CRITICAL'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.status === 'CRITICAL' ? 'Crítico' : 'Observ.'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General notes */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Notas generales (opcional)
          </label>
          <textarea
            value={generalNotes}
            onChange={e => setGeneralNotes(e.target.value)}
            placeholder="Agregar observación general..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-primary outline-none resize-none text-slate-900"
            style={{ fontSize: 'max(1rem, 16px)' }}
          />
        </div>

        {/* Consent */}
        <p className="text-xs text-slate-400 text-center">
          Al enviar confirmás que realizaste esta inspección personalmente.
        </p>

        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-3">
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={submit}
          disabled={submitting}
          className={`w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none active:scale-95 transition-transform ${
            hasCritical ? 'bg-red-600 text-white' : 'bg-primary text-white'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : hasCritical ? (
            <>
              <AlertOctagon className="w-5 h-5" />
              Enviar con ítems críticos
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Enviar checklist
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SummaryScreen() {
  return (
    <Suspense>
      <SummaryContent />
    </Suspense>
  );
}
