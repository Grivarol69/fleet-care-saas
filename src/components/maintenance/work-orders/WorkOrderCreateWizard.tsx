'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { Loader2, Search, Car, AlertTriangle, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
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

// Schema for the form
const formSchema = z.object({
  vehicleId: z.string().min(1, 'Selecciona un vehículo'),
  title: z.string().min(3, 'El título es requerido'),
  description: z.string().optional(),
  mantType: z.enum(['PREVENTIVE', 'CORRECTIVE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  alertIds: z.array(z.number()).optional(),
  technicianId: z.string().optional(),
});

type Vehicle = {
  id: number;
  licensePlate: string;
  brand: { name: string };
  line: { name: string };
  mileage: number;
};

type MaintenanceAlert = {
  id: number;
  itemName: string;
  priority: string;
  status: string;
};

export function WorkOrderCreateWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      mantType: 'CORRECTIVE',
      priority: 'MEDIUM',
      alertIds: [],
    },
  });

  // Watch for vehicle changes to fetch alerts
  const vehicleId = form.watch('vehicleId');

  useEffect(() => {
    if (vehicleId) {
      // Find selected vehicle object
      const v = vehicles.find(veh => veh.id.toString() === vehicleId);
      setSelectedVehicle(v || null);

      // Fetch alerts if any
      fetchAlerts(vehicleId);
    }
  }, [vehicleId, vehicles]);

  // Fetch vehicles for search
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await axios.get('/api/vehicles/vehicles');
        const allVehicles: Vehicle[] = res.data || [];
        // Filtrar en cliente por búsqueda (placa, marca, línea)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          setVehicles(
            allVehicles.filter(
              v =>
                v.licensePlate.toLowerCase().includes(q) ||
                v.brand.name.toLowerCase().includes(q) ||
                v.line.name.toLowerCase().includes(q)
            )
          );
        } else {
          setVehicles(allVehicles);
        }
      } catch (error) {
        console.error('Error fetching vehicles', error);
      }
    };
    // Debounce ideally, but for now just simple effect
    const timeoutId = setTimeout(() => fetchVehicles(), 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
        vehicleId: parseInt(values.vehicleId),
        title: values.title,
        description: values.description,
        mantType: values.mantType,
        priority: values.priority,
        alertIds: values.alertIds || [],
        technicianId: values.technicianId
          ? parseInt(values.technicianId)
          : undefined,
      };

      const res = await axios.post('/api/maintenance/work-orders', payload);

      toast({
        title: 'Orden Creada',
        description: `La orden #${res.data.id} ha sido creada exitosamente.`,
      });

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
          {/* Step 1: Vehicle Selection */}
          <Card className={step === 1 ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Paso 1: Seleccionar Vehículo
              </CardTitle>
            </CardHeader>
            {step === 1 && (
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por placa, marca o línea..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {vehicles.slice(0, 6).map(vehicle => (
                          <div
                            key={vehicle.id}
                            className={`cursor-pointer border rounded-lg p-4 flex flex-col gap-1 transition-all hover:bg-muted ${
                              field.value === vehicle.id.toString()
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border'
                            }`}
                            onClick={() => {
                              field.onChange(vehicle.id.toString());
                              // Auto-advance logic could go here if desired
                            }}
                          >
                            <div className="font-bold text-lg">
                              {vehicle.licensePlate}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {vehicle.brand.name} {vehicle.line.name}
                            </div>
                            <Badge variant="outline" className="w-fit mt-2">
                              {Number(vehicle.mileage).toLocaleString()} km
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            )}
            {step > 1 && selectedVehicle && (
              <CardContent className="pt-0 pb-4">
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                  <div>
                    <span className="font-bold">
                      {selectedVehicle.licensePlate}
                    </span>{' '}
                    - {selectedVehicle.brand.name} {selectedVehicle.line.name}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    Cambiar
                  </Button>
                </div>
              </CardContent>
            )}
            {step === 1 && (
              <CardFooter className="flex justify-end">
                <Button
                  type="button"
                  disabled={!vehicleId}
                  onClick={() => setStep(2)}
                >
                  Siguiente
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Step 2: Alerts & Type */}
          <Card className={step === 2 ? 'border-primary' : 'opacity-80'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Paso 2: Tipo de Mantenimiento
              </CardTitle>
            </CardHeader>
            {step === 2 && (
              <CardContent className="space-y-6">
                {/* Alerts Detection */}
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
                                          // Logic to handle multiple selection
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([
                                              ...current,
                                              alert.id,
                                            ]);
                                            // If alerts selected, suggest Preventive
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
                                          className="ml-2 text-xs"
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

                <FormField
                  control={form.control}
                  name="mantType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Orden</FormLabel>
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
                            Correctivo (Falla imprevista)
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
                <Button type="button" onClick={() => setStep(3)}>
                  Siguiente
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Step 3: Details */}
          <Card className={step === 3 ? 'border-primary' : 'opacity-80'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Paso 3: Detalles de la Orden
              </CardTitle>
            </CardHeader>
            {step === 3 && (
              <CardContent className="space-y-4">
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
                            <SelectValue placeholder="Prioridad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LOW">Baja</SelectItem>
                          <SelectItem value="MEDIUM">Media</SelectItem>
                          <SelectItem value="HIGH">Alta</SelectItem>
                          <SelectItem value="CRITICAL">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
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
                          placeholder="Detalles adicionales sobre el trabajo a realizar..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            )}
            {step === 3 && (
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  Atrás
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
