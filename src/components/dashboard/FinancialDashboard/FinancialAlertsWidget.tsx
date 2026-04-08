'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

type FinancialAlert = {
  id: number;
  type: string;
  severity: string;
  message: string;
  status: string;
  createdAt: string;
  workOrder?: { id: number; title: string };
  masterPart?: { code: string; description: string };
};

const severityColor = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
  FINANCIAL: 'bg-purple-100 text-purple-800',
};

const severityLabel: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
  FINANCIAL: 'Financiera',
};

const alertTypeLabel: Record<string, string> = {
  PRICE_DEVIATION: 'Desviación de precio',
  BUDGET_OVERRUN: 'Costo excedido',
  PREVENTIVE: 'Mantenimiento preventivo',
};

export function FinancialAlertsWidget() {
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get('/api/financial/alerts');
        setAlerts(res.data);
      } catch (error) {
        console.error('Error fetching financial alerts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  if (loading) return <div>Cargando alertas...</div>;

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-purple-600" />
            Watchdog Financiero
          </CardTitle>
          <CardDescription>
            {alerts.length} alertas requieren atención
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex"
          onClick={() => router.push('/dashboard/admin/watchdog')}
        >
          Ver todas <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p>Todo en orden. No hay alertas financieras.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        severityColor[
                          alert.severity as keyof typeof severityColor
                        ] || 'bg-gray-100'
                      }
                    >
                      {severityLabel[alert.severity] ?? alert.severity}
                    </Badge>
                    <span className="font-medium text-sm">
                      {alertTypeLabel[alert.type] ??
                        alert.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{alert.message}</p>
                  {(alert.workOrder || alert.masterPart) && (
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      {alert.workOrder && (
                        <span>Orden #{alert.workOrder.id}</span>
                      )}
                      {alert.masterPart && (
                        <span>Parte: {alert.masterPart.code}</span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (alert.workOrder?.id) {
                      router.push(
                        `/dashboard/maintenance/work-orders/${alert.workOrder.id}?tab=expenses`
                      );
                    } else {
                      router.push('/dashboard/admin/watchdog');
                    }
                  }}
                >
                  Revisar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
