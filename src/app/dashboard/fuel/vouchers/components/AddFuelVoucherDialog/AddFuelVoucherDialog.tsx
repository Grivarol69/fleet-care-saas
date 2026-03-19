'use client';

import { useState } from 'react';
import axios from 'axios';
import { Droplets } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { FuelVoucherForm } from '../FuelVoucherForm/FuelVoucherForm';
import type { FuelVoucherFormValues } from '../FuelVoucherForm/FuelVoucherForm.form';
import type { AddFuelVoucherDialogProps } from './AddFuelVoucherDialog.types';

export function AddFuelVoucherDialog({ onSuccess }: AddFuelVoucherDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: FuelVoucherFormValues) => {
    try {
      setIsSubmitting(true);

      const payload = {
        vehicleId: values.vehicleId,
        date: values.date.toISOString(),
        odometer: Number(values.odometer),
        fuelType: values.fuelType,
        liters: Number(values.liters),
        driverId: values.driverId || null,
        providerId: values.providerId || null,
        pricePerLiter:
          values.pricePerLiter != null &&
          values.pricePerLiter !== ('' as unknown as number)
            ? Number(values.pricePerLiter)
            : null,
        notes: values.notes || null,
      };

      await axios.post('/api/fuel/vouchers', payload);

      toast({
        title: 'Vale creado',
        description: 'El vale de combustible ha sido registrado correctamente.',
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('[AddFuelVoucherDialog] error:', error);

      let description = 'No se pudo registrar el vale de combustible.';
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data?.error === 'ODOMETER_TOO_LOW') {
          description =
            data.message ?? 'El odómetro es menor al último registrado.';
        } else if (data?.error) {
          description = data.error;
        }
      }

      toast({
        title: 'Error al crear vale',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Droplets className="mr-2 h-4 w-4" />
          Nuevo Vale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Vale de Combustible</DialogTitle>
        </DialogHeader>
        <FuelVoucherForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  );
}
