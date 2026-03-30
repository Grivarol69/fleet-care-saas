'use client';

import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getFuelTypeLabels, VOLUME_UNIT_SUFFIX } from '@/lib/fuel-constants';
import type { FuelVoucherTableProps } from './FuelVoucherTable.types';

export function FuelVoucherTable({
  vouchers,
  onDelete,
  isLoading,
  countryCode,
}: FuelVoucherTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full rounded-md bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No hay vales de combustible registrados.
      </div>
    );
  }

  const formatAmount = (val: string | number | null | undefined) => {
    if (val == null || val === '') return '—';
    const num = Number(val);
    if (isNaN(num)) return '—';
    return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>N° Vale</TableHead>
          <TableHead>Vehículo</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Combustible</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Conductor</TableHead>
          {onDelete && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {vouchers.map(v => (
          <TableRow key={v.id}>
            <TableCell className="font-mono text-sm">
              {v.voucherNumber}
            </TableCell>
            <TableCell>{v.vehicle.licensePlate}</TableCell>
            <TableCell>{formatDate(v.date)}</TableCell>
            <TableCell>
              {getFuelTypeLabels(countryCode ?? '_default')[v.fuelType] ??
                v.fuelType}
            </TableCell>
            <TableCell className="text-right">
              {Number(v.quantity).toLocaleString('es-AR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3,
              })}{' '}
              {VOLUME_UNIT_SUFFIX[v.volumeUnit]}
            </TableCell>
            <TableCell className="text-right">
              {formatAmount(v.totalAmount)}
            </TableCell>
            <TableCell>{v.driver?.name ?? '—'}</TableCell>
            {onDelete && (
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(v.id)}
                  title="Eliminar vale"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
