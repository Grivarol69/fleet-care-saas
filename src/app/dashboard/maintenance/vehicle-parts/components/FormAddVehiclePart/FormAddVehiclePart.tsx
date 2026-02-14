'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { formSchema, type FormValues } from './FormAddVehiclePart.form';
import type { FormAddVehiclePartProps } from './FormAddVehiclePart.types';

export function FormAddVehiclePart({
  isOpen,
  setIsOpen,
  onAdd,
  brands,
  lines,
  mantItems,
  masterParts,
  isSuperAdmin,
}: FormAddVehiclePartProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mantItemId: 0,
      vehicleBrandId: 0,
      vehicleLineId: 0,
      yearFrom: null,
      yearTo: null,
      masterPartId: '',
      quantity: 1,
      notes: null,
      isGlobal: false,
    },
  });

  const filteredLines = selectedBrandId
    ? lines.filter(l => l.brandId === selectedBrandId)
    : [];

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        '/api/maintenance/vehicle-parts',
        values
      );
      onAdd(response.data);
      setIsOpen(false);
      form.reset();
      setSelectedBrandId(null);
      toast({
        title: 'Vinculo creado',
        description: 'La autoparte fue vinculada exitosamente',
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          toast({
            title: 'Vinculo duplicado',
            description: 'Ya existe un vinculo para esta combinacion',
            variant: 'destructive',
          });
          return;
        }
        if (error.response?.status === 403) {
          toast({
            title: 'Sin permisos',
            description:
              error.response.data?.error ??
              'No tiene permisos para esta accion',
            variant: 'destructive',
          });
          return;
        }
      }
      toast({
        title: 'Error al crear vinculo',
        description: 'Por favor intenta de nuevo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setSelectedBrandId(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular Autoparte a Item de Mantenimiento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Item de Mantenimiento */}
            <FormField
              control={form.control}
              name="mantItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item de Mantenimiento</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={v => field.onChange(parseInt(v))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar item..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mantItems.map(item => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Marca */}
            <FormField
              control={form.control}
              name="vehicleBrandId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={v => {
                      const brandId = parseInt(v);
                      field.onChange(brandId);
                      setSelectedBrandId(brandId);
                      form.setValue('vehicleLineId', 0);
                    }}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar marca..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {brands.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Linea (filtrada por marca) */}
            <FormField
              control={form.control}
              name="vehicleLineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linea</FormLabel>
                  <Select
                    disabled={isLoading || !selectedBrandId}
                    onValueChange={v => field.onChange(parseInt(v))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedBrandId
                              ? 'Seleccionar linea...'
                              : 'Seleccione marca primero'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredLines.map(l => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rango de Anios */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yearFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desde (anio)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2018"
                        disabled={isLoading}
                        value={field.value ?? ''}
                        onChange={e =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yearTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasta (anio)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2025"
                        disabled={isLoading}
                        value={field.value ?? ''}
                        onChange={e =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Autoparte */}
            <FormField
              control={form.control}
              name="masterPartId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Autoparte</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar autoparte..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {masterParts.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} - {p.description}
                        </SelectItem>
                      ))}
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
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="1"
                      disabled={isLoading}
                      value={field.value}
                      onChange={e =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Global (solo SUPER_ADMIN) */}
            {isSuperAdmin && (
              <FormField
                control={form.control}
                name="isGlobal"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 text-sm">
                      Crear como dato global (visible para todos los tenants)
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales..."
                      disabled={isLoading}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creando...' : 'Crear Vinculo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
