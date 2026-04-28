'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIRE_POSITION_LABELS } from '@/lib/serialized-asset-constants';
import type { SerializedSlotData } from '../AxleDiagram/AxleDiagram.types';

interface RotationModalProps {
  vehicleId: string;
  occupiedSlots: SerializedSlotData[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RotationModal({
  vehicleId,
  occupiedSlots,
  isOpen,
  onClose,
  onSuccess,
}: RotationModalProps) {
  const [itemAId, setItemAId] = useState<string>('');
  const [itemBId, setItemBId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!itemAId || !itemBId) {
      toast.error('Seleccione dos posiciones para rotar');
      return;
    }
    if (itemAId === itemBId) {
      toast.error('Seleccione posiciones diferentes');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/serialized-items/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, itemAId, itemBId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al rotar');
      }

      toast.success('Rotación completada exitosamente');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rotar Activos</DialogTitle>
          <DialogDescription>
            Intercambie la posición de dos activos instalados en este vehículo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Posición A</label>
            <Select value={itemAId} onValueChange={setItemAId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {occupiedSlots.map(slot => (
                  <SelectItem
                    key={slot.serializedItemId}
                    value={slot.serializedItemId}
                  >
                    {TIRE_POSITION_LABELS[slot.position] ?? slot.position} -{' '}
                    {slot.serialNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Posición B</label>
            <Select value={itemBId} onValueChange={setItemBId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {occupiedSlots.map(slot => (
                  <SelectItem
                    key={slot.serializedItemId}
                    value={slot.serializedItemId}
                  >
                    {TIRE_POSITION_LABELS[slot.position] ?? slot.position} -{' '}
                    {slot.serialNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Confirmando...' : 'Confirmar Rotación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
