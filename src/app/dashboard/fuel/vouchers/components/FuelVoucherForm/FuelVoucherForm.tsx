'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  getFuelTypeLabels,
  getVolumeUnitDefault,
  VOLUME_UNIT_SUFFIX,
  type VolumeUnitKey,
} from '@/lib/fuel-constants';

import {
  fuelVoucherFormSchema,
  type FuelVoucherFormValues,
} from './FuelVoucherForm.form';
import type {
  FuelVehicle,
  FuelDriver,
  FuelProvider,
  FuelVoucherFormProps,
} from './FuelVoucherForm.types';

export function FuelVoucherForm({
  onSubmit,
  isSubmitting,
}: FuelVoucherFormProps) {
  const [vehicles, setVehicles] = useState<FuelVehicle[]>([]);
  const [drivers, setDrivers] = useState<FuelDriver[]>([]);
  const [providers, setProviders] = useState<FuelProvider[]>([]);
  const [tenantCountry, setTenantCountry] = useState<string>('AR');

  const form = useForm<FuelVoucherFormValues>({
    resolver: zodResolver(fuelVoucherFormSchema),
    defaultValues: {
      vehicleId: '',
      date: new Date(),
      odometer: 0,
      fuelType: '',
      quantity: 0,
      volumeUnit: 'LITERS',
      driverId: undefined,
      providerId: undefined,
      pricePerUnit: undefined,
      notes: '',
    },
  });

  const quantity = form.watch('quantity');
  const pricePerUnit = form.watch('pricePerUnit');
  const watchedVolumeUnit = form.watch('volumeUnit') as VolumeUnitKey;

  const totalAmount =
    quantity && pricePerUnit && Number(quantity) > 0 && Number(pricePerUnit) > 0
      ? (Number(quantity) * Number(pricePerUnit)).toFixed(2)
      : null;

  const fuelTypeLabels = getFuelTypeLabels(tenantCountry);
  const fuelTypes = Object.keys(
    fuelTypeLabels
  ) as (keyof typeof fuelTypeLabels)[];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, driversRes, providersRes, tenantsRes] =
          await Promise.all([
            axios.get('/api/vehicles/vehicles'),
            axios.get('/api/people/drivers'),
            axios.get('/api/people/providers'),
            axios.get('/api/tenants'),
          ]);
        setVehicles(vehiclesRes.data);
        setDrivers(driversRes.data);
        setProviders(providersRes.data);

        const country: string = tenantsRes.data?.tenants?.[0]?.country ?? 'AR';
        setTenantCountry(country);
        form.setValue('volumeUnit', getVolumeUnitDefault(country));
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };
    fetchData();
  }, [form]);

  const handleSubmit = async (values: FuelVoucherFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Vehículo */}
        <FormField
          control={form.control}
          name="vehicleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vehículo *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un vehículo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.licensePlate}
                      {v.brand?.name ? ` — ${v.brand.name}` : ''}
                      {v.line?.name ? ` ${v.line.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fecha */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP', { locale: es })
                      ) : (
                        <span>Seleccione una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={date =>
                      date > new Date() || date < new Date('1900-01-01')
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Odómetro */}
        <FormField
          control={form.control}
          name="odometer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Odómetro (km) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Ej: 45000"
                  min={0}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo de combustible */}
        <FormField
          control={form.control}
          name="fuelType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Combustible *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fuelTypes.map(ft => (
                    <SelectItem key={ft} value={ft}>
                      {fuelTypeLabels[ft]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unidad de volumen */}
        <FormField
          control={form.control}
          name="volumeUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad de volumen</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione unidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="LITERS">Litros</SelectItem>
                  <SelectItem value="GALLONS">Galones</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cantidad */}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Cantidad ({VOLUME_UNIT_SUFFIX[watchedVolumeUnit]}) *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Ej: 50.000"
                  min={0}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conductor (opcional) */}
        <FormField
          control={form.control}
          name="driverId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conductor</FormLabel>
              <Select
                onValueChange={val =>
                  field.onChange(val === '_none' ? undefined : val)
                }
                value={field.value ?? '_none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin conductor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">Sin conductor</SelectItem>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Proveedor (opcional) */}
        <FormField
          control={form.control}
          name="providerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proveedor</FormLabel>
              <Select
                onValueChange={val =>
                  field.onChange(val === '_none' ? undefined : val)
                }
                value={field.value ?? '_none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin proveedor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">Sin proveedor</SelectItem>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Precio por unidad (opcional) */}
        <FormField
          control={form.control}
          name="pricePerUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Precio/{VOLUME_UNIT_SUFFIX[watchedVolumeUnit]}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="Ej: 1850.50"
                  min={0}
                  {...field}
                  value={field.value ?? ''}
                  onChange={e =>
                    field.onChange(
                      e.target.value === '' ? undefined : e.target.value
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Total calculado */}
        {totalAmount && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Total estimado:
            </span>
            <Badge variant="secondary" className="text-base">
              $
              {Number(totalAmount).toLocaleString('es-AR', {
                minimumFractionDigits: 2,
              })}
            </Badge>
          </div>
        )}

        {/* Notas (opcional) */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea placeholder="Observaciones..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Vale'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
