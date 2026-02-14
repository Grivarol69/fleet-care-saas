'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadButton } from '@/lib/uploadthing';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { DocumentsList } from './components/DocumentsList';
import { Loader2, X } from 'lucide-react';

// Schema corregido
const formSchema = z.object({
  id: z.number(),
  photo: z.string().min(1, 'La imagen es requerida'),
  licensePlate: z.string().min(3, 'La placa debe tener al menos 3 caracteres'),
  typePlate: z.enum(['PARTICULAR', 'PUBLICO']),
  brandId: z.number().min(1, 'Seleccione una marca'),
  lineId: z.number().min(1, 'Seleccione una línea'),
  typeId: z.number().min(1, 'Seleccione un tipo'),
  mileage: z.number().min(0, 'El kilometraje debe ser positivo'),
  cylinder: z.number().optional(),
  bodyWork: z.string().optional(),
  engineNumber: z.string().optional(),
  chasisNumber: z.string().optional(),
  ownerCard: z.string().optional(),
  color: z.string().min(1, 'El color es requerido'),
  owner: z.enum(['OWN', 'LEASED', 'RENTED']),
  year: z
    .number()
    .min(1900, 'Ingrese un año válido')
    .max(new Date().getFullYear() + 1),
  situation: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE']),
});

type VehicleBrand = {
  id: number;
  name: string;
};

type VehicleLine = {
  id: number;
  name: string;
};

type VehicleType = {
  id: number;
  name: string;
};

interface FleetVehicle {
  id: number;
  photo: string | null;
  licensePlate: string;
  typePlate: 'PARTICULAR' | 'PUBLICO';
  brandId: number;
  lineId: number;
  typeId: number;
  mileage: number;
  cylinder?: number | null;
  bodyWork?: string | null;
  engineNumber?: string | null;
  chasisNumber?: string | null;
  ownerCard?: string | null;
  color: string;
  owner: 'OWN' | 'LEASED' | 'RENTED';
  year: number;
  situation: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
}

interface FormEditFleetVehicleProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  fleetVehicle: FleetVehicle;
  onEditFleetVehicle: (fleetVehicle: FleetVehicle) => void;
}

export function FormEditFleetVehicle({
  isOpen,
  setIsOpen,
  fleetVehicle,
  onEditFleetVehicle,
}: FormEditFleetVehicleProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(
    fleetVehicle.photo
  );
  const [isLoading, setIsLoading] = useState(false);

  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleLines, setVehicleLines] = useState<VehicleLine[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: fleetVehicle.id,
      photo: fleetVehicle.photo || '',
      licensePlate: fleetVehicle.licensePlate,
      typePlate: fleetVehicle.typePlate,
      brandId: fleetVehicle.brandId,
      lineId: fleetVehicle.lineId,
      typeId: fleetVehicle.typeId,
      mileage: fleetVehicle.mileage,
      cylinder: fleetVehicle.cylinder || 0,
      bodyWork: fleetVehicle.bodyWork || '',
      engineNumber: fleetVehicle.engineNumber || '',
      chasisNumber: fleetVehicle.chasisNumber || '',
      ownerCard: fleetVehicle.ownerCard || '',
      color: fleetVehicle.color,
      owner: fleetVehicle.owner,
      year: fleetVehicle.year,
      situation: fleetVehicle.situation,
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [brandsRes, linesRes, typesRes] = await Promise.all([
        axios.get('/api/vehicles/brands'),
        axios.get('/api/vehicles/lines'),
        axios.get('/api/vehicles/types'),
      ]);

      setVehicleBrands(brandsRes.data);
      setVehicleLines(linesRes.data);
      setVehicleTypes(typesRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del formulario',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setPreviewImage(fleetVehicle.photo);
      form.reset({
        id: fleetVehicle.id,
        photo: fleetVehicle.photo || '',
        licensePlate: fleetVehicle.licensePlate,
        typePlate: fleetVehicle.typePlate,
        brandId: fleetVehicle.brandId,
        lineId: fleetVehicle.lineId,
        typeId: fleetVehicle.typeId,
        mileage: fleetVehicle.mileage,
        cylinder: fleetVehicle.cylinder || 0,
        bodyWork: fleetVehicle.bodyWork || '',
        engineNumber: fleetVehicle.engineNumber || '',
        chasisNumber: fleetVehicle.chasisNumber || '',
        ownerCard: fleetVehicle.ownerCard || '',
        color: fleetVehicle.color,
        owner: fleetVehicle.owner,
        year: fleetVehicle.year,
        situation: fleetVehicle.situation,
      });
    }
  }, [isOpen, fleetVehicle, form, fetchData]);

  const handleRemoveImage = () => {
    setPreviewImage(null);
    form.setValue('photo', '', { shouldValidate: true });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      const formattedValues = {
        ...values,
        licensePlate: values.licensePlate.toUpperCase(),
        color: values.color.toUpperCase(),
      };

      const response = await axios.patch(
        `/api/vehicles/vehicles/${fleetVehicle.id}`,
        formattedValues
      );

      onEditFleetVehicle(response.data);
      setIsOpen(false);

      toast({
        title: '¡Vehículo actualizado!',
        description: 'El vehículo ha sido actualizado exitosamente',
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      let description = 'No se pudo actualizar el vehículo';
      if (axios.isAxiosError(error) && error.response?.data) {
        description = error.response.data;
      }
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Vehículo - {fleetVehicle.licensePlate}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalles del Vehículo</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Columna principal con campos */}
                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Placa */}
                    <FormField
                      control={form.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Placa Vehículo *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ABC123"
                              {...field}
                              onChange={e =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tipo de Placa */}
                    <FormField
                      control={form.control}
                      name="typePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Placa *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger disabled={isLoading}>
                                <SelectValue placeholder="Seleccione tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PARTICULAR">
                                Particular
                              </SelectItem>
                              <SelectItem value="PUBLICO">Público</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Marca */}
                    <FormField
                      control={form.control}
                      name="brandId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca *</FormLabel>
                          <Select
                            onValueChange={value =>
                              field.onChange(Number(value))
                            }
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger disabled={isLoading}>
                                <SelectValue placeholder="Seleccione marca" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicleBrands.map(brand => (
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

                    {/* Línea */}
                    <FormField
                      control={form.control}
                      name="lineId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Línea *</FormLabel>
                          <Select
                            onValueChange={value =>
                              field.onChange(Number(value))
                            }
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger disabled={isLoading}>
                                <SelectValue placeholder="Seleccione línea" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicleLines.map(line => (
                                <SelectItem
                                  key={line.id}
                                  value={line.id.toString()}
                                >
                                  {line.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tipo */}
                    <FormField
                      control={form.control}
                      name="typeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo *</FormLabel>
                          <Select
                            onValueChange={value =>
                              field.onChange(Number(value))
                            }
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger disabled={isLoading}>
                                <SelectValue placeholder="Seleccione tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicleTypes.map(type => (
                                <SelectItem
                                  key={type.id}
                                  value={type.id.toString()}
                                >
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Kilometraje */}
                    <FormField
                      control={form.control}
                      name="mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kilometraje *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={e =>
                                field.onChange(Number(e.target.value))
                              }
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Color */}
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Blanco"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Año */}
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Año *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2024"
                              {...field}
                              onChange={e =>
                                field.onChange(Number(e.target.value))
                              }
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Propietario */}
                    <FormField
                      control={form.control}
                      name="owner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Propietario *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger disabled={isLoading}>
                                <SelectValue placeholder="Seleccione propietario" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="OWN">Propio</SelectItem>
                              <SelectItem value="LEASED">Arrendado</SelectItem>
                              <SelectItem value="RENTED">Rentado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Estado */}
                    <FormField
                      control={form.control}
                      name="situation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger disabled={isLoading}>
                                <SelectValue placeholder="Seleccione estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AVAILABLE">
                                Disponible
                              </SelectItem>
                              <SelectItem value="IN_USE">En uso</SelectItem>
                              <SelectItem value="MAINTENANCE">
                                Mantenimiento
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Campos opcionales */}
                    <FormField
                      control={form.control}
                      name="cylinder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cilindraje</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1600"
                              {...field}
                              onChange={e =>
                                field.onChange(
                                  Number(e.target.value) || undefined
                                )
                              }
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bodyWork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carrocería</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Sedán"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Columna de imagen */}
                  <div className="lg:col-span-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="photo"
                      render={() => (
                        <FormItem>
                          <FormLabel>Imagen del Vehículo *</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              {!previewImage ? (
                                <UploadButton
                                  endpoint="vehicleImageUploader"
                                  onClientUploadComplete={res => {
                                    if (res?.[0]?.url) {
                                      const imageUrl = res[0].url;
                                      setPreviewImage(imageUrl);
                                      form.setValue('photo', imageUrl, {
                                        shouldValidate: true,
                                      });
                                      toast({
                                        title: '¡Imagen actualizada!',
                                        description:
                                          'La imagen se ha cargado correctamente',
                                      });
                                    }
                                  }}
                                  onUploadError={error => {
                                    toast({
                                      title: 'Error al subir imagen',
                                      description: error.message,
                                      variant: 'destructive',
                                    });
                                  }}
                                  className="ut-button:w-full ut-button:bg-primary ut-button:hover:bg-primary/90"
                                />
                              ) : (
                                <div className="relative">
                                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                                    {previewImage && (
                                      <Image
                                        src={previewImage}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                      />
                                    )}
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-2 right-2"
                                      onClick={handleRemoveImage}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-green-600 mt-2">
                                    ✓ Imagen cargada correctamente
                                  </p>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                    {isLoading ? 'Actualizando...' : 'Actualizar Vehículo'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <div className="min-h-[600px]">
              <DocumentsList vehiclePlate={fleetVehicle.licensePlate} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
