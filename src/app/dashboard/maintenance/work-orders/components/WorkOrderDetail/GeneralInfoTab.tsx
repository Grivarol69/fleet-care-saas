'use client';

import { useState } from 'react';
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
import { Calendar, User, DollarSign, Package, FileText } from 'lucide-react';
import { useCostCenters } from '@/lib/hooks/usePeople';

type WorkOrder = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null; // NUEVO
  status: string;
  mantType: string;
  priority: string;
  estimatedCost: number | null;
  actualCost: number | null;
  costCenterId: string | null;
  costCenterRef: { id: string; name: string } | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  creationMileage: number;
  completionMileage: number | null;
  isPackageWork: boolean;
  packageName: string | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
    mileage: number;
  };
  technician: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  provider: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  maintenanceAlerts: Array<{
    id: string;
    itemName: string;
    status: string;
    priority: string;
    scheduledKm?: number | null;
    estimatedCost?: number | null;
  }>;
};

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

type GeneralInfoTabProps = {
  workOrder: WorkOrder;
  onUpdate: (updates: any) => Promise<void>;
  currentUser?: CurrentUser | null;
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
  URGENT: { label: 'Urgente', color: 'text-red-700 font-bold' },
};

const mantTypeConfig = {
  PREVENTIVE: { label: 'Preventivo' },
  CORRECTIVE: { label: 'Correctivo' },
  PREDICTIVE: { label: 'Predictivo' },
};

export function GeneralInfoTab({
  workOrder,
  onUpdate,
  currentUser: _currentUser,
}: GeneralInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: workOrder.title,
    description: workOrder.description || '',
    notes: workOrder.notes || '', // NUEVO
    priority: workOrder.priority,
    costCenterId: workOrder.costCenterId || '',
    actualCost: workOrder.actualCost?.toString() || '',
  });

  const { data: costCenters = [] } = useCostCenters();

  const statusInfo = statusConfig[workOrder.status] ?? {
    label: workOrder.status,
    variant: 'outline' as const,
  };
  const priorityInfo =
    priorityConfig[workOrder.priority as keyof typeof priorityConfig];
  const mantTypeInfo =
    mantTypeConfig[workOrder.mantType as keyof typeof mantTypeConfig];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, string | number | null> = {
        title: formData.title,
        priority: formData.priority,
        description: formData.description || null,
        notes: formData.notes || null,
      };

      if (formData.actualCost) {
        updates.actualCost = parseFloat(formData.actualCost);
      }

      if (formData.costCenterId) {
        updates.costCenterId = formData.costCenterId;
      } else {
        updates.costCenterId = null;
      }

      await onUpdate(updates);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
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
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
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
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className={`mt-2 ${priorityInfo.color}`}>
                  {priorityInfo.label}
                </p>
              )}
            </div>

            <div>
              <Label>Centro de Costos</Label>
              {isEditing ? (
                <Select
                  value={formData.costCenterId || 'NONE'}
                  onValueChange={val =>
                    setFormData({
                      ...formData,
                      costCenterId: val === 'NONE' ? '' : val,
                    })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin centro de costos</SelectItem>
                    {costCenters.map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} — {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {workOrder.costCenterRef?.name || '—'}
                </p>
              )}
            </div>
          </div>

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

          {/* Notas Internas (NUEVO) */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" />
              Notas Internas
            </h3>
            {isEditing ? (
              <div className="space-y-2">
                <Label
                  htmlFor="notes"
                  className="text-xs text-muted-foreground"
                >
                  Instrucciones para el equipo de taller
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Agregá detalles relevantes para el taller..."
                  rows={4}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                {workOrder.notes || 'Sin notas internas.'}
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
