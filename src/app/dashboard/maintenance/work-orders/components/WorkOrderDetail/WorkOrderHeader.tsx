'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/hooks/use-toast';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { TicketPDF } from './TicketPDF';
import type { WorkOrderItem, WorkOrderSummary } from './TicketPDF';

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

// Tipo mínimo necesario para el header
type WorkOrderForHeader = {
  id: string;
  title: string;
  status: string;
  priority: string;
  completionMileage: number | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
    mileage: number;
  };
  technician: { id: string; name: string } | null;
  workOrderItems?: Array<{
    id: string;
    description: string;
    mantItem: { name: string; type: string };
    status: string;
  }>;
};

type WorkOrderHeaderProps = {
  workOrder: WorkOrderForHeader;
  currentUser: CurrentUser | null;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
  onDelete: () => void;
};

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'secondary' | 'default' | 'outline' | 'destructive';
  }
> = {
  PENDING: { label: 'Abierta', variant: 'secondary' },
  PENDING_APPROVAL: { label: 'En Aprobación', variant: 'outline' },
  APPROVED: { label: 'Aprobada', variant: 'outline' },
  IN_PROGRESS: { label: 'En Trabajo', variant: 'default' },
  PENDING_INVOICE: { label: 'Por Cerrar', variant: 'outline' },
  COMPLETED: { label: 'Cerrada', variant: 'default' },
  REJECTED: { label: 'Rechazada', variant: 'destructive' },
  CANCELLED: { label: 'Cancelada', variant: 'outline' },
};

function isManagerOrAbove(user: CurrentUser): boolean {
  return user.isSuperAdmin || user.role === 'OWNER' || user.role === 'MANAGER';
}

function canExecute(user: CurrentUser): boolean {
  return (
    user.isSuperAdmin ||
    user.role === 'OWNER' ||
    user.role === 'MANAGER' ||
    user.role === 'TECHNICIAN'
  );
}

export function WorkOrderHeader({
  workOrder,
  currentUser,
  onUpdate,
  onDelete,
}: WorkOrderHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showMileageDialog, setShowMileageDialog] = useState(false);
  const [closureKm, setClosureKm] = useState(
    workOrder.completionMileage?.toString() ?? ''
  );

  const statusInfo = statusConfig[workOrder.status] ?? {
    label: workOrder.status,
    variant: 'outline' as const,
  };

  const canDelete =
    workOrder.status !== 'COMPLETED' && workOrder.status !== 'CANCELLED';

  const handleTransition = async (toStatus: string) => {
    setIsTransitioning(true);
    try {
      const updates: Record<string, unknown> = { status: toStatus };
      if (toStatus === 'COMPLETED' && closureKm) {
        updates.completionMileage = parseInt(closureKm, 10);
      }
      await onUpdate(updates);
    } finally {
      setIsTransitioning(false);
      setShowMileageDialog(false);
    }
  };

  const handleCloseToPendingInvoice = async () => {
    setIsTransitioning(true);
    try {
      const patchBody: Record<string, unknown> = {
        status: 'PENDING_INVOICE',
      };
      if (closureKm) {
        patchBody.completionMileage = parseInt(closureKm, 10);
      }

      const res = await axios.patch(
        `/api/maintenance/work-orders/${workOrder.id}`,
        patchBody
      );

      const data = res.data as {
        workOrder?: unknown;
        ticket?: { id: string; ticketNumber: string } | null;
        purchaseOrders?: string[];
        stockWarnings?: string[];
      };

      // Show warnings
      if (data.stockWarnings && data.stockWarnings.length > 0) {
        for (const warning of data.stockWarnings) {
          toast({
            title: 'Advertencia de stock',
            description: warning,
            variant: 'destructive',
          });
        }
      }

      // Show OC count
      if (data.purchaseOrders && data.purchaseOrders.length > 0) {
        toast({
          title: 'Órdenes de compra generadas',
          description: `Se generaron ${data.purchaseOrders.length} OC(s) para repuestos sin stock.`,
        });
      }

      // Auto-download PDF if ticket was generated
      if (data.ticket) {
        const { ticketNumber } = data.ticket;

        const activeItems = (workOrder.workOrderItems ?? []).filter(
          i => i.status !== 'CANCELLED'
        );
        const woSummary: WorkOrderSummary = {
          title: workOrder.title,
          vehicle: {
            licensePlate: workOrder.vehicle.licensePlate,
            brand: { name: workOrder.vehicle.brand.name },
            line: { name: workOrder.vehicle.line.name },
          },
          technician: workOrder.technician
            ? { name: workOrder.technician.name }
            : null,
        };
        const services: WorkOrderItem[] = activeItems.filter(
          i => i.mantItem.type !== 'PART'
        );
        const parts: WorkOrderItem[] = activeItems.filter(
          i => i.mantItem.type === 'PART'
        );

        try {
          const blob = await pdf(
            <TicketPDF
              ticketNumber={ticketNumber}
              workOrder={woSummary}
              services={services}
              parts={parts}
            />
          ).toBlob();

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${ticketNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast({
            title: 'Ticket descargado',
            description: `${ticketNumber} generado y descargado.`,
          });
        } catch {
          toast({
            title: 'Error al generar PDF',
            description: 'El ticket se creó pero no se pudo descargar el PDF.',
            variant: 'destructive',
          });
        }
      }

      // Trigger page refresh
      await onUpdate({});
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'No se pudo cerrar la orden de trabajo.';
      toast({
        title: 'Error al cerrar OT',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsTransitioning(false);
      setShowMileageDialog(false);
    }
  };

  const renderActionButtons = () => {
    if (!currentUser) return null;
    const status = workOrder.status;

    if (status === 'PENDING' && canExecute(currentUser)) {
      return (
        <Button
          size="sm"
          disabled={isTransitioning}
          onClick={() => handleTransition('IN_PROGRESS')}
        >
          {isTransitioning ? 'Procesando...' : 'Iniciar trabajo'}
        </Button>
      );
    }

    if (status === 'IN_PROGRESS' && isManagerOrAbove(currentUser)) {
      return (
        <Button
          size="sm"
          disabled={isTransitioning}
          onClick={() => setShowMileageDialog(true)}
        >
          {isTransitioning ? 'Procesando...' : 'Cerrar OT'}
        </Button>
      );
    }

    return null;
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mx-6 px-6 py-3 mb-6 flex items-center justify-between gap-4 flex-wrap">
        {/* Left: back + title + badge */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => router.push('/dashboard/maintenance/work-orders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{workOrder.title}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {workOrder.vehicle.licensePlate} · {workOrder.vehicle.brand.name}{' '}
              {workOrder.vehicle.line.name} ·{' '}
              {workOrder.technician
                ? workOrder.technician.name
                : 'Sin técnico asignado'}
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {renderActionButtons()}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Dialog para kilometraje de cierre */}
      <Dialog open={showMileageDialog} onOpenChange={setShowMileageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Orden de Trabajo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Se deducirá el stock de repuestos disponibles, se generarán
              órdenes de compra para los faltantes y se descargará el ticket de
              taller.
            </p>
            <div className="space-y-2">
              <Label>Kilometraje al cierre</Label>
              <Input
                type="number"
                value={closureKm}
                onChange={e => setClosureKm(e.target.value)}
                placeholder={workOrder.vehicle.mileage.toString()}
              />
              <p className="text-xs text-muted-foreground">
                Km actual del vehículo:{' '}
                {workOrder.vehicle.mileage.toLocaleString()} km
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMileageDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={isTransitioning}
              onClick={handleCloseToPendingInvoice}
            >
              {isTransitioning ? 'Cerrando...' : 'Confirmar cierre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
