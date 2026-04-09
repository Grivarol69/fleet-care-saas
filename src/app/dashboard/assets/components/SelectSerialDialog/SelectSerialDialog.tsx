'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/hooks/use-toast';
import { TIRE_POSITION_LABELS } from '@/lib/serialized-asset-constants';
import type { SelectSerialDialogProps } from './SelectSerialDialog.types';

interface ItemOption {
  id: string;
  serialNumber: string;
  batchNumber: string | null;
  specs: Record<string, unknown> | null;
  receivedAt: string;
}

export function SelectSerialDialog({
  vehicleId,
  vehicleLicensePlate,
  position,
  itemType,
  open,
  onOpenChange,
  onSuccess,
}: SelectSerialDialogProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<ItemOption[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelected(null);
      setError(null);
      return;
    }
    setLoading(true);
    fetch(`/api/serialized-items?status=IN_STOCK&type=${itemType}&pageSize=100`)
      .then(r => r.json())
      .then(data => setItems(data.items ?? []))
      .catch(() =>
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los activos.',
          variant: 'destructive',
        })
      )
      .finally(() => setLoading(false));
  }, [open, itemType, toast]);

  const filtered = items.filter(
    i =>
      i.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      (i.batchNumber ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/serialized-items/${selected}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          position,
          installedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al instalar');
      }
      toast({
        title: `Activo instalado en posición ${TIRE_POSITION_LABELS[position] ?? position}`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  const posLabel = TIRE_POSITION_LABELS[position] ?? position;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Instalar activo — {vehicleLicensePlate} · {posLabel}
          </DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Buscar por número de serie o lote..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-3"
        />

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Cargando...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay activos en stock.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-1">
            {filtered.map(item => {
              const specs = item.specs as Record<string, unknown> | null;
              const treadDepth = specs?.treadDepthMm as number | undefined;
              const usefulLifePct = specs?.usefulLifePct as number | undefined;
              const isSelected = selected === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setSelected(item.id === selected ? null : item.id)
                  }
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div>
                    <span className="font-medium font-mono">
                      {item.serialNumber}
                    </span>
                    {item.batchNumber && (
                      <span
                        className={`ml-2 text-xs ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                      >
                        Lote: {item.batchNumber}
                      </span>
                    )}
                    {(treadDepth !== undefined ||
                      usefulLifePct !== undefined) && (
                      <div
                        className={`text-xs mt-0.5 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                      >
                        {treadDepth !== undefined && `${treadDepth}mm`}
                        {treadDepth !== undefined &&
                          usefulLifePct !== undefined &&
                          ' · '}
                        {usefulLifePct !== undefined && `${usefulLifePct}%`}
                      </div>
                    )}
                  </div>
                  {usefulLifePct !== undefined && (
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {Math.round(usefulLifePct)}%
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || submitting}>
            {submitting ? 'Instalando...' : 'Confirmar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
