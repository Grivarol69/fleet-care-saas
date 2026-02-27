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
import {
  FormAddMantTemplateProps,
  VehicleBrand,
  VehicleLine,
} from './FormAddMantTemplate.types';

// Schema para MantTemplate
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres',
  }),
  description: z.string().optional(),
  vehicleBrandId: z.string().min(1).min(1, {
    message: 'Debe seleccionar una marca de vehículo',
  }),
  vehicleLineId: z.string().min(1).min(1, {
    message: 'Debe seleccionar una línea de vehículo',
  }),
});

type FormData = z.infer<typeof formSchema>;

export function FormAddMantTemplate({
  isOpen,
  setIsOpen,
  onAddTemplate,
}: FormAddMantTemplateProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleLines, setVehicleLines] = useState<VehicleLine[]>([]);
  const [filteredLines, setFilteredLines] = useState<VehicleLine[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      vehicleBrandId: '',
      vehicleLineId: '',
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  // Watch para filtrar líneas cuando cambia la marca
  const selectedBrandId = form.watch('vehicleBrandId');

  // Fetch brands when dialog opens
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsLoadingBrands(true);
        const response = await axios.get('/api/vehicles/brands');
        setVehicleBrands(response.data);
      } catch (error) {
        console.error('Error al cargar las marcas:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las marcas de vehículos',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingBrands(false);
      }
    };

    if (isOpen) {
      fetchBrands();
    }
  }, [isOpen, toast]);

  // Fetch lines when dialog opens
  useEffect(() => {
    const fetchLines = async () => {
      try {
        setIsLoadingLines(true);
        const response = await axios.get('/api/vehicles/lines');
        setVehicleLines(response.data);
      } catch (error) {
        console.error('Error al cargar las líneas:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las líneas de vehículos',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingLines(false);
      }
    };

    if (isOpen) {
      fetchLines();
    }
  }, [isOpen, toast]);

  // Filter lines by selected brand
  useEffect(() => {
    if (selectedBrandId && selectedBrandId !== '') {
      const filtered = vehicleLines.filter(
        line => line.brandId === selectedBrandId
      );
      setFilteredLines(filtered);

      // Reset line selection if current selected line doesn't belong to new brand
      const currentLineId = form.getValues('vehicleLineId');
      const isCurrentLineValid = filtered.some(
        line => line.id === currentLineId
      );
      if (currentLineId && currentLineId !== '' && !isCurrentLineValid) {
        form.setValue('vehicleLineId', '');
      }
    } else {
      setFilteredLines([]);
      form.setValue('vehicleLineId', '');
    }
  }, [selectedBrandId, vehicleLines, form]);

  const onSubmit = async (values: FormData) => {
    try {
      setIsLoading(true);

      const response = await axios.post(
        '/api/maintenance/mant-template',
        values
      );
      const newTemplate = response.data;

      onAddTemplate(newTemplate);
      setIsOpen(false);
      form.reset();

      toast({
        title: '¡Template de Mantenimiento creado!',
        description: `El template "${newTemplate.name}" fue creado exitosamente.`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error creating template:', error);

      let errorMessage = 'Algo salió mal al crear el template de mantenimiento';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          errorMessage =
            'Ya existe un template con este nombre para esta marca/línea';
        } else if (error.response?.status === 400) {
          errorMessage = 'Datos inválidos, por favor revise los campos';
        } else if (error.response?.status === 401) {
          errorMessage = 'No autorizado para crear templates de mantenimiento';
        } else if (error.response?.status === 404) {
          errorMessage = 'La marca o línea seleccionada no existe';
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
      setFilteredLines([]);
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Template de Mantenimiento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
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
                <FormItem>
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
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading || isLoadingBrands}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingBrands
                              ? 'Cargando marcas...'
                              : 'Seleccione una marca'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleBrands.length === 0 && !isLoadingBrands ? (
                        <SelectItem value="no-brands" disabled>
                          No hay marcas disponibles
                        </SelectItem>
                      ) : (
                        vehicleBrands.map((brand: VehicleBrand) => (
                          <SelectItem
                            key={brand.id}
                            value={brand.id.toString()}
                          >
                            {brand.name}
                          </SelectItem>
                        ))
                      )}
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
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={
                      isLoading ||
                      isLoadingLines ||
                      !selectedBrandId ||
                      selectedBrandId === ''
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedBrandId || selectedBrandId === ''
                              ? 'Primero seleccione una marca'
                              : isLoadingLines
                                ? 'Cargando líneas...'
                                : 'Seleccione una línea'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredLines.length === 0 &&
                      !isLoadingLines &&
                      selectedBrandId !== '' ? (
                        <SelectItem value="no-lines" disabled>
                          No hay líneas disponibles para esta marca
                        </SelectItem>
                      ) : (
                        filteredLines.map((line: VehicleLine) => (
                          <SelectItem key={line.id} value={line.id.toString()}>
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isLoadingBrands || isLoadingLines}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Creando...' : 'Crear Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
