'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import type { SerialIntakeDialogProps } from './SerialIntakeDialog.types';

interface ItemRow {
  serialNumber: string;
  treadDepthMm: string;
  usefulLifePct: string;
  error?: string;
}

function buildInitialRows(quantity: number): ItemRow[] {
  return Array.from({ length: quantity }, () => ({
    serialNumber: '',
    treadDepthMm: '8',
    usefulLifePct: '100',
  }));
}

export function SerialIntakeDialog({
  invoiceItemId,
  invoiceItemDescription,
  quantity,
  type,
  open,
  onOpenChange,
  onSuccess,
}: SerialIntakeDialogProps) {
  const { toast } = useToast();
  const [batchNumber, setBatchNumber] = useState('');
  const [rows, setRows] = useState<ItemRow[]>(() => buildInitialRows(quantity));
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);

  function reset() {
    setBatchNumber('');
    setRows(buildInitialRows(quantity));
    setDuplicates([]);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function updateRow(i: number, field: keyof ItemRow, value: string) {
    setRows(prev =>
      prev.map((r, idx) =>
        idx === i ? { ...r, [field]: value, error: undefined } : r
      )
    );
  }

  async function handleSubmit() {
    // Client-side duplicate check
    const serials = rows.map(r => r.serialNumber.trim());
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const s of serials) {
      if (s && seen.has(s)) dupes.push(s);
      if (s) seen.add(s);
    }
    if (dupes.length > 0) {
      setDuplicates(dupes);
      return;
    }
    setDuplicates([]);

    const items = rows.map(r => {
      const specs: Record<string, unknown> = {};
      if (type === 'TIRE') {
        if (r.treadDepthMm) specs.treadDepthMm = Number(r.treadDepthMm);
        if (r.usefulLifePct) specs.usefulLifePct = Number(r.usefulLifePct);
      }
      return {
        serialNumber: r.serialNumber.trim(),
        ...(Object.keys(specs).length > 0 ? { specs } : {}),
      };
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/serialized-items/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceItemId,
          type,
          batchNumber: batchNumber.trim() || undefined,
          items,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'DUPLICATE_SERIAL' && data.duplicates) {
          setDuplicates(data.duplicates);
          return;
        }
        throw new Error(data.error ?? 'Error al registrar activos');
      }

      toast({ title: `${data.created} activos registrados correctamente` });
      reset();
      onOpenChange(false);
      onSuccess(data.created);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Registrar activos — {invoiceItemDescription}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Ingresá los números de serie para las {quantity} unidades
        </p>

        <div className="space-y-1">
          <Label>Número de lote (opcional, compartido)</Label>
          <Input
            placeholder="ej. LOTE-2026-001"
            value={batchNumber}
            onChange={e => setBatchNumber(e.target.value)}
          />
        </div>

        {duplicates.length > 0 && (
          <p className="text-sm text-destructive">
            Números de serie duplicados: {duplicates.join(', ')}
          </p>
        )}

        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {rows.map((row, i) => {
            const isDupe = duplicates.includes(row.serialNumber.trim());
            return (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Unidad {i + 1}
                </p>
                <div className="space-y-1">
                  <Label className="text-xs">Número de serie *</Label>
                  <Input
                    placeholder={`ej. SN-00${i + 1}`}
                    value={row.serialNumber}
                    onChange={e => updateRow(i, 'serialNumber', e.target.value)}
                    className={isDupe ? 'border-destructive' : ''}
                  />
                </div>
                {type === 'TIRE' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Prof. inicial (mm)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={row.treadDepthMm}
                        onChange={e =>
                          updateRow(i, 'treadDepthMm', e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vida útil (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={row.usefulLifePct}
                        onChange={e =>
                          updateRow(i, 'usefulLifePct', e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : `Registrar ${quantity} activos`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
