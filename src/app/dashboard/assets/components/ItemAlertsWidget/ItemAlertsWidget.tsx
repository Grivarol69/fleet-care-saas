'use client';

import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ItemAlertsWidgetProps } from './ItemAlertsWidget.types';

const ALERT_TYPE_LABELS: Record<string, string> = {
  LOW_TREAD: 'Banda desgastada',
  LOW_USEFUL_LIFE: 'Vida útil baja',
  INSPECTION_DUE: 'Inspección próxima',
  RECHARGE_DUE: 'Recarga próxima',
};

const TYPE_LABELS: Record<string, string> = {
  TIRE: 'Neumático',
  EXTINGUISHER: 'Extintor',
  OTHER: 'Otro',
};

export function ItemAlertsWidget({ alerts, onResolve }: ItemAlertsWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Alertas de Activos
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-1">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <p className="text-sm text-muted-foreground">
              No hay alertas activas
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map(alert => (
              <li
                key={alert.id}
                className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-red-800">
                    {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}
                  </p>
                  <p className="text-xs text-red-700">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TYPE_LABELS[alert.serializedItem.type] ??
                      alert.serializedItem.type}{' '}
                    <span className="font-mono">
                      {alert.serializedItem.serialNumber}
                    </span>
                    {alert.vehicle && ` · ${alert.vehicle.licensePlate}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-red-600 hover:text-red-800"
                  onClick={() => onResolve(alert.id)}
                  title="Resolver alerta"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
