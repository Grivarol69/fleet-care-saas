'use client';

import { useEffect, useState, useCallback } from 'react';
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
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FormEditMantTemplateProps, VehicleBrand, VehicleLine } from './FormEditMantTemplate.types';
import { TemplateItemsList } from './components/TemplateItemsList';
import { PackageList } from './components/PackageList';

// Schema para MantTemplate
const formSchema = z.object({
  id: z.number(),
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres',
  }),
  description: z.string().optional(),
  vehicleBrandId: z.number().min(1, {
    message: 'Debe seleccionar una marca de vehículo',
  }),
  vehicleLineId: z.number().min(1, {
    message: 'Debe seleccionar una línea de vehículo',
  }),
});

type FormData = z.infer<typeof formSchema>;

export function FormEditMantTemplate({
  isOpen,
  setIsOpen,
  template,
  onEditTemplate,
}: FormEditMantTemplateProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleLines, setVehicleLines] = useState<VehicleLine[]>([]);
  const [filteredLines, setFilteredLines] = useState<VehicleLine[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: template.id,
      name: template.name,
      description: template.description || '',
      vehicleBrandId: template.vehicleBrandId,
      vehicleLineId: template.vehicleLineId,
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  // Watch para filtrar líneas cuando cambia la marca
  const selectedBrandId = form.watch('vehicleBrandId');

  const fetchData = useCallback(async () => {
    try {
      const [brandsRes, linesRes] = await Promise.all([
        axios.get('/api/vehicles/brands'),
        axios.get('/api/vehicles/lines'),
      ]);

      setVehicleBrands(brandsRes.data);
      setVehicleLines(linesRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del formulario',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Cargar datos cuando se abre el dialog
  useEffect(() => {
    if (isOpen) {
      fetchData();
      form.reset({
        id: template.id,
        name: template.name,
        description: template.description || '',
        vehicleBrandId: template.vehicleBrandId,
        vehicleLineId: template.vehicleLineId,
      });
    }
  }, [isOpen, template, form, fetchData]);

  // Filter lines by selected brand
  useEffect(() => {
    if (selectedBrandId && selectedBrandId > 0) {
      const filtered = vehicleLines.filter(line => line.brandId === selectedBrandId);
      setFilteredLines(filtered);
      
      // Reset line selection if current selected line doesn't belong to new brand
      const currentLineId = form.getValues('vehicleLineId');
      const isCurrentLineValid = filtered.some(line => line.id === currentLineId);
      if (currentLineId > 0 && !isCurrentLineValid) {
        form.setValue('vehicleLineId', 0);
      }
    } else {
      setFilteredLines([]);
      form.setValue('vehicleLineId', 0);
    }
  }, [selectedBrandId, vehicleLines, form]);

  const onSubmit = async (values: FormData) => {
    try {
      setIsLoading(true);

      const response = await axios.patch(`/api/maintenance/mant-template/${template.id}`, values);
      const updatedTemplate = response.data;

      onEditTemplate(updatedTemplate);
      setIsOpen(false);

      toast({
        title: '¡Template actualizado!',
        description: `El template "${updatedTemplate.name}" ha sido actualizado exitosamente.`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating template:', error);

      let errorMessage = 'Algo salió mal al actualizar el template';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          errorMessage = 'Ya existe un template con este nombre para esta marca/línea';
        } else if (error.response?.status === 400) {
          errorMessage = 'Datos inválidos, por favor revise los campos';
        } else if (error.response?.status === 401) {
          errorMessage = 'No autorizado para actualizar templates';
        } else if (error.response?.status === 404) {
          errorMessage = 'Template, marca o línea no encontrada';
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Template - {template.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalles del Template</TabsTrigger>
            <TabsTrigger value="packages">Paquetes</TabsTrigger>
            <TabsTrigger value="tasks">Items Individuales</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nombre del Template</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Plan Toyota Hilux Básico"
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
                      <FormItem className="md:col-span-2">
                        <FormLabel>Descripción (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descripción del plan de mantenimiento..."
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

                  {/* Marca de Vehículo */}
                  <FormField
                    control={form.control}
                    name="vehicleBrandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca de Vehículo</FormLabel>
                        <Select
                          onValueChange={value => field.onChange(Number(value))}
                          value={field.value > 0 ? field.value.toString() : ''}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una marca" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicleBrands.map((brand: VehicleBrand) => (
                              <SelectItem
                                key={brand.id}
                                value={brand.id.toString()}
                              >
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Línea de Vehículo */}
                  <FormField
                    control={form.control}
                    name="vehicleLineId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Línea de Vehículo</FormLabel>
                        <Select
                          onValueChange={value => field.onChange(Number(value))}
                          value={field.value > 0 ? field.value.toString() : ''}
                          disabled={isLoading || !selectedBrandId || selectedBrandId === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !selectedBrandId || selectedBrandId === 0
                                    ? 'Primero seleccione una marca'
                                    : 'Seleccione una línea'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredLines.length === 0 && selectedBrandId > 0 ? (
                              <SelectItem value="no-lines" disabled>
                                No hay líneas disponibles para esta marca
                              </SelectItem>
                            ) : (
                              filteredLines.map((line: VehicleLine) => (
                                <SelectItem
                                  key={line.id}
                                  value={line.id.toString()}
                                >
                                  {line.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
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
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Actualizando...' : 'Actualizar Template'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="packages" className="mt-6">
            <div className="min-h-[600px]">
              <PackageList templateId={template.id} />
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <div className="min-h-[600px]">
              <TemplateItemsList templateId={template.id} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}