'use client';

import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Loader2, Settings, List } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { FormEditPackageProps } from './FormEditPackage.types';
import { PackageItemList } from './components/PackageItemList';

// Schema de validación para el paquete
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres',
  }),
  triggerKm: z.number().min(1, {
    message: 'El kilometraje debe ser mayor a 0',
  }),
  description: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
  estimatedTime: z.number().min(0).max(24).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  packageType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE']),
});

type FormData = z.infer<typeof formSchema>;

export function FormEditPackage({
  isOpen,
  setIsOpen,
  packageData,
  onEditPackage,
}: FormEditPackageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      triggerKm: 0,
      description: '',
      estimatedCost: 0,
      estimatedTime: 0,
      priority: 'MEDIUM',
      packageType: 'PREVENTIVE',
    },
  });

  // Cargar datos del paquete cuando se abre el modal
  useEffect(() => {
    if (isOpen && packageData) {
      form.reset({
        name: packageData.name,
        triggerKm: packageData.triggerKm,
        description: packageData.description || '',
        estimatedCost: packageData.estimatedCost || 0,
        estimatedTime: packageData.estimatedTime || 0,
        priority: packageData.priority,
        packageType: packageData.packageType,
      });
      setActiveTab('general');
    }
  }, [isOpen, packageData, form]);

  const onSubmit = async (values: FormData) => {
    if (!packageData) return;

    try {
      setIsLoading(true);

      const payload = {
        ...values,
        description: values.description || null,
        estimatedCost: values.estimatedCost || null,
        estimatedTime: values.estimatedTime || null,
      };

      await axios.put(`/api/maintenance/packages/${packageData.id}`, payload);

      toast({
        title: '¡Paquete actualizado!',
        description: `El paquete "${values.name}" ha sido actualizado exitosamente.`,
      });

      onEditPackage();
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating package:', error);

      let errorMessage = 'Algo salió mal al actualizar el paquete';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          errorMessage =
            'Ya existe un paquete para este kilometraje en este template';
        } else if (error.response?.status === 400) {
          errorMessage = 'Datos inválidos, por favor revise los campos';
        } else if (error.response?.status === 401) {
          errorMessage = 'No autorizado para actualizar paquetes';
        } else if (error.response?.status === 404) {
          errorMessage = 'Paquete no encontrado';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
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

  if (!packageData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Editar Paquete: {packageData.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Items ({packageData.packageItems?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kilometraje */}
                  <FormField
                    control={form.control}
                    name="triggerKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kilometraje *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="5000"
                            {...field}
                            onChange={e =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Nombre */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Paquete *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Mantenimiento 5,000 km"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
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
                            placeholder="125000"
                            {...field}
                            onChange={e =>
                              field.onChange(
                                parseFloat(e.target.value) || undefined
                              )
                            }
                            disabled={isLoading}
                          />
                        </FormControl>
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
                            step="0.5"
                            placeholder="2.5"
                            {...field}
                            onChange={e =>
                              field.onChange(
                                parseFloat(e.target.value) || undefined
                              )
                            }
                            disabled={isLoading}
                          />
                        </FormControl>
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

                  {/* Tipo de Paquete */}
                  <FormField
                    control={form.control}
                    name="packageType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Mantenimiento</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PREVENTIVE">
                              Preventivo
                            </SelectItem>
                            <SelectItem value="CORRECTIVE">
                              Correctivo
                            </SelectItem>
                            <SelectItem value="PREDICTIVE">
                              Predictivo
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Descripción */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Descripción (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descripción del paquete de mantenimiento..."
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

                {/* Botones */}
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isLoading ? 'Actualizando...' : 'Actualizar Paquete'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="items" className="mt-6">
            <PackageItemList packageId={packageData.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
