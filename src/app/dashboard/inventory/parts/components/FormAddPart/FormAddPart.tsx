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
import { formSchema, FormAddPartValues } from './FormAddPart.form';
import { FormAddPartProps } from './FormAddPart.types';
import { PART_CATEGORIES, PART_UNITS } from '../constants';

export function FormAddPart({
  isOpen,
  setIsOpen,
  onAddPart,
}: FormAddPartProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormAddPartValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      description: '',
      category: '',
      subcategory: '',
      unit: 'UNIDAD',
      referencePrice: '',
    },
  });

  const onSubmit = async (values: FormAddPartValues) => {
    try {
      setIsLoading(true);

      const payload = {
        ...values,
        referencePrice:
          values.referencePrice === '' || values.referencePrice === undefined
            ? undefined
            : Number(values.referencePrice),
        subcategory: values.subcategory || undefined,
      };

      const response = await axios.post('/api/inventory/parts', payload);

      onAddPart(response.data);
      setIsOpen(false);
      form.reset();

      toast({
        title: 'Autoparte creada',
        description: 'La autoparte fue registrada exitosamente',
      });

      router.refresh();
    } catch (error) {
      console.error('Error creating part:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast({
            title: 'No autorizado',
            description: 'Debés iniciar sesión para crear autopartes',
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
      }

      toast({
        title: 'Error al crear autoparte',
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
          <DialogTitle>Nueva Autoparte</DialogTitle>
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
                      <Input
                        placeholder="Ej: BOSCH-123"
                        disabled={isLoading}
                        {...field}
                      />
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
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná" />
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
                    <Input
                      placeholder="Ej: Filtro de aceite motor 4 cilindros"
                      disabled={isLoading}
                      {...field}
                    />
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
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná" />
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
                {isLoading ? 'Creando...' : 'Crear Autoparte'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
