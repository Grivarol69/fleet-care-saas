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
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { formSchema } from "./FormAdd.form";
import { FormAddBrandProps } from "./FormAddBrand.types";

export function FormAddBrand({
  isOpen,
  setIsOpen,
  onAddBrand,
}: FormAddBrandProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`/api/vehicles/brands`, values);

      const newBrand = response.data;

      onAddBrand(newBrand);
      setIsOpen(false);
      form.reset();
      toast({
        title: "Marca creada",
        description: "La nueva marca fue creada exitosamente",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error creating brand:", error);

      // Manejo específico de errores
      if (error.response?.status === 401) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para crear marcas",
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

      toast({
        title: "Error al crear marca",
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
          <DialogTitle>Agregar Nueva Marca</DialogTitle>
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
                {isLoading ? "Creando..." : "Crear Marca"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
