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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { SERIALIZED_ITEM_EVENT_TYPE_LABELS } from '@/lib/serialized-asset-constants';
import type { SerialItemEventDialogProps } from './SerialItemEventDialog.types';

const EVENT_OPTIONS_BY_TYPE: Record<string, string[]> = {
  TIRE: ['ALTA', 'REVISION', 'ROTACION', 'BAJA'],
  EXTINGUISHER: ['ALTA', 'INSPECCION', 'RECARGA', 'BAJA'],
  OTHER: ['ALTA', 'BAJA'],
};

export function SerialItemEventDialog({
  itemId,
  itemSerialNumber,
  itemType,
  currentStatus,
  open,
  onOpenChange,
  onSuccess,
}: SerialItemEventDialogProps) {
  const { toast } = useToast();
  const [eventType, setEventType] = useState('');
  const [vehicleKm, setVehicleKm] = useState('');
  const [notes, setNotes] = useState('');
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isRetired = currentStatus === 'RETIRED';
  const options =
    EVENT_OPTIONS_BY_TYPE[itemType] ?? EVENT_OPTIONS_BY_TYPE['OTHER'];

  function reset() {
    setEventType('');
    setVehicleKm('');
    setNotes('');
    setSpecs({});
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleSubmit() {
    if (!eventType) return;
    setSubmitting(true);
    try {
      const parsedSpecs: Record<string, unknown> = {};
      if (specs.treadDepthMm)
        parsedSpecs.treadDepthMm = Number(specs.treadDepthMm);
      if (specs.usefulLifePct)
        parsedSpecs.usefulLifePct = Number(specs.usefulLifePct);
      if (specs.pressure) parsedSpecs.pressure = Number(specs.pressure);
      if (specs.nextInspectionDue)
        parsedSpecs.nextInspectionDue = specs.nextInspectionDue;
      if (specs.rechargedBy) parsedSpecs.rechargedBy = specs.rechargedBy;

      const res = await fetch(`/api/serialized-items/${itemId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          performedAt: new Date().toISOString(),
          vehicleKm: vehicleKm ? Number(vehicleKm) : undefined,
          specs: Object.keys(parsedSpecs).length > 0 ? parsedSpecs : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Error al registrar evento');
      }

      toast({ title: 'Evento registrado' });
      reset();
      onOpenChange(false);
      onSuccess();
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar evento — {itemSerialNumber}</DialogTitle>
        </DialogHeader>

        {isRetired ? (
          <p className="text-sm text-muted-foreground">
            Este activo ya está dado de baja. No se pueden registrar nuevos
            eventos.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Tipo de evento</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {SERIALIZED_ITEM_EVENT_TYPE_LABELS[opt] ?? opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eventType === 'REVISION' && (
              <>
                <div className="space-y-1">
                  <Label>Profundidad de surco (mm)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="ej. 4.5"
                    value={specs.treadDepthMm ?? ''}
                    onChange={e =>
                      setSpecs(p => ({ ...p, treadDepthMm: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Vida útil (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="ej. 70"
                    value={specs.usefulLifePct ?? ''}
                    onChange={e =>
                      setSpecs(p => ({ ...p, usefulLifePct: e.target.value }))
                    }
                  />
                </div>
              </>
            )}

            {eventType === 'INSPECCION' && (
              <>
                <div className="space-y-1">
                  <Label>Presión</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="ej. 12.5"
                    value={specs.pressure ?? ''}
                    onChange={e =>
                      setSpecs(p => ({ ...p, pressure: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Próxima inspección</Label>
                  <Input
                    type="date"
                    value={specs.nextInspectionDue ?? ''}
                    onChange={e =>
                      setSpecs(p => ({
                        ...p,
                        nextInspectionDue: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            {eventType === 'RECARGA' && (
              <>
                <div className="space-y-1">
                  <Label>Presión</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="ej. 12.5"
                    value={specs.pressure ?? ''}
                    onChange={e =>
                      setSpecs(p => ({ ...p, pressure: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Recargado por</Label>
                  <Input
                    placeholder="Nombre o empresa"
                    value={specs.rechargedBy ?? ''}
                    onChange={e =>
                      setSpecs(p => ({ ...p, rechargedBy: e.target.value }))
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label>Kilómetros del vehículo (opcional)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="ej. 85000"
                value={vehicleKm}
                onChange={e => setVehicleKm(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Observaciones..."
                rows={3}
                maxLength={500}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!eventType || submitting}
              >
                {submitting ? 'Guardando...' : 'Guardar evento'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
