'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadStep } from '@/components/historical-import/UploadStep';
import { PreviewStep } from '@/components/historical-import/PreviewStep';
import { ConfirmStep } from '@/components/historical-import/ConfirmStep';
import type {
  ColumnMap,
  ParsedRow,
  RawRow,
  VehicleLookup,
} from '@/components/historical-import/lib/csvParser';
import type { HistoricalImportResponse } from '@/lib/validations/historical-import';

type Step = 1 | 2 | 3;

type WizardState = {
  step: Step;
  file: File | null;
  rawRows: RawRow[];
  columnMap: ColumnMap | null;
  vehicleLookup: VehicleLookup | null;
  parsedRows: ParsedRow[];
  importResult: HistoricalImportResponse | null;
};

const initialState: WizardState = {
  step: 1,
  file: null,
  rawRows: [],
  columnMap: null,
  vehicleLookup: null,
  parsedRows: [],
  importResult: null,
};

export default function HistoricalImportPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [state, setState] = useState<WizardState>(initialState);

  // Defense-in-depth role check
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then((data: { role?: string }) => {
        const role = data.role;
        if (role !== 'OWNER' && role !== 'MANAGER') {
          router.replace('/dashboard');
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => {
        router.replace('/dashboard');
      });
  }, [router]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Verificando permisos...
      </div>
    );
  }

  function handleParsed(data: {
    file: File;
    rawRows: RawRow[];
    columnMap: ColumnMap;
    parsedRows: ParsedRow[];
    vehicleLookup: VehicleLookup;
  }) {
    setState(prev => ({
      ...prev,
      step: 2,
      file: data.file,
      rawRows: data.rawRows,
      columnMap: data.columnMap,
      parsedRows: data.parsedRows,
      vehicleLookup: data.vehicleLookup,
    }));
  }

  function handleConfirmed(result: HistoricalImportResponse) {
    setState(prev => ({ ...prev, step: 3, importResult: result }));
  }

  function handleBack() {
    setState(prev => ({ ...prev, step: 1 }));
  }

  function handleRestart() {
    setState(initialState);
  }

  const STEP_LABELS: Record<Step, string> = {
    1: 'Cargar CSV',
    2: 'Vista previa',
    3: 'Resultado',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          Importación Histórica de Facturas
        </h1>
        <p className="text-sm text-muted-foreground">
          Paso {state.step} de 3 — {STEP_LABELS[state.step]}
        </p>
      </div>

      {state.step === 1 && <UploadStep onParsed={handleParsed} />}

      {state.step === 2 && state.vehicleLookup && (
        <PreviewStep
          parsedRows={state.parsedRows}
          vehicleLookup={state.vehicleLookup}
          onConfirmed={handleConfirmed}
          onBack={handleBack}
        />
      )}

      {state.step === 3 && state.importResult && (
        <ConfirmStep result={state.importResult} onRestart={handleRestart} />
      )}
    </div>
  );
}
