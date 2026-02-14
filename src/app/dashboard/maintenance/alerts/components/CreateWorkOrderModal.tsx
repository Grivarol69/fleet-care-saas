'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMaintenanceAlerts } from '@/lib/hooks/useMaintenanceAlerts';
import { CheckCircle2, Clock, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { useTechnicians, useProviders } from '@/lib/hooks/usePeople';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedAlertIds: number[];
  onSuccess: () => void;
}

export function CreateWorkOrderModal({
  isOpen,
  onClose,
  selectedAlertIds,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allAlerts } = useMaintenanceAlerts();

  // Real Data Hooks
  const { data: technicians = [] } = useTechnicians();
  const { data: providers = [] } = useProviders();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technicianId, setTechnicianId] = useState<string | undefined>(
    undefined
  );
  const [providerId, setProviderId] = useState<string | undefined>(undefined);
  const [scheduledDate, setScheduledDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const selectedAlerts =
    allAlerts?.filter(a => selectedAlertIds.includes(a.id)) || [];

  // Calcular totales
  const totalCost = selectedAlerts.reduce(
    (sum, a) => sum + (a.estimatedCost || 0),
    0
  );
  const totalDuration = selectedAlerts.reduce(
    (sum, a) => sum + (a.estimatedDuration || 0),
    0
  );

  // Auto-generar título sugerido
  useEffect(() => {
    if (selectedAlerts.length > 0 && !title) {
      const vehicle = selectedAlerts[0];
      if (vehicle) {
        const packages = [...new Set(selectedAlerts.map(a => a.packageName))];

        if (packages.length === 1) {
          setTitle(`${packages[0]} - ${vehicle.vehiclePlate}`);
        } else {
          setTitle(
            `Mantenimiento múltiple - ${vehicle.vehiclePlate} (${selectedAlerts.length} items)`
          );
        }
      }
    }
  }, [selectedAlerts, title]);

  // Auto-generar descripción
  useEffect(() => {
    if (selectedAlerts.length > 0 && !description) {
      const itemsList = selectedAlerts.map(a => `- ${a.itemName}`).join('\n');
      setDescription(`Items incluidos:\n${itemsList}`);
    }
  }, [selectedAlerts, description]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'El título es requerido',
        variant: 'destructive',
      });
      return;
    }

    if (selectedAlerts.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un item',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Crear WorkOrder
      const response = await axios.post('/api/maintenance/work-orders', {
        vehicleId: selectedAlerts[0]?.vehicleId,
        alertIds: selectedAlertIds,
        title,
        description,
        technicianId:
          technicianId && technicianId !== 'NONE'
            ? parseInt(technicianId)
            : null,
        providerId:
          providerId && providerId !== 'NONE' ? parseInt(providerId) : null,
        scheduledDate: scheduledDate || null,
        priority,
      });

      toast({
        title: '¡Orden creada!',
        description: `WorkOrder #${response.data.id} creada exitosamente`,
      });

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });

      onSuccess();
    } catch (error: unknown) {
      console.error('Error creating work order:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la orden de trabajo';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Crear Orden de Trabajo</DialogTitle>
          <DialogDescription>
            {selectedAlerts.length} item{selectedAlerts.length > 1 ? 's' : ''}{' '}
            seleccionado
            {selectedAlerts.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview de items seleccionados */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Items incluidos:
            </h3>
            <div className="space-y-2">
              {selectedAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{alert.itemName}</span>
                    <span className="text-gray-500">({alert.packageName})</span>
                  </div>
                  <span className="text-gray-600">
                    ${Math.round(alert.estimatedCost || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Costo estimado</p>
                    <p className="text-lg font-bold text-blue-600">
                      ${Math.round(totalCost).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-500">Tiempo estimado</p>
                    <p className="text-lg font-bold text-purple-600">
                      {totalDuration.toFixed(1)} hrs
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título de la orden *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Mantenimiento 15k - ABC-123"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detalle adicional sobre el mantenimiento..."
                rows={4}
              />
            </div>

            {/* Grid de 2 columnas */}
            <div className="grid grid-cols-2 gap-4">
              {/* Técnico */}
              <div className="space-y-2">
                <Label htmlFor="technician">Técnico asignado</Label>
                <Select
                  value={technicianId || 'NONE'}
                  onValueChange={val =>
                    setTechnicianId(val === 'NONE' ? undefined : val)
                  }
                >
                  <SelectTrigger id="technician">
                    <SelectValue placeholder="Seleccionar técnico..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin asignar</SelectItem>
                    {technicians.map(tech => (
                      <SelectItem key={tech.id} value={tech.id.toString()}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proveedor */}
              <div className="space-y-2">
                <Label htmlFor="provider">Proveedor</Label>
                <Select
                  value={providerId || 'NONE'}
                  onValueChange={val =>
                    setProviderId(val === 'NONE' ? undefined : val)
                  }
                >
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Seleccionar proveedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin asignar</SelectItem>
                    {providers.map(provider => (
                      <SelectItem
                        key={provider.id}
                        value={provider.id.toString()}
                      >
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha programada */}
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Fecha programada</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                />
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Orden de Trabajo'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
