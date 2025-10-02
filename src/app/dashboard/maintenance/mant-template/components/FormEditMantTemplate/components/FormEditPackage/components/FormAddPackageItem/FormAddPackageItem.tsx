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
import { FormAddPackageItemProps, MantItem } from './FormAddPackageItem.types';

// Schema para Package Item
const formSchema = z.object({
  mantItemId: z.number().min(1, {
    message: 'Debe seleccionar un item de mantenimiento',
  }),
  triggerKm: z.number().min(1, {
    message: 'El kilometraje debe ser mayor a 0',
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  estimatedCost: z.number().min(0).optional(),
  estimatedTime: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function FormAddPackageItem({
  isOpen,
  setIsOpen,
  packageId,
  onAddItem,
}: FormAddPackageItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [mantItems, setMantItems] = useState<MantItem[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mantItemId: 0,
      triggerKm: 5000,
      priority: 'MEDIUM',
      estimatedCost: 0,
      estimatedTime: 0,
      notes: '',
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  // Fetch maintenance items when dialog opens
  useEffect(() => {
    const fetchMantItems = async () => {
      try {
        setIsLoadingItems(true);
        const response = await axios.get('/api/maintenance/mant-items');
        setMantItems(response.data.filter((item: MantItem) => item.status === 'ACTIVE'));
      } catch (error) {
        console.error('Error al cargar los items de mantenimiento:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los items de mantenimiento',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingItems(false);
      }
    };

    if (isOpen) {
      fetchMantItems();
    }
  }, [isOpen, toast]);

  // Auto-rellenar datos del MantItem seleccionado
  const selectedMantItemId = form.watch('mantItemId');
  useEffect(() => {
    if (selectedMantItemId > 0) {
      const selectedItem = mantItems.find(item => item.id === selectedMantItemId);
      if (selectedItem) {
        form.setValue('estimatedCost', selectedItem.estimatedCost || 0);
        form.setValue('estimatedTime', selectedItem.estimatedTime || 0);
      }
    }
  }, [selectedMantItemId, mantItems, form]);

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
    try {
      setIsLoading(true);

      const payload = {
        packageId,
        mantItemId: values.mantItemId,
        triggerKm: values.triggerKm,
        priority: values.priority,
        estimatedCost: values.estimatedCost || null,
        estimatedTime: values.estimatedTime || null,
        notes: values.notes || null,
      };

      const response = await axios.post('/api/maintenance/package-items', payload);
      const newItem = response.data;

      onAddItem(newItem);
      setIsOpen(false);
      form.reset();

      toast({
        title: '¡Item agregado!',
        description: `El item "${newItem.mantItem.name}" fue agregado exitosamente al paquete.`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error creating package item:', error);

      let errorMessage = 'Algo salió mal al agregar el item';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          errorMessage = 'Este item de mantenimiento ya está asignado a este paquete';
        } else if (error.response?.status === 400) {
          errorMessage = 'Datos inválidos, por favor revise los campos';
        } else if (error.response?.status === 401) {
          errorMessage = 'No autorizado para agregar items';
        } else if (error.response?.status === 404) {
          errorMessage = 'Paquete o item de mantenimiento no encontrado';
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

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            Agregar Item al Paquete
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Item de Mantenimiento */}
              <FormField
                control={form.control}
                name="mantItemId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Item de Mantenimiento *</FormLabel>
                    <Select
                      onValueChange={value => field.onChange(Number(value))}
                      value={field.value > 0 ? field.value.toString() : ''}
                      disabled={isLoading || isLoadingItems}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingItems
                                ? 'Cargando items...'
                                : 'Seleccione un item de mantenimiento'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mantItems.length === 0 && !isLoadingItems ? (
                          <SelectItem value="no-items" disabled>
                            No hay items de mantenimiento disponibles
                          </SelectItem>
                        ) : (
                          mantItems.map((item: MantItem) => (
                            <SelectItem
                              key={item.id}
                              value={item.id.toString()}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-sm text-gray-500">
                                  {formatMantType(item.mantType)} • {item.category.name} • {Number(item.estimatedTime).toFixed(1)}h
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
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
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="text-sm text-gray-500">
                      Se auto-completa del item seleccionado
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
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="text-sm text-gray-500">
                      Se auto-completa del item seleccionado
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
              <Button type="submit" disabled={isLoading || isLoadingItems}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Agregando...' : 'Agregar Item'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}