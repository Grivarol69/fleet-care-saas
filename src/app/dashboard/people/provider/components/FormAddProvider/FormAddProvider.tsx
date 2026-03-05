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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { formSchema } from './FormAddProvider.form';
import { FormAddProviderProps } from './FormAddProvider.types';
import { PROVIDER_SPECIALTIES } from '@/lib/constants/specialties';

export function FormAddProvider({
  isOpen,
  setIsOpen,
  onAddProvider,
}: FormAddProviderProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      specialty: '',
      nit: '',
      siigoIdType: '',
      siigoPersonType: '',
      stateCode: '',
      cityCode: '',
      fiscalResponsibilities: [],
      vatResponsible: false,
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.post(`/api/people/providers`, {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        specialty:
          values.specialty === 'none' ? null : values.specialty || null,
        nit: values.nit || null,
        siigoIdType: values.siigoIdType || null,
        siigoPersonType: values.siigoPersonType || null,
        stateCode: values.stateCode || null,
        cityCode: values.cityCode || null,
        fiscalResponsibilities: values.fiscalResponsibilities || [],
        vatResponsible: values.vatResponsible,
      });

      onAddProvider(response.data);
      setIsOpen(false);
      form.reset();

      toast({
        title: 'Proveedor creado!',
        description: 'El proveedor fue creado exitosamente.',
      });

      router.refresh();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          toast({
            title: 'Error',
            description: 'Ya existe un proveedor con ese nombre',
            variant: 'destructive',
          });
          return;
        }
      }
      toast({
        title: 'Algo salió mal',
        description: 'No se pudo crear el proveedor',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ingrese la dirección (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una especialidad (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin especialidad</SelectItem>
                      {PROVIDER_SPECIALTIES.map(specialty => (
                        <SelectItem
                          key={specialty.value}
                          value={specialty.value}
                        >
                          {specialty.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 rounded-md border p-4 bg-muted/20">
              <h4 className="text-sm font-semibold">Datos DIAN (requeridos para Siigo)</h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIT</FormLabel>
                      <FormControl>
                        <Input placeholder="Sin guiones ni DV" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="siigoIdType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Documento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NIT">NIT</SelectItem>
                          <SelectItem value="CC">Cédula Ciudadanía</SelectItem>
                          <SelectItem value="CE">Cédula Extranjería</SelectItem>
                          <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="siigoPersonType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Persona</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERSON">Natural</SelectItem>
                          <SelectItem value="COMPANY">Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vatResponsible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-[68px]">
                      <div className="space-y-0.5">
                        <FormLabel>Responsable IVA</FormLabel>
                      </div>
                      <FormControl>
                        {/* @ts-ignore */}
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stateCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código DANE Depto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cityCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código DANE Mcpio</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fiscalResponsibilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsabilidades Fiscales (Ej: R-99-PN)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R-99-PN, O-13..."
                        value={field.value?.join(', ') || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val.split(',').map(s => s.trim()).filter(Boolean));
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Separadas por coma</p>
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
              >
                Cancelar
              </Button>
              <Button type="submit">Crear Proveedor</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
