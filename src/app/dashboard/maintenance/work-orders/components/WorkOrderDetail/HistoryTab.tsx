'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  PlayCircle,
  FileText,
} from 'lucide-react';

type WorkOrder = {
  id: string;
  status: string;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  approvals: Array<{
    id: string;
    status: string;
    approvedBy: number | null;
    approvedAt: string | null;
    comments: string | null;
  }>;
  maintenanceAlerts: Array<{
    id: string;
    itemName: string;
    status: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
  }>;
};

type HistoryTabProps = {
  workOrder: WorkOrder;
};

type TimelineEvent = {
  id: string;
  type: 'creation' | 'start' | 'completion' | 'approval' | 'alert' | 'invoice';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
};

export function HistoryTab({ workOrder }: HistoryTabProps) {
  const timeline: TimelineEvent[] = [];

  // Creación
  timeline.push({
    id: 'creation',
    type: 'creation',
    title: 'Orden Creada',
    description:
      'La orden de trabajo fue creada desde alertas de mantenimiento',
    timestamp: workOrder.createdAt,
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-blue-500',
  });

  // Alertas relacionadas
  workOrder.maintenanceAlerts.forEach(alert => {
    timeline.push({
      id: `alert-${alert.id}`,
      type: 'alert',
      title: 'Alerta Vinculada',
      description: alert.itemName,
      timestamp: workOrder.createdAt,
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'bg-yellow-500',
    });
  });

  // Inicio
  if (workOrder.startDate) {
    timeline.push({
      id: 'start',
      type: 'start',
      title: 'Trabajo Iniciado',
      description: 'El trabajo comenzó a ejecutarse',
      timestamp: workOrder.startDate,
      icon: <PlayCircle className="h-4 w-4" />,
      color: 'bg-green-500',
    });
  }

  // Aprobaciones
  workOrder.approvals.forEach(approval => {
    if (approval.approvedAt) {
      timeline.push({
        id: `approval-${approval.id}`,
        type: 'approval',
        title:
          approval.status === 'APPROVED' ? 'Orden Aprobada' : 'Orden Rechazada',
        description: approval.comments || 'Sin comentarios',
        timestamp: approval.approvedAt,
        icon:
          approval.status === 'APPROVED' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          ),
        color: approval.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500',
      });
    }
  });

  // Facturas cargadas
  if (workOrder.invoices && workOrder.invoices.length > 0) {
    workOrder.invoices.forEach(invoice => {
      timeline.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: 'Factura Cargada',
        description: `Factura ${invoice.invoiceNumber} por $${invoice.totalAmount.toLocaleString('es-CO')}`,
        timestamp: invoice.invoiceDate,
        icon: <FileText className="h-4 w-4" />,
        color: 'bg-purple-500',
      });
    });
  }

  // Completado
  if (workOrder.endDate) {
    timeline.push({
      id: 'completion',
      type: 'completion',
      title: 'Orden Completada',
      description: 'La orden de trabajo fue completada exitosamente',
      timestamp: workOrder.endDate,
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-green-600',
    });
  }

  // Ordenar por fecha
  timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Eventos</CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No hay eventos registrados en el historial
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            {/* Eventos */}
            <div className="space-y-6">
              {timeline.map(event => (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icono */}
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${event.color} text-white`}
                  >
                    {event.icon}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{event.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {formatDistanceToNow(new Date(event.timestamp), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.timestamp).toLocaleString('es-CO', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
