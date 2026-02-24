'use client';

import { useState, useEffect } from 'react';
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
import { formSchema, FormEditPartValues } from './FormEditPart.form';
import { FormEditPartProps } from './FormEditPart.types';
import { PART_CATEGORIES, PART_UNITS } from '../constants';

export function FormEditPart({
  isOpen,
  setIsOpen,
  part,
  onEditPart,
}: FormEditPartProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormEditPartValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: part.code,
      description: part.description,
      category: part.category,
      subcategory: part.subcategory ?? '',
      unit: part.unit,
      referencePrice: part.referencePrice ? Number(part.referencePrice) : '',
    },
  });

  // Reset form when part changes
  useEffect(() => {
    form.reset({
      code: part.code,
      description: part.description,
      category: part.category,
      subcategory: part.subcategory ?? '',
      unit: part.unit,
      referencePrice: part.referencePrice ? Number(part.referencePrice) : '',
    });
  }, [part, form]);

  const onSubmit = async (values: FormEditPartValues) => {
    try {
      setIsLoading(true);

      const payload = {
        ...values,
        referencePrice:
          values.referencePrice === '' || values.referencePrice === undefined
            ? null
            : Number(values.referencePrice),
        subcategory: values.subcategory || null,
      };

      const response = await axios.patch(
        `/api/inventory/parts/${part.id}`,
        payload
      );

      onEditPart(response.data);
      setIsOpen(false);

      toast({
        title: 'Autoparte actualizada',
        description: 'Los datos fueron guardados exitosamente',
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating part:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast({
            title: 'No autorizado',
            description: 'Debés iniciar sesión para editar autopartes',
            variant: 'destructive',
          });
          return;
        }
        if (error.response?.status === 409) {
          toast({
            title: 'Código duplicado',
            description:
              error.response.data?.error ??
              'Ya existe una autoparte con ese código',
            variant: 'destructive',
          });
          return;
        }
        if (error.response?.status === 400) {
          toast({
            title: 'Datos inválidos',
            description: 'Por favor verificá los datos ingresados',
            variant: 'destructive',
          });
          return;
        }
        if (error.response?.status === 403) {
          toast({
            title: 'Sin permisos',
            description:
              error.response.data?.error ??
              'No tenés permisos para editar esta autoparte',
            variant: 'destructive',
          });
          return;
        }
        if (error.response?.status === 404) {
          toast({
            title: 'No encontrada',
            description: 'La autoparte que intentás editar no existe',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Error al actualizar',
        description: 'Por favor intentá de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Autoparte</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PART_UNITS.map(unit => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PART_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoría</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opcional"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referencePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio de Referencia</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
