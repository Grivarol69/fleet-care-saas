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
import { Loader2 } from 'lucide-react';
import { formSchema } from './FormEditMantItem.form';
import { FormEditMantItemProps } from './FormEditMantItem.types';

export type { FormEditMantItemProps };

type MantCategory = {
  id: string;
  name: string;
};

type FormData = z.infer<typeof formSchema>;

export function FormEditMantItem({
  isOpen,
  setIsOpen,
  mantItem,
  onEditMantItem,
}: FormEditMantItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [mantCategories, setMantCategories] = useState<MantCategory[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: mantItem.name,
      description: mantItem.description || '',
      mantType: mantItem.mantType,
      categoryId: mantItem.categoryId,
      type: mantItem.type,
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await axios.get('/api/maintenance/mant-categories');
        setMantCategories(response.data);
      } catch (error) {
        console.error('Error al cargar las categorías:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las categorías de mantenimiento',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingCategories(false);
      }
    };

    if (isOpen) {
      fetchCategories();
      form.reset({
        name: mantItem.name,
        description: mantItem.description || '',
        mantType: mantItem.mantType,
        categoryId: mantItem.categoryId,
        type: mantItem.type,
      });
    }
  }, [isOpen, mantItem, form, toast]);

  const onSubmit = async (values: FormData) => {
    try {
      setIsLoading(true);

      const response = await axios.patch(
        `/api/maintenance/mant-items/${mantItem.id}`,
        values
      );
      const updatedMantItem = response.data;

      onEditMantItem(updatedMantItem);
      setIsOpen(false);
      form.reset();

      toast({
        title: 'Item de Mantenimiento actualizado',
        description: `El item "${updatedMantItem.name}" fue actualizado exitosamente.`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating mant item:', error);

      let errorMessage =
        'Algo salió mal al actualizar el item de mantenimiento';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          errorMessage = 'Ya existe un item con este nombre';
        } else if (error.response?.status === 400) {
          errorMessage = 'Datos inválidos, por favor revise los campos';
        } else if (error.response?.status === 401) {
          errorMessage = 'No autorizado para actualizar items de mantenimiento';
        } else if (error.response?.status === 404) {
          errorMessage = 'El item de mantenimiento no fue encontrado';
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Item de Mantenimiento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Item</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Cambio de aceite, Revisión frenos..."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción detallada del mantenimiento..."
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

            {/* Tipo de Mantenimiento */}
            <FormField
              control={form.control}
              name="mantType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Mantenimiento</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de mantenimiento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
                      <SelectItem value="PREDICTIVE">Predictivo</SelectItem>
                      <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                      <SelectItem value="EMERGENCY">Emergencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Item */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Item</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || 'ACTION'}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTION">
                        Acción (inspección, revisión)
                      </SelectItem>
                      <SelectItem value="PART">
                        Repuesto (filtro, aceite)
                      </SelectItem>
                      <SelectItem value="SERVICE">
                        Servicio externo completo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoría */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading || isLoadingCategories}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingCategories
                              ? 'Cargando categorías...'
                              : 'Seleccione una categoría'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mantCategories.length === 0 && !isLoadingCategories ? (
                        <SelectItem value="no-categories" disabled>
                          No hay categorías disponibles
                        </SelectItem>
                      ) : (
                        mantCategories.map((category: MantCategory) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={isLoading || isLoadingCategories}>
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
