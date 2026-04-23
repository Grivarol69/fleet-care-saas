'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';

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
import { formSchema } from './FormAddDriver.form';
import { FormAddDriverProps } from './FormAddDriver.types';

type AvailableUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

export function FormAddDriver({
  isOpen,
  setIsOpen,
  onAddDriver,
}: FormAddDriverProps) {
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      licenseNumber: '',
      licenseExpiry: '',
      userId: '',
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    axios
      .get<AvailableUser[]>('/api/people/drivers/available-users')
      .then(r => setAvailableUsers(r.data))
      .catch(() => setAvailableUsers([]));
  }, [isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.post(`/api/people/drivers`, {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        licenseNumber: values.licenseNumber || null,
        licenseExpiry: values.licenseExpiry || null,
        userId: values.userId || null,
      });

      onAddDriver(response.data);
      setIsOpen(false);
      form.reset();

      toast({
        title: 'Conductor creado!',
        description: 'El conductor fue creado exitosamente.',
      });

      router.refresh();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          toast({
            title: 'Error',
            description: 'Ya existe un conductor con ese número de licencia',
            variant: 'destructive',
          });
          return;
        }
      }
      toast({
        title: 'Algo salió mal',
        description: 'No se pudo crear el conductor',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Conductor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese el nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Ingrese el email (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingrese el teléfono (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Licencia</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingrese el número de licencia (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseExpiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimiento de Licencia</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      placeholder="Fecha de vencimiento (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {availableUsers.length > 0 && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta de acceso PWA (opcional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin cuenta vinculada" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableUsers.map(u => {
                          const fullName = [u.firstName, u.lastName]
                            .filter(Boolean)
                            .join(' ');
                          return (
                            <SelectItem key={u.id} value={u.id}>
                              {fullName || u.email}
                              {fullName ? ` · ${u.email}` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Crear Conductor</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
