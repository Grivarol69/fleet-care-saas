'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  SERIALIZED_ITEM_STATUS_LABELS,
  TIRE_POSITION_LABELS,
} from '@/lib/serialized-asset-constants';
import type { SerializedItemTableProps } from './SerializedItemTable.types';

const TYPE_LABELS: Record<string, string> = {
  TIRE: 'Neumático',
  EXTINGUISHER: 'Extintor',
  OTHER: 'Otro',
};

const STATUS_CLASSES: Record<string, string> = {
  IN_STOCK: 'bg-gray-100 text-gray-700 border-gray-200',
  INSTALLED: 'bg-blue-100 text-blue-700 border-blue-200',
  RETIRED: 'bg-red-100 text-red-700 border-red-200',
};

export function SerializedItemTable({
  items,
  isLoading,
  onRowClick,
}: SerializedItemTableProps) {
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

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No hay activos registrados.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>N/S</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Vehículo / Posición</TableHead>
          <TableHead>Km acum.</TableHead>
          <TableHead>Alertas</TableHead>
          <TableHead>Origen compra</TableHead>
          <TableHead>Recepción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => {
          const posLabel = item.currentAssignment?.position
            ? (TIRE_POSITION_LABELS[item.currentAssignment.position] ??
              item.currentAssignment.position)
            : null;

          return (
            <TableRow
              key={item.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(item)}
            >
              <TableCell className="font-mono text-sm">
                {item.serialNumber}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {TYPE_LABELS[item.type] ?? item.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={STATUS_CLASSES[item.status] ?? ''}
                >
                  {SERIALIZED_ITEM_STATUS_LABELS[item.status] ?? item.status}
                </Badge>
              </TableCell>
              <TableCell>
                {item.currentAssignment ? (
                  <span className="text-sm">
                    {item.currentAssignment.vehicleLicensePlate}
                    {posLabel && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {posLabel}
                      </span>
                    )}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="text-sm">
                {item.accumulatedKm !== null
                  ? `${item.accumulatedKm.toLocaleString()} km`
                  : '—'}
              </TableCell>
              <TableCell>
                {item.activeAlertCount > 0 ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {item.activeAlertCount}
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                {item.invoiceItem?.description ?? '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(item.receivedAt), 'dd/MM/yyyy', {
                  locale: es,
                })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
