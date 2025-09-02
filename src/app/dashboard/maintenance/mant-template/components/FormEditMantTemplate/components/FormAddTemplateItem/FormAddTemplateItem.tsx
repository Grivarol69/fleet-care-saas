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
import { Loader2 } from 'lucide-react';
import { FormAddTemplateItemProps, MantItem } from './FormAddTemplateItem.types';

// Schema para Template Item
const formSchema = z.object({
  mantItemId: z.number().min(1, {
    message: 'Debe seleccionar un item de mantenimiento',
  }),
  triggerKm: z.number().min(1, {
    message: 'El kilometraje debe ser mayor a 0',
  }),
});

type FormData = z.infer<typeof formSchema>;

export function FormAddTemplateItem({
  isOpen,
  setIsOpen,
  templateId,
  onAddItem,
}: FormAddTemplateItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [mantItems, setMantItems] = useState<MantItem[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mantItemId: 0,
      triggerKm: 10000, // Valor por defecto común
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
        planId: templateId,
        mantItemId: values.mantItemId,
        triggerKm: values.triggerKm,
      };

      const response = await axios.post('/api/maintenance/template-items', payload);
      const newItem = response.data;

      onAddItem(newItem);
      setIsOpen(false);
      form.reset();

      toast({
        title: '¡Tarea agregada!',
        description: `La tarea "${newItem.mantItem.name}" fue agregada exitosamente.`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error creating template item:', error);

      let errorMessage = 'Algo salió mal al agregar la tarea';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          errorMessage = 'Este item de mantenimiento ya está asignado a este template';
        } else if (error.response?.status === 400) {
          errorMessage = 'Datos inválidos, por favor revise los campos';
        } else if (error.response?.status === 401) {
          errorMessage = 'No autorizado para agregar tareas';
        } else if (error.response?.status === 404) {
          errorMessage = 'Template o item de mantenimiento no encontrado';
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Tarea al Template</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Item de Mantenimiento */}
            <FormField
              control={form.control}
              name="mantItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item de Mantenimiento</FormLabel>
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
                  <FormLabel>Frecuencia (Kilómetros)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1000"
                      min="1000"
                      max="500000"
                      placeholder="10000"
                      {...field}
                      value={field.value || ''}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="text-sm text-gray-500">
                    Cada cuántos kilómetros se debe realizar este mantenimiento
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isLoading ? 'Agregando...' : 'Agregar Tarea'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}