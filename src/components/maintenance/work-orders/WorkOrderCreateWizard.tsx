'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import {
  Loader2,
  Car,
  AlertTriangle,
  Wrench,
  Check,
  ChevronsUpDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Schema for the form
const formSchema = z.object({
  vehicleId: z.string().min(1, 'Selecciona un vehículo'),
  title: z.string().min(3, 'El título es requerido'),
  description: z.string().optional(),
  mantType: z.enum(['PREVENTIVE', 'CORRECTIVE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  alertIds: z.array(z.string()).optional(),
  technicianId: z.string().optional(),
  workType: z.enum(['INTERNAL', 'EXTERNAL', 'MIXED']).default('INTERNAL'),
  scheduledDate: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  vehicleLocation: z.string().optional(),
});

type Vehicle = {
  id: string;
  licensePlate: string;
  brand: { name: string };
  line: { name: string };
  mileage: number;
};

type MaintenanceAlert = {
  id: string;
  itemName: string;
  priority: string;
  status: string;
};

interface WorkOrderCreateWizardProps {
  onSuccess?: () => void;
  defaultDate?: string;
  defaultVehicleId?: string;
}

export function WorkOrderCreateWizard({ onSuccess, defaultDate, defaultVehicleId }: WorkOrderCreateWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);

  // 1. Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: '',
      title: '',
      description: '',
      mantType: 'CORRECTIVE',
      priority: 'MEDIUM',
      alertIds: [],
      workType: 'INTERNAL',
    },
  });

  // Watch for vehicle changes to fetch alerts
  const vehicleId = form.watch('vehicleId');

  useEffect(() => {
    if (vehicleId) {
      // Find selected vehicle object
      const v = vehicles.find(veh => veh.id === vehicleId);
      setSelectedVehicle(v || null);

      // Fetch alerts if any
      fetchAlerts(vehicleId);
    }
  }, [vehicleId, vehicles]);

  // Pre-fill defaultDate
  useEffect(() => {
    if (defaultDate) {
      form.setValue('scheduledDate', defaultDate);
    }
  }, [defaultDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill defaultVehicleId (after vehicles are loaded)
  useEffect(() => {
    if (defaultVehicleId && vehicles.length > 0) {
      const v = vehicles.find(veh => veh.id === defaultVehicleId);
      if (v) {
        form.setValue('vehicleId', defaultVehicleId);
        setSelectedVehicle(v);
      }
    }
  }, [defaultVehicleId, vehicles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all vehicles at start for local search in Combobox
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await axios.get('/api/vehicles/vehicles');
        setVehicles(res.data || []);
      } catch (error) {
        console.error('Error fetching vehicles', error);
      }
    };
    fetchVehicles();
  }, []);

  const fetchAlerts = async (vehId: string) => {
    try {
      const res = await axios.get(
        `/api/maintenance/alerts?vehicleId=${vehId}&status=PENDING`
      );
      setAlerts(res.data || []);
    } catch (error) {
      console.error('Error fetching alerts', error);
      setAlerts([]);
    }
  };

  // Submit Handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const payload = {
        vehicleId: values.vehicleId,
        title: values.title,
        description: values.description,
        mantType: values.mantType,
        priority: values.priority,
        alertIds: values.alertIds || [],
        technicianId: values.technicianId || undefined,
        workType: values.workType,
        scheduledDate: values.scheduledDate || undefined,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        vehicleLocation: values.vehicleLocation || undefined,
      };

      const res = await axios.post('/api/maintenance/work-orders', payload);

      toast({
        title: 'Orden Creada',
        description: `La orden #${res.data.id} ha sido creada exitosamente.`,
      });

      onSuccess?.();
      // Redirect to detail
      router.push(`/dashboard/maintenance/work-orders/${res.data.id}`);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description:
          error.response?.data?.error || 'No se pudo crear la orden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Nueva Orden de Trabajo</h1>
        <p className="text-muted-foreground">
          Sigue los pasos para registrar un mantenimiento.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Paso 1: Selección de Vehículo */}
          <Card className={cn(step === 1 && 'border-primary')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Paso 1: Seleccionar Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Vehículo</FormLabel>
                        <Popover
                          open={openCombobox}
                          onOpenChange={setOpenCombobox}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox}
                                className={cn(
                                  'w-full justify-between',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value
                                  ? vehicles.find(v => v.id === field.value)
                                    ?.licensePlate
                                  : 'Buscar vehículo por placa...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Placa, marca o línea..." />
                              <CommandList>
                                <CommandEmpty>
                                  No se encontró el vehículo.
                                </CommandEmpty>
                                <CommandGroup>
                                  {vehicles.map(vehicle => (
                                    <CommandItem
                                      key={vehicle.id}
                                      value={`${vehicle.licensePlate} ${vehicle.brand.name} ${vehicle.line.name}`}
                                      onSelect={() => {
                                        field.onChange(vehicle.id);
                                        setOpenCombobox(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          vehicle.id === field.value
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-bold">
                                          {vehicle.licensePlate}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {vehicle.brand.name}{' '}
                                          {vehicle.line.name} —{' '}
                                          {Number(
                                            vehicle.mileage
                                          ).toLocaleString()}{' '}
                                          km
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedVehicle && (
                    <div className="bg-muted/30 border border-border rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                            Vehículo Seleccionado
                          </p>
                          <h3 className="text-xl font-bold">
                            {selectedVehicle.licensePlate}
                          </h3>
                          <p className="text-sm">
                            {selectedVehicle.brand.name}{' '}
                            {selectedVehicle.line.name}
                          </p>
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {Number(selectedVehicle.mileage).toLocaleString()} km
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                selectedVehicle && (
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                    <div className="text-sm">
                      <span className="font-bold">
                        {selectedVehicle.licensePlate}
                      </span>{' '}
                      - {selectedVehicle.brand.name} {selectedVehicle.line.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => setStep(1)}
                    >
                      Cambiar
                    </Button>
                  </div>
                )
              )}
            </CardContent>
            {step === 1 && (
              <CardFooter className="flex justify-end pt-0">
                <Button
                  type="button"
                  disabled={!vehicleId}
                  onClick={() => setStep(2)}
                  className="gap-2"
                >
                  Continuar
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Paso 2: Detalles de la Orden (Alertas, Tipo, Título, Prioridad, Descripción) */}
          <Card className={cn(step === 2 ? 'border-primary' : 'opacity-80')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Paso 2: Detalles de la Orden
              </CardTitle>
            </CardHeader>

            {step === 2 && (
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="workType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Modalidad de Trabajo</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          value={field.value}
                          onValueChange={(val: string) => {
                            if (val) field.onChange(val);
                          }}
                          className="justify-start"
                        >
                          <ToggleGroupItem value="INTERNAL" aria-label="Taller Propio" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                            🔧 Taller Propio
                          </ToggleGroupItem>
                          <ToggleGroupItem value="EXTERNAL" aria-label="Servicio Externo" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                            🚛 Servicio Externo
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bloque Alertas Detectadas */}
                {alerts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="flex items-center gap-2 font-semibold text-amber-800 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas Pendientes Detectadas
                    </h4>
                    <p className="text-sm text-amber-700 mb-4">
                      Este vehículo tiene mantenimientos programados pendientes.
                      ¿Deseas incluirlos?
                    </p>

                    <FormField
                      control={form.control}
                      name="alertIds"
                      render={() => (
                        <div className="space-y-2">
                          {alerts.map(alert => (
                            <FormField
                              key={alert.id}
                              control={form.control}
                              name="alertIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={alert.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={
                                          field.value?.includes(alert.id) ??
                                          false
                                        }
                                        onCheckedChange={checked => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([
                                              ...current,
                                              alert.id,
                                            ]);
                                            form.setValue(
                                              'mantType',
                                              'PREVENTIVE'
                                            );
                                            form.setValue(
                                              'title',
                                              `Mantenimiento: ${alert.itemName}`
                                            );
                                          } else {
                                            field.onChange(
                                              current.filter(
                                                value => value !== alert.id
                                              )
                                            );
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="cursor-pointer font-normal">
                                        {alert.itemName}{' '}
                                        <Badge
                                          variant="outline"
                                          className="ml-2 text-[10px] h-4 bg-white"
                                        >
                                          {alert.priority}
                                        </Badge>
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      )}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mantType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Mantenimiento</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CORRECTIVE">
                              Correctivo (Falla)
                            </SelectItem>
                            <SelectItem value="PREVENTIVE">
                              Preventivo (Programado)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridad</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona prioridad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Baja</SelectItem>
                            <SelectItem value="MEDIUM">Media</SelectItem>
                            <SelectItem value="HIGH">Alta</SelectItem>
                            <SelectItem value="URGENT">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título / Falla Reportada</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Cambio de Aceite, Ruido en Frenos..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción Adicional</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalles sobre el trabajo a realizar..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Programada (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora desde (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora hasta (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="vehicleLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación del vehículo (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: Taller norte, calle 123..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            )}

            {step === 2 && (
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Atrás
                </Button>
                <Button type="submit" disabled={isLoading} className="gap-2">
                  {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Crear Orden
                </Button>
              </CardFooter>
            )}
          </Card>
        </form>
      </Form>
    </div>
  );
}
