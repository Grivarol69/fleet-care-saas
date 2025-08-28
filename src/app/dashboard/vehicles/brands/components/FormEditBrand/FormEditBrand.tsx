"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";
import { useRouter } from "next/navigation";
import { formSchema } from "./FormEditBrand.form";
import { FormEditBrandProps } from "./FormEditBrand.types";

export function FormEditBrand({
  isOpen,
  setIsOpen,
  brand,
  onEditBrand,
}: FormEditBrandProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: brand.name,
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const response = await axios.patch(
        `/api/vehicles/brands/${brand.id}`,
        values
      );

      const updatedBrand = response.data;

      onEditBrand(updatedBrand);
      setIsOpen(false);
      form.reset();
      toast({
        title: "Marca actualizada",
        description: "La marca fue actualizada exitosamente",
      });

      router.refresh();
    } catch (error) {
      console.error("Error updating brand:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast({
            title: "No autorizado",
            description: "Debes iniciar sesión para editar marcas",
            variant: "destructive",
          });
          return;
        }

        if (error.response?.status === 409) {
          toast({
            title: "Marca duplicada",
            description: "Ya existe una marca con ese nombre",
            variant: "destructive",
          });
          return;
        }

        if (error.response?.status === 400) {
          toast({
            title: "Datos inválidos",
            description: "Por favor verifica los datos ingresados",
            variant: "destructive",
          });
          return;
        }

        if (error.response?.status === 404) {
          toast({
            title: "Marca no encontrada",
            description: "La marca que intentas editar no existe",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Error al actualizar marca",
        description: "Por favor intenta de nuevo más tarde",
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
          <DialogTitle>Editar Marca</DialogTitle>
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
                      placeholder="Ingresa el nombre de la marca"
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
                {isLoading ? "Actualizando..." : "Actualizar Marca"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
