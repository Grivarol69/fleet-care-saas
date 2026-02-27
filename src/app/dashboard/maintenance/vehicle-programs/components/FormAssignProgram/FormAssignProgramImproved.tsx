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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import {
  Loader2,
  CheckCircle2,
  Package,
  AlertCircle,
  Info,
} from 'lucide-react';

// ========================================
// SCHEMAS & TYPES
// ========================================

const formSchema = z.object({
  vehicleId: z.string().min(1).min(1, 'Seleccione un vehículo'),
  templateId: z.string().min(1).min(1, 'Seleccione un template'),
  generatedBy: z.string().min(1, 'Usuario requerido'),

  // Nuevo: Tipo de vehículo
  vehicleType: z.enum(['new', 'used']),

  // Solo para vehículos usados
  lastMaintenancePackageKm: z.number().optional(),
  lastMaintenanceExecutedKm: z.number().optional(),
  lastMaintenanceDate: z.string().optional(),

  // Opcional: Datos históricos para WorkOrder
  lastMaintenanceProvider: z.string().optional(),
  lastMaintenanceInvoice: z.string().optional(),
  lastMaintenanceCost: z.number().optional(),
  lastMaintenanceNotes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Vehicle {
  id: string;
  licensePlate: string;
  brand: { id: string; name: string };
  line: { id: string; name: string };
  mileage: number;
}

interface TemplatePackage {
  id: string;
  name: string;
  triggerKm: number;
  estimatedCost: number | null;
  packageItems: Array<{ id: string }>;
}

interface MaintenanceTemplate {
  id: string;
  name: string;
  description: string | null;
  version: string;
  brand: { id: string; name: string };
  line: { id: string; name: string };
  packages: TemplatePackage[];
  updatedAt: string;
}

interface FormAssignProgramProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Infiere qué paquete del template corresponde al km ejecutado
 * Usa una tolerancia de ±500km para encontrar el match más cercano
 */
function inferPackageFromKm(
  executedKm: number,
  templatePackages: TemplatePackage[]
): TemplatePackage | null {
  const TOLERANCE = 500; // ±500 km de tolerancia

  // Buscar paquete más cercano
  const closest = templatePackages.reduce((prev, curr) => {
    const prevDiff = Math.abs(prev.triggerKm - executedKm);
    const currDiff = Math.abs(curr.triggerKm - executedKm);
    return currDiff < prevDiff ? curr : prev;
  });

  const diff = Math.abs(closest.triggerKm - executedKm);

  if (diff <= TOLERANCE) {
    return closest;
  }

  return null; // No se puede inferir
}

/**
 * Filtra solo los paquetes que están DESPUÉS del último paquete ejecutado
 */
function filterFuturePackages(
  templatePackages: TemplatePackage[],
  lastPackageKm: number
): TemplatePackage[] {
  return templatePackages
    .filter(pkg => pkg.triggerKm > lastPackageKm)
    .sort((a, b) => a.triggerKm - b.triggerKm);
}

// ========================================
// MAIN COMPONENT
// ========================================

export function FormAssignProgramImproved({
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
      vehicleId: '',
      templateId: '',
      generatedBy: 'current-user-id', // TODO: Get from auth context
      vehicleType: 'new',
      lastMaintenancePackageKm: 0,
      lastMaintenanceExecutedKm: 0,
      lastMaintenanceDate: '',
      lastMaintenanceProvider: '',
      lastMaintenanceInvoice: '',
      lastMaintenanceCost: 0,
      lastMaintenanceNotes: '',
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

    // Auto-detectar si es vehículo nuevo o usado
    if (vehicle) {
      form.setValue('vehicleType', vehicle.mileage === 0 ? 'new' : 'used');
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

  // Watch form values for preview
  const vehicleType = form.watch('vehicleType');
  const lastMaintenanceExecutedKm = form.watch('lastMaintenanceExecutedKm');

  // Calcular paquetes a asignar (preview)
  const packagesToAssign = useMemo(() => {
    if (!selectedTemplate) return [];

    if (vehicleType === 'new') {
      // Vehículo nuevo: asignar TODOS los paquetes
      return selectedTemplate.packages.sort(
        (a, b) => a.triggerKm - b.triggerKm
      );
    } else {
      // Vehículo usado: asignar solo paquetes futuros
      if (!lastMaintenanceExecutedKm || lastMaintenanceExecutedKm === 0) {
        return [];
      }

      const inferredPackage = inferPackageFromKm(
        lastMaintenanceExecutedKm,
        selectedTemplate.packages
      );

      if (!inferredPackage) {
        return []; // No se puede inferir
      }

      return filterFuturePackages(
        selectedTemplate.packages,
        inferredPackage.triggerKm
      );
    }
  }, [selectedTemplate, vehicleType, lastMaintenanceExecutedKm]);

  const totalItems = packagesToAssign.reduce(
    (sum, pkg) => sum + pkg.packageItems.length,
    0
  );

  const totalEstimatedCost = packagesToAssign.reduce(
    (sum, pkg) => sum + (pkg.estimatedCost || 0),
    0
  );

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      // Preparar payload para API
      const payload = {
        vehicleId: values.vehicleId,
        templateId: values.templateId,
        generatedBy: values.generatedBy,
        vehicleType: values.vehicleType,

        // Solo si es vehículo usado
        ...(values.vehicleType === 'used' && {
          lastMaintenance: {
            executedKm: values.lastMaintenanceExecutedKm,
            executedDate: values.lastMaintenanceDate,
            provider: values.lastMaintenanceProvider,
            invoiceNumber: values.lastMaintenanceInvoice,
            cost: values.lastMaintenanceCost,
            notes: values.lastMaintenanceNotes,
          },
        }),
      };

      await axios.post('/api/maintenance/vehicle-programs', payload);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

              {/* ===== NUEVO: Vehicle Type Selection ===== */}
              {selectedVehicle && selectedTemplate && (
                <>
                  <Separator />

                  <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Vehículo *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="new" id="new" />
                              <Label
                                htmlFor="new"
                                className="font-normal cursor-pointer"
                              >
                                Vehículo nuevo (0 km) - Asignar todos los
                                paquetes
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="used" id="used" />
                              <Label
                                htmlFor="used"
                                className="font-normal cursor-pointer"
                              >
                                Vehículo usado - Seleccionar desde qué paquete
                                iniciar
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          {selectedVehicle.mileage === 0
                            ? 'Vehículo nuevo detectado (0 km)'
                            : `Vehículo con ${selectedVehicle.mileage.toLocaleString()} km`}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ===== Campos para Vehículos Usados ===== */}
                  {vehicleType === 'used' && (
                    <Card className="bg-amber-50 border-amber-200">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Historial de Mantenimiento Previo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Para calcular correctamente los próximos
                            vencimientos, necesitamos saber cuándo fue el último
                            mantenimiento realizado antes de ingresar al
                            sistema.
                          </AlertDescription>
                        </Alert>

                        <FormField
                          control={form.control}
                          name="lastMaintenanceExecutedKm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Último mantenimiento ejecutado a los (km) *
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="Ej: 25000"
                                    {...field}
                                    onChange={e =>
                                      field.onChange(
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                    km
                                  </span>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Kilometraje al que se realizó el último
                                mantenimiento (ej: 4900, 5010, 24800, etc.)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Preview del paquete inferido */}
                        {lastMaintenanceExecutedKm &&
                          lastMaintenanceExecutedKm > 0 && (
                            <Alert className="bg-white">
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                {(() => {
                                  const inferred = inferPackageFromKm(
                                    lastMaintenanceExecutedKm,
                                    selectedTemplate.packages
                                  );
                                  if (inferred) {
                                    return (
                                      <div>
                                        <p className="font-medium">
                                          ✅ Paquete detectado: {inferred.name}{' '}
                                          ({inferred.triggerKm.toLocaleString()}{' '}
                                          km)
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                          Diferencia: ±
                                          {Math.abs(
                                            inferred.triggerKm -
                                              lastMaintenanceExecutedKm
                                          )}{' '}
                                          km
                                        </p>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <p className="text-amber-700">
                                        ⚠️ No se pudo inferir el paquete (km muy
                                        alejado de los triggers). Verifique el
                                        kilometraje ingresado.
                                      </p>
                                    );
                                  }
                                })()}
                              </AlertDescription>
                            </Alert>
                          )}

                        <FormField
                          control={form.control}
                          name="lastMaintenanceDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Fecha de ejecución (opcional)
                              </FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormDescription>
                                Fecha en que se realizó el último mantenimiento
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Separator />

                        <p className="text-sm font-medium text-gray-700">
                          Datos opcionales (para registro histórico):
                        </p>

                        <FormField
                          control={form.control}
                          name="lastMaintenanceProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Proveedor</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Nombre del taller o proveedor"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="lastMaintenanceInvoice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Número de factura</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ej: FAC-001-2024"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="lastMaintenanceCost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Costo total</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                      $
                                    </span>
                                    <Input
                                      type="number"
                                      placeholder="250000"
                                      {...field}
                                      onChange={e =>
                                        field.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="pl-8"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="lastMaintenanceNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notas</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Detalles del trabajo realizado..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Preview of Packages */}
              {selectedTemplate && packagesToAssign.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Paquetes a Asignar (Preview)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {packagesToAssign.map(pkg => (
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
                            {pkg.triggerKm.toLocaleString()} km
                          </p>
                          {selectedVehicle && (
                            <p className="text-xs text-gray-500">
                              Faltan{' '}
                              {(
                                pkg.triggerKm - selectedVehicle.mileage
                              ).toLocaleString()}{' '}
                              km
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="pt-2 border-t flex justify-between text-sm">
                      <div className="flex gap-4">
                        <div>
                          <span className="text-gray-500">Paquetes:</span>
                          <Badge variant="outline" className="ml-2">
                            {packagesToAssign.length}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <Badge variant="outline" className="ml-2">
                            {totalItems}
                          </Badge>
                        </div>
                      </div>
                      {totalEstimatedCost > 0 && (
                        <div>
                          <span className="text-gray-500">Costo est.:</span>
                          <span className="ml-2 font-semibold">
                            ${totalEstimatedCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warning si no hay paquetes a asignar */}
              {selectedTemplate &&
                vehicleType === 'used' &&
                packagesToAssign.length === 0 &&
                lastMaintenanceExecutedKm &&
                lastMaintenanceExecutedKm > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay paquetes futuros para asignar. Verifica el
                      kilometraje del último mantenimiento.
                    </AlertDescription>
                  </Alert>
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
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    (vehicleType === 'used' && packagesToAssign.length === 0)
                  }
                >
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
