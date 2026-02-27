'use client';

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
import { formSchema } from './FormEditLine.form';
import { useRouter } from 'next/navigation';
import { FormEditLineProps } from './FormEditLine.types';
import { useEffect, useState } from 'react';

type VehicleBrand = {
  id: string;
  name: string;
};

export function FormEditLine({
  isOpen,
  setIsOpen,
  line,
  onEditLine,
}: FormEditLineProps) {
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: line.name,
      brandId: line.brandId,
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  //* fetch Brands of Vehicles from Database
  useEffect(() => {
    const fetchingBrands = async () => {
      try {
        const response = await axios.get(`/api/vehicles/brands`);
        setVehicleBrands(response.data);
      } catch (error) {
        console.log('Error al cargar las marcas de vehículos', error);
      }
    };

    fetchingBrands();
  }, []);

  //* Reset form when line changes
  useEffect(() => {
    if (line) {
      form.reset({
        name: line.name,
        brandId: line.brandId,
      });
    }
  }, [line, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.patch(
        `/api/vehicles/lines/${line.id}`,
        values
      );
      const updatedLine = response.data;
      onEditLine(updatedLine);
      setIsOpen(false);
      form.reset();
      toast({
        title: 'Linea actualizada',
        description: 'La linea fue actualizada exitosamente.',
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating linea:', error);
      toast({
        title: 'Error updating linea',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Linea</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre: </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ------------ Carga de Marcas ---------------*/}

            <FormField
              control={form.control}
              name="brandId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca de Vehículo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value?.toString() || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una marca" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleBrands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Actualizar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
