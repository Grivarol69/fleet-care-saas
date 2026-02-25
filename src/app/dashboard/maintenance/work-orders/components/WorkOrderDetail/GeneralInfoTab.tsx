'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, User, DollarSign, Package } from 'lucide-react';

type WorkOrder = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  mantType: string;
  priority: string;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  creationMileage: number;
  completionMileage: number | null;
  isPackageWork: boolean;
  packageName: string | null;
  vehicle: {
    id: number;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
    mileage: number;
  };
  technician: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  provider: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  maintenanceAlerts: Array<{
    id: number;
    itemName: string;
    status: string;
    priority: string;
    scheduledKm?: number | null;
    estimatedCost?: number | null;
  }>;
};

type GeneralInfoTabProps = {
  workOrder: WorkOrder;
  onUpdate: (updates: Partial<WorkOrder>) => Promise<void>;
};

type CurrentUser = {
  role: string;
  isSuperAdmin: boolean;
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

const priorityConfig = {
  LOW: { label: 'Baja', color: 'text-gray-600' },
  MEDIUM: { label: 'Media', color: 'text-yellow-600' },
  HIGH: { label: 'Alta', color: 'text-red-600' },
  CRITICAL: { label: 'Crítica', color: 'text-red-700 font-bold' },
};

const mantTypeConfig = {
  PREVENTIVE: { label: 'Preventivo' },
  CORRECTIVE: { label: 'Correctivo' },
  PREDICTIVE: { label: 'Predictivo' },
};

/**
 * Determines whether the user can approve/reject/send-to-approval WOs.
 * MANAGER, OWNER, SUPER_ADMIN → true.
 */
function isManagerOrAbove(user: CurrentUser): boolean {
  return user.isSuperAdmin || user.role === 'OWNER' || user.role === 'MANAGER';
}

/**
 * Determines whether the user can start/execute work.
 * TECHNICIAN, MANAGER, OWNER, SUPER_ADMIN → true.
 */
function canExecute(user: CurrentUser): boolean {
  return (
    user.isSuperAdmin ||
    user.role === 'OWNER' ||
    user.role === 'MANAGER' ||
    user.role === 'TECHNICIAN'
  );
}

export function GeneralInfoTab({ workOrder, onUpdate }: GeneralInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [completionMileageInput, setCompletionMileageInput] = useState(
    workOrder.completionMileage?.toString() || ''
  );
  const [formData, setFormData] = useState({
    priority: workOrder.priority,
    description: workOrder.description || '',
    actualCost: workOrder.actualCost?.toString() || '',
  });
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then((data: CurrentUser) => setCurrentUser(data))
      .catch(() => {});
  }, []);

  const statusInfo = statusConfig[workOrder.status] ?? {
    label: workOrder.status,
    variant: 'outline' as const,
  };
  const priorityInfo =
    priorityConfig[workOrder.priority as keyof typeof priorityConfig];
  const mantTypeInfo =
    mantTypeConfig[workOrder.mantType as keyof typeof mantTypeConfig];

  /** Perform a status transition, optionally including completionMileage */
  const handleTransition = async (toStatus: string) => {
    setIsTransitioning(true);
    try {
      const updates: Record<string, string | number | null> = {
        status: toStatus,
      };
      if (toStatus === 'COMPLETED' && completionMileageInput) {
        updates.completionMileage = parseInt(completionMileageInput, 10);
      }
      await onUpdate(updates);
      setPendingStatus(null);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSave = async () => {
    const updates: Record<string, string | number | null> = {
      priority: formData.priority,
      description: formData.description || null,
    };

    if (formData.actualCost) {
      updates.actualCost = parseFloat(formData.actualCost);
    }

    await onUpdate(updates);
    setIsEditing(false);
  };

  /** Render contextual action buttons based on status + user role */
  const renderActionButtons = () => {
    if (!currentUser) return null;

    const status = workOrder.status;

    // PENDING → TECHNICIAN or MANAGER/OWNER can start
    if (status === 'PENDING') {
      return (
        <div className="flex gap-2 flex-wrap">
          {canExecute(currentUser) && (
            <Button
              size="sm"
              disabled={isTransitioning}
              onClick={() => handleTransition('IN_PROGRESS')}
            >
              {isTransitioning ? 'Procesando...' : 'Iniciar trabajo'}
            </Button>
          )}
          {isManagerOrAbove(currentUser) && (
            <Button
              size="sm"
              variant="outline"
              disabled={isTransitioning}
              onClick={() => handleTransition('PENDING_APPROVAL')}
            >
              {isTransitioning ? 'Procesando...' : 'Enviar a aprobación'}
            </Button>
          )}
        </div>
      );
    }

    // PENDING_APPROVAL → MANAGER/OWNER can approve or reject
    if (status === 'PENDING_APPROVAL' && isManagerOrAbove(currentUser)) {
      return (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            disabled={isTransitioning}
            onClick={() => handleTransition('APPROVED')}
          >
            {isTransitioning ? 'Procesando...' : 'Aprobar'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isTransitioning}
            onClick={() => handleTransition('REJECTED')}
          >
            {isTransitioning ? 'Procesando...' : 'Rechazar'}
          </Button>
        </div>
      );
    }

    // APPROVED → TECHNICIAN or MANAGER/OWNER can start work
    if (status === 'APPROVED' && canExecute(currentUser)) {
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

    // PENDING_INVOICE → MANAGER/OWNER can close the WO
    if (status === 'PENDING_INVOICE' && isManagerOrAbove(currentUser)) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <Label className="text-sm">Kilometraje al cierre</Label>
              <Input
                type="number"
                value={completionMileageInput}
                onChange={e => setCompletionMileageInput(e.target.value)}
                placeholder={workOrder.vehicle.mileage.toString()}
                className="w-40"
              />
            </div>
            <Button
              size="sm"
              disabled={isTransitioning}
              onClick={() => {
                setPendingStatus('COMPLETED');
                handleTransition('COMPLETED');
              }}
            >
              {isTransitioning ? 'Cerrando...' : 'Cerrar OT'}
            </Button>
          </div>
          {pendingStatus === 'COMPLETED' && (
            <p className="text-xs text-muted-foreground">
              Se calculará el costo real automáticamente.
            </p>
          )}
        </div>
      );
    }

    // No action available for this role/status combination
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Estado y Acciones */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Estado de la Orden</CardTitle>
            {!isEditing &&
              workOrder.status !== 'COMPLETED' &&
              workOrder.status !== 'CANCELLED' &&
              workOrder.status !== 'REJECTED' && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              )}
            {isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>Guardar Cambios</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Estado Actual</Label>
              <div className="mt-2">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
            </div>

            <div>
              <Label>Prioridad</Label>
              {isEditing ? (
                <Select
                  value={formData.priority}
                  onValueChange={value =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className={`mt-2 ${priorityInfo.color}`}>
                  {priorityInfo.label}
                </p>
              )}
            </div>
          </div>

          {/* Contextual action buttons */}
          {!isEditing && <div>{renderActionButtons()}</div>}

          <div>
            <Label>Descripción</Label>
            {isEditing ? (
              <Textarea
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {workOrder.description || 'Sin descripción'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información del Vehículo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Información del Vehículo y Mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Vehículo</Label>
              <p className="font-semibold">{workOrder.vehicle.licensePlate}</p>
              <p className="text-sm text-muted-foreground">
                {workOrder.vehicle.brand.name} {workOrder.vehicle.line.name}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">
                Tipo Mantenimiento
              </Label>
              <p className="font-semibold">{mantTypeInfo.label}</p>
            </div>

            <div>
              <Label className="text-muted-foreground">
                Kilometraje Creación
              </Label>
              <p className="font-semibold">
                {workOrder.creationMileage.toLocaleString()} km
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">
                Kilometraje Actual
              </Label>
              <p className="font-semibold">
                {workOrder.vehicle.mileage.toLocaleString()} km
              </p>
            </div>

            {/* completionMileage: show editable input when WO is COMPLETED + editing mode */}
            {isEditing && workOrder.status === 'COMPLETED' && (
              <div>
                <Label>Kilometraje Completado</Label>
                <Input
                  type="number"
                  value={completionMileageInput}
                  onChange={e => setCompletionMileageInput(e.target.value)}
                  placeholder={workOrder.vehicle.mileage.toString()}
                />
              </div>
            )}

            {!isEditing && workOrder.completionMileage && (
              <div>
                <Label className="text-muted-foreground">
                  Kilometraje Completado
                </Label>
                <p className="font-semibold">
                  {workOrder.completionMileage.toLocaleString()} km
                </p>
              </div>
            )}
          </div>

          {workOrder.isPackageWork && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-muted-foreground">Paquete</Label>
              <p className="font-semibold">{workOrder.packageName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Responsables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Técnico Asignado</Label>
              {workOrder.technician ? (
                <div>
                  <p className="font-semibold">{workOrder.technician.name}</p>
                  {workOrder.technician.email && (
                    <p className="text-sm text-muted-foreground">
                      {workOrder.technician.email}
                    </p>
                  )}
                  {workOrder.technician.phone && (
                    <p className="text-sm text-muted-foreground">
                      {workOrder.technician.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No asignado</p>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Proveedor</Label>
              {workOrder.provider ? (
                <div>
                  <p className="font-semibold">{workOrder.provider.name}</p>
                  {workOrder.provider.email && (
                    <p className="text-sm text-muted-foreground">
                      {workOrder.provider.email}
                    </p>
                  )}
                  {workOrder.provider.phone && (
                    <p className="text-sm text-muted-foreground">
                      {workOrder.provider.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No asignado</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Costos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Costos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Costo Estimado</Label>
              <p className="text-2xl font-bold">
                {workOrder.estimatedCost
                  ? `$${workOrder.estimatedCost.toLocaleString('es-CO')}`
                  : '-'}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Costo Real</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.actualCost}
                  onChange={e =>
                    setFormData({ ...formData, actualCost: e.target.value })
                  }
                  placeholder="0"
                />
              ) : (
                <p className="text-2xl font-bold">
                  {workOrder.actualCost
                    ? `$${workOrder.actualCost.toLocaleString('es-CO')}`
                    : '-'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fechas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fechas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Creación</Label>
              <p className="font-semibold">
                {formatDistanceToNow(new Date(workOrder.createdAt), {
                  addSuffix: true,
                  locale: es,
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(workOrder.createdAt).toLocaleDateString('es-CO')}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Inicio</Label>
              {workOrder.startDate ? (
                <>
                  <p className="font-semibold">
                    {formatDistanceToNow(new Date(workOrder.startDate), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(workOrder.startDate).toLocaleDateString('es-CO')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No iniciado</p>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Finalización</Label>
              {workOrder.endDate ? (
                <>
                  <p className="font-semibold">
                    {formatDistanceToNow(new Date(workOrder.endDate), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(workOrder.endDate).toLocaleDateString('es-CO')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No completado</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas Relacionadas */}
      {workOrder.maintenanceAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workOrder.maintenanceAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{alert.itemName}</p>
                    <p className="text-sm text-muted-foreground">
                      Prioridad: {alert.priority}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alert.status === 'CLOSED' ? 'default' : 'secondary'
                    }
                  >
                    {alert.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
