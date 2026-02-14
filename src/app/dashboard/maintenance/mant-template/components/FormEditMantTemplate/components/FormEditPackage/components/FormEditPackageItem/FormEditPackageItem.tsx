'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
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
import { useRouter } from 'next/navigation';
import { Loader2, Wrench } from 'lucide-react';
import { FormEditPackageItemProps } from './FormEditPackageItem.types';

// Schema para Package Item
const formSchema = z.object({
  triggerKm: z.number().min(1, {
    message: 'El kilometraje debe ser mayor a 0',
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  estimatedCost: z.number().min(0).optional(),
  estimatedTime: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function FormEditPackageItem({
  isOpen,
  setIsOpen,
  item,
  onEditItem,
}: FormEditPackageItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      triggerKm: 0,
      priority: 'MEDIUM',
      estimatedCost: 0,
      estimatedTime: 0,
      notes: '',
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  // Cargar datos del item cuando se abre el modal
  useEffect(() => {
    if (isOpen && item) {
      form.reset({
        triggerKm: item.triggerKm,
        priority: item.priority,
        estimatedCost: item.estimatedCost || 0,
        estimatedTime: item.estimatedTime || 0,
        notes: item.notes || '',
      });
    }
  }, [isOpen, item, form]);

  // Función para formatear el tipo de mantenimiento
  const formatMantType = (mantType: string) => {
    switch (mantType) {
      case 'PREVENTIVE':
        return 'Preventivo';
      case 'PREDICTIVE':
        return 'Predictivo';
      case 'CORRECTIVE':
        return 'Correctivo';
      case 'EMERGENCY':
        return 'Emergencia';
      default:
        return mantType;
    }
  };

  const onSubmit = async (values: FormData) => {
    if (!item) return;

    try {
      setIsLoading(true);

      const payload = {
        triggerKm: values.triggerKm,
        priority: values.priority,
        estimatedCost: values.estimatedCost || null,
        estimatedTime: values.estimatedTime || null,
        notes: values.notes || null,
      };

      const response = await axios.put(
        `/api/maintenance/package-items/${item.id}`,
        payload
      );
      const updatedItem = response.data;

      onEditItem(updatedItem);
      setIsOpen(false);

      toast({
        title: '¡Item actualizado!',
        description: `El item "${item.mantItem.name}" fue actualizado exitosamente.`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating package item:', error);

      let errorMessage = 'Algo salió mal al actualizar el item';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = 'Datos inválidos, por favor revise los campos';
        } else if (error.response?.status === 401) {
          errorMessage = 'No autorizado para actualizar items';
        } else if (error.response?.status === 404) {
          errorMessage = 'Item no encontrado';
        } else if (error.response?.data) {
          errorMessage = error.response.data;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            Editar Item: {item.mantItem.name}
          </DialogTitle>
        </DialogHeader>

        {/* Info del Item de Mantenimiento (solo lectura) */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-sm text-gray-700 mb-2">
            Item de Mantenimiento:
          </h4>
          <div className="space-y-1">
            <p className="font-semibold">{item.mantItem.name}</p>
            {item.mantItem.description && (
              <p className="text-sm text-gray-600">
                {item.mantItem.description}
              </p>
            )}
            <div className="flex gap-4 text-sm">
              <span>
                Tipo: <strong>{formatMantType(item.mantItem.mantType)}</strong>
              </span>
              <span>
                Categoría: <strong>{item.mantItem.category.name}</strong>
              </span>
              <span>
                Tiempo base:{' '}
                <strong>
                  {Number(item.mantItem.estimatedTime).toFixed(1)}h
                </strong>
              </span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kilometraje de activación */}
              <FormField
                control={form.control}
                name="triggerKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frecuencia (Kilómetros) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1000"
                        min="1000"
                        max="500000"
                        placeholder="5000"
                        {...field}
                        value={field.value || ''}
                        onChange={e =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="text-sm text-gray-500">
                      Cada cuántos kilómetros se debe realizar
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prioridad */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione prioridad" />
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

              {/* Costo Estimado */}
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Estimado (COP)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="25000"
                        {...field}
                        onChange={e =>
                          field.onChange(
                            parseFloat(e.target.value) || undefined
                          )
                        }
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="text-sm text-gray-500">
                      Sobrescribe el costo base del item si es necesario
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tiempo Estimado */}
              <FormField
                control={form.control}
                name="estimatedTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiempo Estimado (horas)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="1.5"
                        {...field}
                        onChange={e =>
                          field.onChange(
                            parseFloat(e.target.value) || undefined
                          )
                        }
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="text-sm text-gray-500">
                      Sobrescribe el tiempo base del item si es necesario
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notas */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notas Especiales (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Instrucciones específicas para este item en este paquete..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Actualizando...' : 'Actualizar Item'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
