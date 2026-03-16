'use client';

import { useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Eye, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  mantType: string;
  priority: string;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  technician: {
    id: string;
    name: string;
  } | null;
  provider: {
    id: string;
    name: string;
  } | null;
  workOrderItems: Array<{
    id: string;
    description: string;
    totalCost: number;
    status: string;
  }>;
};

type WorkOrdersListProps = {
  workOrders: WorkOrder[];
  isLoading: boolean;
  currentUser: { id: string; role: string; isSuperAdmin: boolean };
  onViewDetail?: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => Promise<void>;
};

function getAvailableTransitions(
  status: string,
  user: { role: string; isSuperAdmin: boolean }
) {
  const { role, isSuperAdmin } = user;

  const canExecuteWorkOrders =
    isSuperAdmin ||
    ['OWNER', 'MANAGER', 'COORDINATOR', 'TECHNICIAN'].includes(role);
  const canApproveWorkOrder =
    isSuperAdmin || ['OWNER', 'MANAGER', 'COORDINATOR'].includes(role);
  const canCloseWorkOrder =
    isSuperAdmin || ['OWNER', 'MANAGER', 'COORDINATOR'].includes(role);

  const transitions: Array<{
    toStatus: string;
    label: string;
    description: string;
    isDestructive?: boolean;
  }> = [];

  if (status === 'PENDING') {
    if (canExecuteWorkOrders)
      transitions.push({
        toStatus: 'IN_PROGRESS',
        label: 'Iniciar Trabajo',
        description:
          'La OT pasará a En Trabajo. El técnico podrá registrar horas y repuestos.',
      });
    if (canApproveWorkOrder)
      transitions.push({
        toStatus: 'CANCELLED',
        label: 'Cancelar OT',
        description:
          'La OT quedará Cancelada. Esta acción no se puede deshacer.',
        isDestructive: true,
      });
  } else if (status === 'IN_PROGRESS') {
    if (canCloseWorkOrder)
      transitions.push({
        toStatus: 'PENDING_INVOICE',
        label: 'Cerrar OT',
        description:
          'La OT pasará a Por Cerrar. Se deducirá stock y se generarán OCs para repuestos faltantes.',
      });
    if (canApproveWorkOrder)
      transitions.push({
        toStatus: 'CANCELLED',
        label: 'Cancelar OT',
        description:
          'La OT quedará Cancelada. Esta acción no se puede deshacer.',
        isDestructive: true,
      });
  } else if (status === 'PENDING_INVOICE') {
    if (canCloseWorkOrder)
      transitions.push({
        toStatus: 'COMPLETED',
        label: 'Marcar como Completada',
        description:
          'La OT se cerrará definitivamente. Asegurate de haber cargado las facturas correspondientes.',
      });
  }

  return transitions;
}

export const statusConfig = {
  // Estados activos del flujo simplificado
  PENDING: {
    label: 'Abierta',
    variant: 'secondary' as const,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    rowBg: 'bg-blue-50',
  },
  IN_PROGRESS: {
    label: 'En Trabajo',
    variant: 'default' as const,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    rowBg: 'bg-yellow-50',
  },
  COMPLETED: {
    label: 'Cerrada',
    variant: 'default' as const,
    color: 'bg-green-100 text-green-700 border-green-200',
    rowBg: 'bg-green-50',
  },
  CANCELLED: {
    label: 'Cancelada',
    variant: 'outline' as const,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    rowBg: 'bg-gray-100',
  },
  // Legacy — para datos históricos existentes (no aparecen en leyenda ni filtros)
  PENDING_APPROVAL: {
    label: 'En Aprobación',
    variant: 'outline' as const,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    rowBg: 'bg-purple-50',
  },
  APPROVED: {
    label: 'Aprobada',
    variant: 'outline' as const,
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    rowBg: 'bg-teal-50',
  },
  PENDING_INVOICE: {
    label: 'Por Cerrar',
    variant: 'outline' as const,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    rowBg: 'bg-orange-50',
  },
  REJECTED: {
    label: 'Rechazada',
    variant: 'destructive' as const,
    color: 'bg-red-100 text-red-700 border-red-200',
    rowBg: 'bg-red-50',
  },
};

const mantTypeConfig = {
  PREVENTIVE: { label: 'Preventivo', color: 'text-blue-600' },
  CORRECTIVE: { label: 'Correctivo', color: 'text-orange-600' },
  PREDICTIVE: { label: 'Predictivo', color: 'text-purple-600' },
};

const priorityConfig = {
  LOW: { label: 'Baja', color: 'text-gray-600' },
  MEDIUM: { label: 'Media', color: 'text-yellow-600' },
  HIGH: { label: 'Alta', color: 'text-red-600' },
  URGENT: { label: 'Urgente', color: 'text-red-700 font-bold' },
  CRITICAL: { label: 'Crítica', color: 'text-red-800 font-black' }, // Mantener por compatibilidad si se usó en mocks
};

export function WorkOrdersList({
  workOrders,
  isLoading,
  currentUser,
  onViewDetail,
  onStatusChange,
}: WorkOrdersListProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<{
    workOrderId: string;
    toStatus: string;
    label: string;
    description: string;
    isDestructive?: boolean;
  } | null>(null);

  const confirmAction = async () => {
    if (!pendingAction || !onStatusChange) return;
    try {
      await onStatusChange(pendingAction.workOrderId, pendingAction.toStatus);
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (workOrders.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground text-lg">
          No hay órdenes de trabajo registradas
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Crea órdenes desde las alertas de mantenimiento
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 border-b text-sm text-muted-foreground bg-muted/10">
        {(
          [
            'PENDING',
            'IN_PROGRESS',
            'PENDING_INVOICE',
            'COMPLETED',
            'CANCELLED',
          ] as const
        ).map(key => {
          const cfg = statusConfig[key];
          return (
            <span key={cfg.label} className="flex items-center gap-2">
              <span
                className={`inline-block w-4 h-4 rounded border ${cfg.color} ${cfg.rowBg}`}
              />
              {cfg.label}
            </span>
          );
        })}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehículo</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead className="text-right">Costo Est.</TableHead>
            <TableHead className="text-right">Costo Real</TableHead>
            <TableHead>Fecha Creación</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders.map(wo => {
            const statusInfo =
              statusConfig[wo.status as keyof typeof statusConfig];
            const mantTypeInfo =
              mantTypeConfig[wo.mantType as keyof typeof mantTypeConfig];
            const priorityInfo =
              priorityConfig[wo.priority as keyof typeof priorityConfig];
            const availableTransitions = getAvailableTransitions(
              wo.status,
              currentUser
            );

            return (
              <TableRow key={wo.id} className={statusInfo?.rowBg}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">
                      {wo.vehicle.licensePlate}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {wo.vehicle.brand.name} {wo.vehicle.line.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <div className="font-medium truncate">{wo.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {wo.workOrderItems.length} items
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={mantTypeInfo?.color || 'text-gray-600'}>
                    {mantTypeInfo?.label || wo.mantType}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={priorityInfo?.color || 'text-gray-600'}>
                    {priorityInfo?.label || wo.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo?.color || 'bg-gray-100 text-gray-700'}`}
                  >
                    {statusInfo?.label || wo.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {wo.technician ? (
                      <div>
                        <div className="font-medium">{wo.technician.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Técnico
                        </div>
                      </div>
                    ) : wo.provider ? (
                      <div>
                        <div className="font-medium">{wo.provider.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Proveedor
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No asignado</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {wo.estimatedCost
                    ? `$${wo.estimatedCost.toLocaleString('es-CO')}`
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {wo.actualCost
                    ? `$${wo.actualCost.toLocaleString('es-CO')}`
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDistanceToNow(new Date(wo.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetail?.(wo.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalle
                      </DropdownMenuItem>
                      {(wo.status === 'IN_PROGRESS' ||
                        wo.status === 'PENDING_INVOICE') && (
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/invoices/new?workOrderId=${wo.id}`
                            )
                          }
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Cargar Factura
                        </DropdownMenuItem>
                      )}
                      {availableTransitions.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          {availableTransitions.map(t => (
                            <DropdownMenuItem
                              key={t.toStatus}
                              onClick={() => {
                                setPendingAction({
                                  workOrderId: wo.id,
                                  toStatus: t.toStatus,
                                  label: t.label,
                                  description: t.description,
                                  isDestructive: t.isDestructive,
                                });
                              }}
                              className={
                                t.isDestructive
                                  ? 'text-destructive focus:text-destructive'
                                  : ''
                              }
                            >
                              {t.label}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={open => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                pendingAction?.isDestructive
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
