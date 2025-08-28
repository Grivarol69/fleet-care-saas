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
import { formSchema } from "./FormAddType.form";
import { FormAddTypeProps } from "./FormAddType.types";

export function FormAddType({
  isOpen,
  setIsOpen,
  onAddType,
}: FormAddTypeProps) {
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
      const response = await axios.post(`/api/vehicles/types`, values);

      const newType = response.data;

      onAddType(newType);
      setIsOpen(false);
      form.reset();
      toast({
        title: "Tipo creado",
        description: "un nuevo Tipo fue creado exitosamente",
      });

      router.refresh();
    } catch (error) {
      console.error("Error creating Type:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast({
            title: "No autorizado",
            description: "Debes iniciar sesión para crear tipos de vehiculos",
            variant: "destructive",
          });
          return;
        }

        if (error.response?.status === 409) {
          toast({
            title: "Tipo de Vehiculo duplicado",
            description: "Ya existe un tipo con ese nombre",
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
      }

      toast({
        title: "Error al crear tipo de vehìculo",
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
          <DialogTitle>Agregar Nuevo Tipo de Vehiculo</DialogTitle>
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
                      placeholder="Ingresa el nombre del Tipo"
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
                {isLoading ? "Creando..." : "Crear Tipo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
