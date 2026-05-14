'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { cn } from '@/lib/utils';

const MANT_TYPE_LABELS = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  PREDICTIVE: 'Predictivo',
  EMERGENCY: 'Emergencia',
} as const;

const PRIORITY_LABELS = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
} as const;

const step1Schema = z.object({
  vehicleId: z.string().min(1, 'Seleccioná un vehículo'),
  technicianId: z.string().optional(),
  openingDate: z.string().min(1, 'La fecha de apertura es requerida'),
  creationMileage: z.coerce
    .number({ invalid_type_error: 'Ingresá un kilometraje válido' })
    .int()
    .positive('El kilometraje debe ser mayor a 0'),
  openingDescription: z
    .string()
    .min(1, 'La descripción de apertura es requerida')
    .max(2000),
  mantType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'EMERGENCY']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  title: z.string().min(1, 'El título es requerido'),
});

type Step1FormValues = z.infer<typeof step1Schema>;

type Vehicle = {
  id: string;
  licensePlate: string;
  brand: { name: string };
  line: { name: string };
  mileage: number;
};

type Technician = {
  id: string;
  name: string;
};

interface Step1OpeningProps {
  workOrderId?: string;
  initialData?: {
    vehicleId?: string;
    technicianId?: string | null;
    openingDate?: string | null;
    creationMileage?: number | null;
    openingDescription?: string | null;
    mantType?: string | null;
    priority?: string | null;
    title?: string | null;
  };
}

export function Step1Opening({
  workOrderId,
  initialData,
}: Step1OpeningProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [openVehicleCombobox, setOpenVehicleCombobox] = useState(false);

  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      vehicleId: initialData?.vehicleId ?? '',
      technicianId: initialData?.technicianId ?? '',
      openingDate: initialData?.openingDate
        ? new Date(initialData.openingDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      creationMileage: initialData?.creationMileage ?? 0,
      openingDescription: initialData?.openingDescription ?? '',
      mantType:
        (initialData?.mantType as Step1FormValues['mantType']) ?? 'CORRECTIVE',
      priority:
        (initialData?.priority as Step1FormValues['priority']) ?? 'MEDIUM',
      title: initialData?.title ?? '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const [vehiclesRes, techsRes] = await Promise.allSettled([
        axios.get('/api/vehicles/vehicles'),
        axios.get('/api/people/technicians'),
      ]);
      if (vehiclesRes.status === 'fulfilled') {
        setVehicles(vehiclesRes.value.data || []);
      }
      if (techsRes.status === 'fulfilled') {
        setTechnicians(techsRes.value.data || []);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (values: Step1FormValues) => {
    setIsLoading(true);
    try {
      let woId = workOrderId;

      if (!woId) {
        const payload = {
          vehicleId: values.vehicleId,
          technicianId: values.technicianId || undefined,
          openingDate: new Date(values.openingDate).toISOString(),
          creationMileage: values.creationMileage,
          openingDescription: values.openingDescription,
          mantType: values.mantType,
          priority: values.priority,
          title: values.title,
        };
        const res = await axios.post('/api/maintenance/work-orders', payload);
        woId = res.data.id as string;
      }

      toast({
        title: 'Apertura confirmada',
        description: 'Continuá con la inspección del vehículo.',
      });

      router.push(`/dashboard/maintenance/work-orders/${woId}/wizard?step=2`);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Error',
        description:
          axiosError.response?.data?.error || 'No se pudo crear la orden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedVehicleId = form.watch('vehicleId');
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Paso 1: Apertura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Vehicle combobox */}
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Vehículo *</FormLabel>
                  <Popover
                    open={openVehicleCombobox}
                    onOpenChange={setOpenVehicleCombobox}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openVehicleCombobox}
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
                                  setOpenVehicleCombobox(false);
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
                                    {vehicle.brand.name} {vehicle.line.name} —{' '}
                                    {Number(vehicle.mileage).toLocaleString()}{' '}
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
              <div className="bg-muted/30 border rounded-lg p-3 text-sm">
                <span className="font-bold">
                  {selectedVehicle.licensePlate}
                </span>
                {' — '}
                {selectedVehicle.brand.name} {selectedVehicle.line.name}
                {' — '}
                {Number(selectedVehicle.mileage).toLocaleString()} km actuales
              </div>
            )}

            {/* Opening date + Technician (2 col) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="openingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y hora de apertura *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technicianId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná un técnico (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {technicians.map(tech => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mileage + Type (2 col) — replaces the separate mileage field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="creationMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odómetro actual (km) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ej: 45000"
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
                    <FormLabel>Prioridad *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná la prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Type + Title (2 col) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mantType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de mantenimiento *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(MANT_TYPE_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título / Falla reportada *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Cambio de aceite, Ruido en frenos..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Opening description */}
            <FormField
              control={form.control}
              name="openingDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de apertura *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describí la situación del vehículo, la falla reportada o el trabajo a realizar..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar y continuar a Inspección
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
