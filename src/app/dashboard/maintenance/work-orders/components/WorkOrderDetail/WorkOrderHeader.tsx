'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Ticket,
} from 'lucide-react';
import { InternalTicketDialog } from './InternalTicketDialog';
import type { WorkOrderSummary } from './TicketPDF';

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

type WorkOrderForHeader = {
  id: string;
  code: string | null;
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
  invoices: Array<{ id: string }>;
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
  PENDING: { label: 'Planificación', variant: 'secondary' },
  APPROVED: { label: 'Aprobada', variant: 'default' },
  COMPLETED: { label: 'Completada', variant: 'outline' },
  CLOSED: { label: 'Cerrada', variant: 'default' },
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
    workOrder.completionMileage?.toString() ||
      workOrder.vehicle.mileage.toString()
  );
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Inline description edit
  const EDITABLE_STATUSES = new Set(['PENDING', 'APPROVED']);
  const canEditDescription = EDITABLE_STATUSES.has(workOrder.status);
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

  const canDelete = !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(
    workOrder.status
  );

  // ── Transition handlers ──────────────────────────────────────────

  const handleApprove = async () => {
    setIsTransitioning(true);
    try {
      const res = await axios.patch(
        `/api/maintenance/work-orders/${workOrder.id}`,
        { status: 'APPROVED' }
      );
      const data = res.data as {
        stockWarnings?: string[];
        purchaseOrders?: string[];
        ticket?: { ticketNumber: string } | null;
      };

      for (const w of data.stockWarnings ?? []) {
        toast({ title: 'Advertencia', description: w, variant: 'destructive' });
      }
      toast({
        title: `OT aprobada. ${data.purchaseOrders?.length ?? 0} OC generadas`,
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

  const handleComplete = async () => {
    setIsTransitioning(true);
    try {
      const body: Record<string, unknown> = { status: 'COMPLETED' };
      const finalKm = closureKm
        ? parseInt(closureKm, 10)
        : workOrder.vehicle.mileage;
      body.completionMileage = finalKm;

      await axios.patch(`/api/maintenance/work-orders/${workOrder.id}`, body);
      toast({ title: 'OT marcada como completada' });
      await onUpdate({});
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'No se pudo completar la orden de trabajo.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsTransitioning(false);
      setShowMileageDialog(false);
    }
  };

  const handleClose = async () => {
    setIsTransitioning(true);
    try {
      await axios.patch(`/api/maintenance/work-orders/${workOrder.id}`, {
        status: 'CLOSED',
      });
      toast({ title: 'OT cerrada' });
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

  // ── Action buttons per status ────────────────────────────────────

  const renderActionButtons = () => {
    if (!currentUser) return null;
    const { status } = workOrder;

    if (status === 'PENDING' && isManagerOrAbove(currentUser)) {
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
        <Button
          size="sm"
          disabled={isTransitioning}
          onClick={() => setShowMileageDialog(true)}
        >
          {isTransitioning ? 'Procesando...' : 'Completar OT'}
        </Button>
      );
    }

    if (status === 'COMPLETED' && isManagerOrAbove(currentUser)) {
      const hasInvoices = workOrder.invoices.length > 0;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  disabled={isTransitioning || !hasInvoices}
                  onClick={handleClose}
                >
                  {isTransitioning ? 'Cerrando...' : 'Cerrar OT'}
                </Button>
              </span>
            </TooltipTrigger>
            {!hasInvoices && (
              <TooltipContent>
                <p>Debe vincular al menos una factura antes de cerrar la OT</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    }

    return null;
  };

  // ── Derived data ─────────────────────────────────────────────────

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
              {workOrder.code && (
                <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                  {workOrder.code}
                </span>
              )}
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
            ['APPROVED', 'COMPLETED', 'CLOSED'].includes(workOrder.status) && (
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

      {/* Notas inline edit */}
      {(workOrder.description || canEditDescription) && (
        <div className="mb-4 rounded-lg border bg-card px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">
              Notas / Observaciones
            </span>
            {canEditDescription && !isEditingDescription && (
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

      {/* Dialog: Completar OT (con km de cierre) */}
      <Dialog open={showMileageDialog} onOpenChange={setShowMileageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Orden de Trabajo</DialogTitle>
            <DialogDescription>
              Registrá el kilometraje al cierre del trabajo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
            <Button disabled={isTransitioning} onClick={handleComplete}>
              {isTransitioning ? 'Procesando...' : 'Confirmar'}
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
              La OT volverá al estado PENDING y las alertas de mantenimiento se
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
