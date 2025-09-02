'use client';

import { useState } from 'react';
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
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formSchema } from './FormEditCategory.form';
import { FormEditCategoryProps } from './FormEditCategory.types';

export function FormEditCategory({
  isOpen,
  setIsOpen,
  category,
  onEditCategory,
}: FormEditCategoryProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category.name,
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const response = await axios.patch(
        `/api/maintenance/mant-categories/${category.id}`,
        values
      );

      const updatedCategory = response.data;

      onEditCategory(updatedCategory);
      setIsOpen(false);
      form.reset();
      toast({
        title: 'Categoria actualizada',
        description: 'La Categoria fue actualizada exitosamente',
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating Category:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast({
            title: 'No autorizado',
            description: 'Debes iniciar sesión para editar Categorias',
            variant: 'destructive',
          });
          return;
        }

        if (error.response?.status === 409) {
          toast({
            title: 'Categoria duplicada',
            description: 'Ya existe una Categoria con ese nombre',
            variant: 'destructive',
          });
          return;
        }

        if (error.response?.status === 400) {
          toast({
            title: 'Datos inválidos',
            description: 'Por favor verifica los datos ingresados',
            variant: 'destructive',
          });
          return;
        }

        if (error.response?.status === 404) {
          toast({
            title: 'Categoria no encontrada',
            description: 'La Categoria que intentas editar no existe',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Error al actualizar Categoria',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingresa el nombre de la Categoria"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Actualizando...' : 'Actualizar Categoria'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
