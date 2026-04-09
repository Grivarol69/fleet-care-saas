'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/hooks/use-toast';
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { InternalTicketDialog } from './InternalTicketDialog';
import { TicketPDF } from './TicketPDF';
import type { WorkOrderItem, WorkOrderSummary } from './TicketPDF';
import { Ticket } from 'lucide-react';

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

// Tipo mínimo necesario para el header
type WorkOrderForHeader = {
  id: string;
  title: string;
  description: string | null;
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
  workOrderItems?: Array<any>;
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
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  // Inline description edit state
  const EDITABLE_DESCRIPTION_STATUSES = new Set([
    'APPROVED',
    'IN_PROGRESS',
    'PENDING_INVOICE',
    'COMPLETED',
  ]);
  const canEditDescription = EDITABLE_DESCRIPTION_STATUSES.has(
    workOrder.status
  );
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(
    workOrder.description ?? ''
  );
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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
          description: workOrder.description ?? null,
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

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleSendToApproval = async () => {
    setIsTransitioning(true);
    try {
      await fetch(`/api/maintenance/work-orders/${workOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING_APPROVAL' }),
      });
      await onUpdate({});
      toast({ title: 'OT enviada a aprobación' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleReject = async () => {
    setIsTransitioning(true);
    try {
      await fetch(`/api/maintenance/work-orders/${workOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      await onUpdate({});
      toast({ title: 'OT rechazada' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsTransitioning(false);
      setShowRejectDialog(false);
    }
  };

  const handleStartWork = async () => {
    setIsTransitioning(true);
    try {
      await fetch(`/api/maintenance/work-orders/${workOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      await onUpdate({});
      toast({ title: 'Trabajo iniciado' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleApprove = async () => {
    setIsTransitioning(true);
    try {
      const res = await axios.patch(
        `/api/maintenance/work-orders/${workOrder.id}`,
        { status: 'APPROVED' }
      );

      const data = res.data as {
        workOrder?: unknown;
        ticket?: { id: string; ticketNumber: string } | null;
        purchaseOrders?: string[];
        stockWarnings?: string[];
      };

      if (data.stockWarnings && data.stockWarnings.length > 0) {
        for (const warning of data.stockWarnings) {
          toast({
            title: 'Advertencia',
            description: warning,
            variant: 'destructive',
          });
        }
      }

      if (data.ticket) {
        const { ticketNumber } = data.ticket;
        const activeItems = (workOrder.workOrderItems ?? []).filter(
          i => i.status !== 'CANCELLED'
        );
        const woSummary: WorkOrderSummary = {
          title: workOrder.title,
          description: workOrder.description ?? null,
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
        } catch {
          toast({
            title: 'Error al generar PDF',
            description: 'El ticket se creó pero no se pudo descargar.',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: `Aprobada. ${data.purchaseOrders?.length ?? 0} OC generadas`,
      });
      await onUpdate({});
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'No se pudo aprobar la orden de trabajo.';
      toast({
        title: 'Error al aprobar OT',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsTransitioning(false);
      setShowApproveDialog(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsSavingDescription(true);
    try {
      await fetch(`/api/maintenance/work-orders/${workOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descriptionDraft }),
      });
      setIsEditingDescription(false);
      await onUpdate({});
    } catch {
      toast({
        title: 'Error al guardar',
        description: 'No se pudo actualizar las notas.',
        variant: 'destructive',
      });
      setDescriptionDraft(workOrder.description ?? '');
      setIsEditingDescription(false);
    } finally {
      setIsSavingDescription(false);
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
          onClick={handleSendToApproval}
        >
          {isTransitioning ? 'Procesando...' : 'Enviar a Aprobación'}
        </Button>
      );
    }

    if (status === 'PENDING_APPROVAL' && isManagerOrAbove(currentUser)) {
      return (
        <>
          <Button
            size="sm"
            disabled={isTransitioning}
            onClick={() => setShowApproveDialog(true)}
          >
            Aprobar OT
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isTransitioning}
            onClick={() => setShowRejectDialog(true)}
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            Rechazar
          </Button>
        </>
      );
    }

    if (status === 'APPROVED' && canExecute(currentUser)) {
      return (
        <Button size="sm" disabled={isTransitioning} onClick={handleStartWork}>
          {isTransitioning ? 'Procesando...' : 'Iniciar Trabajo'}
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

    if (status === 'PENDING_INVOICE' && isManagerOrAbove(currentUser)) {
      return (
        <Button
          size="sm"
          disabled={isTransitioning}
          onClick={() => handleTransition('COMPLETED')}
        >
          {isTransitioning ? 'Procesando...' : 'Marcar como Completada'}
        </Button>
      );
    }

    return null;
  };

  const internalItems = (workOrder.workOrderItems ?? []).filter(
    i => i.itemSource === 'INTERNAL_STOCK' && i.status !== 'CANCELLED'
  );
  const woSummary: WorkOrderSummary = {
    title: workOrder.title,
    description: workOrder.description ?? null,
    vehicle: {
      licensePlate: workOrder.vehicle.licensePlate,
      brand: { name: workOrder.vehicle.brand.name },
      line: { name: workOrder.vehicle.line.name },
    },
    technician: workOrder.technician
      ? { name: workOrder.technician.name }
      : null,
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
          {internalItems.length > 0 &&
            ['IN_PROGRESS', 'PENDING_INVOICE', 'COMPLETED'].includes(
              workOrder.status
            ) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTicketDialog(true)}
              >
                <Ticket className="w-4 h-4 mr-2" /> Ticket de Taller
              </Button>
            )}
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

      {/* Notas / Observaciones inline edit (visible post-aprobación) */}
      {canEditDescription && (
        <div className="mb-4 rounded-lg border bg-card px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">
              Notas / Observaciones
            </span>
            {!isEditingDescription && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setDescriptionDraft(workOrder.description ?? '');
                  setIsEditingDescription(true);
                  setTimeout(() => descriptionRef.current?.focus(), 0);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {isEditingDescription ? (
            <div className="flex flex-col gap-2">
              <Textarea
                ref={descriptionRef}
                value={descriptionDraft}
                onChange={e => setDescriptionDraft(e.target.value)}
                className="min-h-[80px] resize-y text-sm"
                placeholder="Observaciones, diagnóstico inicial, condiciones del vehículo..."
                disabled={isSavingDescription}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDescriptionDraft(workOrder.description ?? '');
                    setIsEditingDescription(false);
                  }}
                  disabled={isSavingDescription}
                >
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveDescription}
                  disabled={isSavingDescription}
                >
                  {isSavingDescription ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {workOrder.description || (
                <span className="text-muted-foreground italic">
                  Sin notas registradas.
                </span>
              )}
            </p>
          )}
        </div>
      )}

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

      <InternalTicketDialog
        workOrderId={workOrder.id}
        open={showTicketDialog}
        onOpenChange={setShowTicketDialog}
        workOrder={woSummary}
        pendingItems={internalItems as any}
        onSuccess={() => onUpdate({})}
      />

      {/* Dialog: Aprobar OT */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Orden de Trabajo</DialogTitle>
            <DialogDescription>
              Se generarán las Órdenes de Compra para ítems externos y el Ticket
              de Taller si hay técnico asignado.
            </DialogDescription>
          </DialogHeader>
          {!workOrder.technician && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                La OT no tiene técnico asignado — no se generará Ticket de
                Taller.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
            >
              Cancelar
            </Button>
            <Button disabled={isTransitioning} onClick={handleApprove}>
              {isTransitioning ? 'Aprobando...' : 'Confirmar Aprobación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rechazar OT */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Orden de Trabajo</DialogTitle>
            <DialogDescription>
              La OT volverá al estado anterior y las alertas de mantenimiento se
              revertirán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isTransitioning}
              onClick={handleReject}
            >
              {isTransitioning ? 'Rechazando...' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
