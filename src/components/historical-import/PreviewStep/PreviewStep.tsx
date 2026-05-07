'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { validateRowsClient } from '../lib/csvParser';
import type { HistoricalImportResponse } from '@/lib/validations/historical-import';
import type { PreviewStepProps } from './PreviewStep.types';

export function PreviewStep({
  parsedRows,
  vehicleLookup,
  onConfirmed,
  onBack,
}: PreviewStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { valid, invalid } = useMemo(
    () => validateRowsClient(parsedRows, vehicleLookup),
    [parsedRows, vehicleLookup]
  );

  // Build a map of rowNumber → first error message for quick lookup
  const errorByRow = useMemo(() => {
    const map = new Map<number, string>();
    for (const v of invalid) {
      map.set(v.row.rowNumber, v.errors[0]?.message ?? 'Error desconocido');
    }
    return map;
  }, [invalid]);

  async function handleConfirm() {
    if (invalid.length > 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = valid.map(row => ({
        vehicleId: row.vehicleId,
        supplierName: row.supplierName,
        invoiceNumber: row.invoiceNumber,
        invoiceDate: row.invoiceDate,
        description: row.description,
        subtotal: row.subtotal,
        taxAmount: row.taxAmount,
        totalAmount: row.totalAmount,
        notes: row.notes,
      }));

      const res = await fetch('/api/historical-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(
          (data as { error?: string }).error ??
            `Error del servidor (${res.status})`
        );
        return;
      }

      const result: HistoricalImportResponse = await res.json();
      onConfirmed(result);
    } catch {
      setSubmitError('Error de red. Intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          <span className="text-green-600">{valid.length} filas válidas</span>
          {invalid.length > 0 && (
            <span className="ml-2 text-destructive">
              , {invalid.length} con errores
            </span>
          )}
        </p>
      </div>

      {submitError && (
        <div className="rounded border border-destructive p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="max-h-[420px] overflow-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>N° Factura</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedRows.map(row => {
              const errMsg = errorByRow.get(row.rowNumber);
              const hasError = !!errMsg;
              const vehicleName =
                vehicleLookup.byId.get(row.vehicleId)?.plate ??
                row.vehicleInputRaw;

              return (
                <TableRow
                  key={row.rowNumber}
                  className={hasError ? 'bg-red-50' : undefined}
                >
                  <TableCell className="text-muted-foreground">
                    {row.rowNumber}
                  </TableCell>
                  <TableCell>{vehicleName}</TableCell>
                  <TableCell>{row.supplierName}</TableCell>
                  <TableCell>{row.invoiceNumber}</TableCell>
                  <TableCell>{row.invoiceDate}</TableCell>
                  <TableCell className="text-right">
                    {isNaN(row.totalAmount)
                      ? '—'
                      : row.totalAmount.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    {hasError ? (
                      <Badge variant="destructive" title={errMsg}>
                        Error
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-green-500 text-green-700"
                      >
                        OK
                      </Badge>
                    )}
                    {hasError && (
                      <p className="mt-1 text-xs text-destructive">{errMsg}</p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Volver
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={invalid.length > 0 || submitting}
        >
          {submitting ? 'Importando...' : 'Confirmar importación'}
        </Button>
      </div>
    </div>
  );
}
