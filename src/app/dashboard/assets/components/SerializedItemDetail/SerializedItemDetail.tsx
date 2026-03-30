'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Car, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/hooks/use-toast';
import {
  SERIALIZED_ITEM_STATUS_LABELS,
  SERIALIZED_ITEM_EVENT_TYPE_LABELS,
  TIRE_POSITION_LABELS,
  getSerialItemColor,
} from '@/lib/serialized-asset-constants';
import { SerialItemEventDialog } from '../SerialItemEventDialog';
import type {
  SerializedItemDetailProps,
  SerializedItemDetailData,
} from './SerializedItemDetail.types';

const TYPE_LABELS: Record<string, string> = {
  TIRE: 'Neumático',
  EXTINGUISHER: 'Extintor',
  OTHER: 'Otro',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  LOW_TREAD: 'Banda desgastada',
  LOW_USEFUL_LIFE: 'Vida útil baja',
  INSPECTION_DUE: 'Inspección próxima',
  RECHARGE_DUE: 'Recarga próxima',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> =
  {
    IN_STOCK: 'secondary',
    INSTALLED: 'default',
    RETIRED: 'destructive',
  };

function formatDate(d: string) {
  return format(new Date(d), 'dd/MM/yyyy', { locale: es });
}

export function SerializedItemDetail({
  itemId,
  open,
  onOpenChange,
  onRefresh,
}: SerializedItemDetailProps) {
  const { toast } = useToast();
  const [data, setData] = useState<SerializedItemDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    if (!open || !itemId) {
      setData(null);
      return;
    }
    setIsLoading(true);
    fetch(`/api/serialized-items/${itemId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() =>
        toast({
          title: 'Error',
          description: 'No se pudo cargar el activo.',
          variant: 'destructive',
        })
      )
      .finally(() => setIsLoading(false));
  }, [open, itemId, toast]);

  async function handleUnassign(retire: boolean) {
    if (!itemId) return;
    setActioning(true);
    try {
      const res = await fetch(`/api/serialized-items/${itemId}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retire }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: retire ? 'Activo dado de baja' : 'Activo desinstalado' });
      onRefresh();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setActioning(false);
    }
  }

  const specs = data?.specs as Record<string, unknown> | null;
  const usefulLifePct = specs?.usefulLifePct as number | null | undefined;
  const treadDepthMm = specs?.treadDepthMm as number | null | undefined;
  const pressure = specs?.pressure as number | null | undefined;
  const nextInspectionDue = specs?.nextInspectionDue as
    | string
    | null
    | undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Detalle de activo</SheetTitle>
          </SheetHeader>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          )}

          {!isLoading && data && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">N/S</p>
                  <p className="font-semibold font-mono">{data.serialNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TYPE_LABELS[data.type] ?? data.type}
                    {data.batchNumber && ` · Lote: ${data.batchNumber}`}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[data.status] ?? 'secondary'}>
                  {SERIALIZED_ITEM_STATUS_LABELS[data.status] ?? data.status}
                </Badge>
              </div>

              {/* Assignment */}
              {data.currentAssignment && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold mb-2">
                      Vehículo actual
                    </p>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">
                        {data.currentAssignment.vehicleLicensePlate}
                      </span>
                      {data.currentAssignment.position && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {TIRE_POSITION_LABELS[
                              data.currentAssignment.position
                            ] ?? data.currentAssignment.position}
                          </span>
                        </>
                      )}
                      <span className="text-muted-foreground ml-auto text-xs">
                        desde {formatDate(data.currentAssignment.installedAt)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Invoice origin */}
              {data.invoiceItem && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold mb-2">
                      Origen de compra
                    </p>
                    <div className="text-sm space-y-0.5">
                      <p className="font-medium">
                        {data.invoiceItem.description}
                      </p>
                      <p className="text-muted-foreground">
                        Factura {data.invoiceItem.invoice.invoiceNumber} ·{' '}
                        {formatDate(data.invoiceItem.invoice.invoiceDate)}
                      </p>
                      <p className="text-muted-foreground">
                        $
                        {Number(data.invoiceItem.unitPrice).toLocaleString(
                          'es'
                        )}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Specs */}
              {data.type === 'TIRE' &&
                (treadDepthMm !== undefined || usefulLifePct !== undefined) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-2">
                        Estado del neumático
                      </p>
                      <div className="space-y-2">
                        {treadDepthMm !== undefined &&
                          treadDepthMm !== null && (
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Profundidad de surco
                              </p>
                              <p className="text-sm font-medium">
                                {treadDepthMm} mm
                              </p>
                            </div>
                          )}
                        {usefulLifePct !== undefined &&
                          usefulLifePct !== null && (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">
                                  Vida útil
                                </span>
                                <span className="font-medium">
                                  {usefulLifePct}%
                                </span>
                              </div>
                              <Progress
                                value={usefulLifePct}
                                className="h-2"
                                style={{
                                  ['--progress-color' as string]:
                                    getSerialItemColor({
                                      specs: { usefulLifePct },
                                    }),
                                }}
                              />
                            </div>
                          )}
                      </div>
                    </div>
                  </>
                )}

              {data.type === 'EXTINGUISHER' &&
                (pressure !== undefined || nextInspectionDue) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-2">
                        Estado del extintor
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {pressure !== undefined && pressure !== null && (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Presión
                            </p>
                            <p className="font-medium">{pressure}</p>
                          </div>
                        )}
                        {nextInspectionDue && (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Próxima inspección
                            </p>
                            <p className="font-medium">
                              {formatDate(nextInspectionDue)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

              {/* Active alerts */}
              {data.activeAlerts.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Alertas activas
                    </p>
                    <ul className="space-y-1">
                      {data.activeAlerts.map(a => (
                        <li
                          key={a.id}
                          className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm"
                        >
                          <p className="font-medium text-red-800">
                            {ALERT_TYPE_LABELS[a.alertType] ?? a.alertType}
                          </p>
                          <p className="text-xs text-red-700">{a.message}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Events */}
              <Separator />
              <div>
                <p className="text-sm font-semibold mb-3">
                  Historial de eventos
                </p>
                {data.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin eventos registrados.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {data.events.map(event => (
                      <li key={event.id} className="flex gap-3">
                        <div className="mt-0.5 shrink-0">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {(
                              SERIALIZED_ITEM_EVENT_TYPE_LABELS[
                                event.eventType
                              ] ?? event.eventType
                            ).slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {SERIALIZED_ITEM_EVENT_TYPE_LABELS[
                                event.eventType
                              ] ?? event.eventType}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(event.performedAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {event.performer.firstName}{' '}
                            {event.performer.lastName}
                          </p>
                          {event.vehicleKm && (
                            <p className="text-xs text-muted-foreground">
                              {event.vehicleKm.toLocaleString('es')} km
                            </p>
                          )}
                          {event.notes && (
                            <p className="text-xs text-muted-foreground">
                              {event.notes}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Actions */}
              {data.status !== 'RETIRED' && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setShowEventDialog(true)}>
                      Registrar evento
                    </Button>
                    {data.status === 'INSTALLED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnassign(false)}
                        disabled={actioning}
                      >
                        Desinstalar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleUnassign(true)}
                      disabled={actioning}
                    >
                      Dar de baja
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {data && (
        <SerialItemEventDialog
          itemId={data.id}
          itemSerialNumber={data.serialNumber}
          itemType={data.type}
          currentStatus={data.status}
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
          onSuccess={() => {
            setShowEventDialog(false);
            // re-fetch item data
            if (itemId) {
              fetch(`/api/serialized-items/${itemId}`)
                .then(r => r.json())
                .then(d => setData(d))
                .catch(() => {});
            }
            onRefresh();
          }}
        />
      )}
    </>
  );
}
