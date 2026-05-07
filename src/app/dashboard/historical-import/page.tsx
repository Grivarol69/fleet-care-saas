'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ManualInvoiceForm } from '@/components/historical-import/ManualInvoiceForm';
import { UploadStep } from '@/components/historical-import/UploadStep';
import { PreviewStep } from '@/components/historical-import/PreviewStep';
import { ConfirmStep } from '@/components/historical-import/ConfirmStep';
import { HistoricalInvoiceList } from '@/components/historical-invoices/HistoricalInvoiceList';
import { HistoricalInvoiceFilters } from '@/components/historical-invoices/HistoricalInvoiceFilters';
import type {
  ColumnMap,
  ParsedRow,
  RawRow,
  VehicleLookup,
} from '@/components/historical-import/lib/csvParser';
import type { HistoricalImportResponse } from '@/lib/validations/historical-import';
import type { HistoricalInvoiceDTO } from '@/components/historical-invoices/HistoricalInvoiceList/HistoricalInvoiceList.types';
import type { HistoricalInvoiceFilterValue } from '@/components/historical-invoices/HistoricalInvoiceFilters/HistoricalInvoiceFilters.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

const initialWizardState: WizardState = {
  step: 1,
  file: null,
  rawRows: [],
  columnMap: null,
  vehicleLookup: null,
  parsedRows: [],
  importResult: null,
};

type Filters = HistoricalInvoiceFilterValue & {
  limit: number;
  offset: number;
};

const initialFilters: Filters = {
  vehicleId: null,
  dateFrom: null,
  dateTo: null,
  limit: 50,
  offset: 0,
};

// Discriminated union for fetch state (per project rules — no extends Error)
type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; rows: HistoricalInvoiceDTO[]; total: number }
  | { kind: 'error'; message: string };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HistoricalImportPage() {
  const router = useRouter();

  // Auth gate (defense-in-depth — same pattern as before)
  const [authChecked, setAuthChecked] = useState(false);

  // Invoice list state
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [fetchState, setFetchState] = useState<FetchState>({ kind: 'idle' });
  const [refreshKey, setRefreshKey] = useState(0);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);

  // CSV wizard state
  const [wizardState, setWizardState] =
    useState<WizardState>(initialWizardState);

  // ---------------------------------------------------------------------------
  // Auth check
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Fetch invoices
  // ---------------------------------------------------------------------------

  // Re-fetch when auth is done, filters change, or refreshKey bumps
  useEffect(() => {
    if (!authChecked) return;

    const params = new URLSearchParams();
    params.set('limit', String(filters.limit));
    params.set('offset', String(filters.offset));
    if (filters.vehicleId) params.set('vehicleId', filters.vehicleId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchState({ kind: 'loading' });

    fetch(`/api/historical-invoices?${params.toString()}`)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setFetchState({
            kind: 'error',
            message:
              (body as { error?: string }).error ?? 'Error al cargar facturas',
          });
          return;
        }
        const data = (await res.json()) as {
          rows: HistoricalInvoiceDTO[];
          pagination: { total: number };
        };
        setFetchState({
          kind: 'ok',
          rows: data.rows,
          total: data.pagination.total,
        });
      })
      .catch(() => {
        setFetchState({
          kind: 'error',
          message: 'Error de conexión al cargar facturas',
        });
      });
  }, [authChecked, filters, refreshKey]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleFiltersChange(next: HistoricalInvoiceFilterValue) {
    setFilters(prev => ({ ...prev, ...next, offset: 0 }));
  }

  function handleFiltersClear() {
    setFilters(initialFilters);
  }

  function handlePageChange(nextOffset: number) {
    setFilters(prev => ({ ...prev, offset: nextOffset }));
  }

  function handleManualSuccess() {
    setSheetOpen(false);
    setRefreshKey(k => k + 1);
  }

  // CSV wizard handlers
  function handleParsed(data: {
    file: File;
    rawRows: RawRow[];
    columnMap: ColumnMap;
    parsedRows: ParsedRow[];
    vehicleLookup: VehicleLookup;
  }) {
    setWizardState(prev => ({
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
    setWizardState(prev => ({ ...prev, step: 3, importResult: result }));
  }

  function handleBack() {
    setWizardState(prev => ({ ...prev, step: 1 }));
  }

  function handleRestart() {
    setWizardState(initialWizardState);
  }

  // ---------------------------------------------------------------------------
  // Auth loading gate
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Verificando permisos...
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const STEP_LABELS: Record<Step, string> = {
    1: 'Cargar CSV',
    2: 'Vista previa',
    3: 'Resultado',
  };

  const step = wizardState.step;

  const listRows = fetchState.kind === 'ok' ? fetchState.rows : [];
  const listTotal = fetchState.kind === 'ok' ? fetchState.total : 0;
  const isLoading = fetchState.kind === 'loading';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">Listado</TabsTrigger>
          <TabsTrigger value="csv">Importación CSV</TabsTrigger>
        </TabsList>

        {/* ── Listado tab ── */}
        <TabsContent value="list" className="mt-6 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Facturas Históricas</h1>
            <Button onClick={() => setSheetOpen(true)}>Nueva Factura</Button>
          </div>

          {/* Filters */}
          <HistoricalInvoiceFilters
            value={{
              vehicleId: filters.vehicleId,
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
            }}
            onChange={handleFiltersChange}
            onClear={handleFiltersClear}
          />

          {/* Error state */}
          {fetchState.kind === 'error' && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {fetchState.message}
            </div>
          )}

          {/* List */}
          <HistoricalInvoiceList
            rows={listRows}
            isLoading={isLoading}
            total={listTotal}
            limit={filters.limit}
            offset={filters.offset}
            onPageChange={handlePageChange}
          />
        </TabsContent>

        {/* ── CSV tab (unchanged wizard) ── */}
        <TabsContent value="csv" className="mt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Paso {step} de 3 — {STEP_LABELS[step]}
          </p>

          {step === 1 && <UploadStep onParsed={handleParsed} />}

          {step === 2 && wizardState.vehicleLookup && (
            <PreviewStep
              parsedRows={wizardState.parsedRows}
              vehicleLookup={wizardState.vehicleLookup}
              onConfirmed={handleConfirmed}
              onBack={handleBack}
            />
          )}

          {step === 3 && wizardState.importResult && (
            <ConfirmStep
              result={wizardState.importResult}
              onRestart={handleRestart}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* ── Nueva Factura Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="sm:max-w-3xl w-full overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Nueva Factura Histórica</SheetTitle>
            <SheetDescription>
              Registrá una factura histórica de forma manual.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ManualInvoiceForm onSuccess={handleManualSuccess} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
