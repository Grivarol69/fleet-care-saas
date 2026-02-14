'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Package } from 'lucide-react';

const formSchema = z.object({
  vehicleId: z.number().min(1, 'Seleccione un vehículo'),
  templateId: z.number().min(1, 'Seleccione un template'),
  assignmentKm: z
    .number()
    .min(1, 'El kilometraje debe ser mayor a 0')
    .max(500000, 'El kilometraje es demasiado alto'),
  generatedBy: z.string().min(1, 'Usuario requerido'),
});

type FormValues = z.infer<typeof formSchema>;

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: { id: number; name: string };
  line: { id: number; name: string };
  mileage: number;
}

interface MaintenanceTemplate {
  id: number;
  name: string;
  description: string | null;
  version: string;
  brand: { id: number; name: string };
  line: { id: number; name: string };
  packages: Array<{
    id: number;
    name: string;
    triggerKm: number;
    estimatedCost: number | null;
    packageItems: Array<{ id: number }>;
  }>;
  updatedAt: string;
}

interface FormAssignProgramProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function FormAssignProgram({
  open,
  onOpenChange,
  onSuccess,
}: FormAssignProgramProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<MaintenanceTemplate | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: 0,
      templateId: 0,
      assignmentKm: 0,
      generatedBy: 'current-user-id', // TODO: Get from auth context
    },
  });

  // Fetch vehicles and templates
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [vehiclesRes, templatesRes] = await Promise.all([
        axios.get('/api/vehicles/vehicles'),
        axios.get('/api/maintenance/mant-template'),
      ]);

      setVehicles(vehiclesRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Watch for vehicle selection
  const watchVehicleId = form.watch('vehicleId');
  useEffect(() => {
    const vehicle = vehicles.find(v => v.id === watchVehicleId);
    setSelectedVehicle(vehicle || null);

    // Auto-populate assignmentKm with current mileage
    if (vehicle) {
      form.setValue('assignmentKm', vehicle.mileage);
    }
  }, [watchVehicleId, vehicles]);

  // Watch for template selection
  const watchTemplateId = form.watch('templateId');
  useEffect(() => {
    const template = templates.find(t => t.id === watchTemplateId);
    setSelectedTemplate(template || null);
  }, [watchTemplateId, templates]);

  // Filter templates compatible with selected vehicle
  const compatibleTemplates = selectedVehicle
    ? templates.filter(
        t =>
          t.brand.id === selectedVehicle.brand.id &&
          t.line.id === selectedVehicle.line.id
      )
    : [];

  const assignmentKm = form.watch('assignmentKm');

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await axios.post('/api/maintenance/vehicle-programs', values);

      toast({
        title: '¡Éxito!',
        description: 'Programa de mantenimiento asignado correctamente',
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error creating program:', error);

      let errorMessage = 'No se pudo asignar el programa';

      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data || errorMessage;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const totalItems = selectedTemplate?.packages.reduce(
    (sum, pkg) => sum + pkg.packageItems.length,
    0
  );

  const totalEstimatedCost = selectedTemplate?.packages.reduce(
    (sum, pkg) => sum + (pkg.estimatedCost || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Programa de Mantenimiento</DialogTitle>
          <DialogDescription>
            Selecciona un vehículo y un template compatible para generar el
            programa de mantenimiento
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Vehicle Selection */}
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo *</FormLabel>
                    <Select
                      onValueChange={value => field.onChange(parseInt(value))}
                      value={field.value ? field.value.toString() : ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehículo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map(vehicle => (
                          <SelectItem
                            key={vehicle.id}
                            value={vehicle.id.toString()}
                          >
                            {vehicle.licensePlate} - {vehicle.brand.name}{' '}
                            {vehicle.line.name}
                            <span className="text-xs text-gray-500 ml-2">
                              ({vehicle.mileage.toLocaleString()} km)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Template Selection (only show if vehicle selected) */}
              {selectedVehicle && (
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template de Mantenimiento *</FormLabel>
                      <Select
                        onValueChange={value => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar template..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {compatibleTemplates.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 text-center">
                              No hay templates compatibles para este vehículo
                            </div>
                          ) : (
                            compatibleTemplates.map(template => (
                              <SelectItem
                                key={template.id}
                                value={template.id.toString()}
                              >
                                <div className="flex flex-col">
                                  <span>{template.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {template.packages.length} paquetes • v
                                    {template.version}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Solo se muestran templates compatibles con{' '}
                        {selectedVehicle.brand.name} {selectedVehicle.line.name}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Assignment Km */}
              {selectedVehicle && selectedTemplate && (
                <FormField
                  control={form.control}
                  name="assignmentKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilometraje Inicial del Vehículo *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="Ej: 32000"
                            {...field}
                            onChange={e =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                            className="pr-12"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            km
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Kilometraje actual del vehículo al momento de asignar el
                        programa
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Preview of Packages */}
              {selectedTemplate && assignmentKm > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Preview de Paquetes Programados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedTemplate.packages.map(pkg => {
                      const scheduledKm = assignmentKm + pkg.triggerKm;
                      return (
                        <div
                          key={pkg.id}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium">{pkg.name}</p>
                              <p className="text-xs text-gray-500">
                                {pkg.packageItems.length} items
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-blue-600">
                              {scheduledKm.toLocaleString()} km
                            </p>
                            {pkg.estimatedCost && (
                              <p className="text-xs text-gray-500">
                                ${pkg.estimatedCost}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Summary */}
                    <div className="pt-2 border-t flex justify-between text-sm">
                      <div className="flex gap-4">
                        <div>
                          <span className="text-gray-500">Total paquetes:</span>
                          <Badge variant="outline" className="ml-2">
                            {selectedTemplate.packages.length}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-500">Total items:</span>
                          <Badge variant="outline" className="ml-2">
                            {totalItems}
                          </Badge>
                        </div>
                      </div>
                      {totalEstimatedCost && totalEstimatedCost > 0 && (
                        <div>
                          <span className="text-gray-500">Costo est.:</span>
                          <span className="ml-2 font-semibold">
                            ${totalEstimatedCost}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generar Programa
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
