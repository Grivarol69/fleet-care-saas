"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// ✅ Schema corregido
const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres",
  }),
  brandId: z.number().min(1, {
    message: "Debe seleccionar una marca",
  }),
});

type VehicleBrand = {
  id: number;
  name: string;
};

// ✅ Tipo corregido según la respuesta de la API
type VehicleLine = {
  id: number;
  name: string;
  brandId: number;
  brand: {
    name: string;
  };
};

export type FormAddLineProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddLine: (line: VehicleLine) => void;
};

export function FormAddLine({
  isOpen,
  setIsOpen,
  onAddLine,
}: FormAddLineProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      brandId: 0, // Se validará que sea > 0
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  // ✅ Fetch mejorado con manejo de errores
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsLoadingBrands(true);
        const response = await axios.get("/api/vehicles/brands");
        setVehicleBrands(response.data);
      } catch (error) {
        console.error("Error al cargar las marcas de vehículos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las marcas de vehículos",
          variant: "destructive",
        });
      } finally {
        setIsLoadingBrands(false);
      }
    };

    if (isOpen) {
      fetchBrands();
    }
  }, [isOpen, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      const response = await axios.post("/api/vehicles/lines", values);
      console.log("response: ", response);

      const newLine: VehicleLine = response.data;

      // ✅ Llamar callback con los datos correctos
      onAddLine(newLine);

      // ✅ Limpiar y cerrar
      setIsOpen(false);
      form.reset();

      toast({
        title: "¡Línea de Vehículo creada!",
        description: `La línea "${newLine.name}" fue creada exitosamente.`,
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error creating line:", error);

      // ✅ Manejo mejorado de errores
      let errorMessage = "Algo salió mal";
      if (error.response?.status === 409) {
        errorMessage = "Esta línea ya existe para la marca seleccionada";
      } else if (error.response?.data) {
        errorMessage = error.response.data;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Nueva Línea</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Línea</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Civic, Corolla, Focus..."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brandId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca de Vehículo</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value > 0 ? field.value.toString() : ""}
                    disabled={isLoading || isLoadingBrands}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingBrands
                              ? "Cargando marcas..."
                              : "Seleccione una marca"
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
                        vehicleBrands.map((brand) => (
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

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || isLoadingBrands}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Creando..." : "Crear Línea"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
