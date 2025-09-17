"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formSchema } from "./FormEditTechnician.form";
import { FormEditTechnicianProps } from "./FormEditTechnician.types";
import { TECHNICIAN_SPECIALTIES } from "@/lib/constants/specialties";

export function FormEditTechnician({
  isOpen,
  setIsOpen,
  onEditTechnician,
  defaultValues,
}: FormEditTechnicianProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialty: "",
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        name: defaultValues.name,
        email: defaultValues.email || "",
        phone: defaultValues.phone || "",
        specialty: defaultValues.specialty || "",
      });
    }
  }, [defaultValues, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.put(`/api/people/technicians/${defaultValues.id}`, {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        specialty: values.specialty || null,
      });

      onEditTechnician(response.data);
      setIsOpen(false);
      
      toast({
        title: "Técnico actualizado!",
        description: "El técnico fue actualizado exitosamente.",
      });

      router.refresh();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          toast({
            title: "Error",
            description: "Ya existe un técnico con ese nombre",
            variant: "destructive",
          });
          return;
        }
        if (error.response?.status === 404) {
          toast({
            title: "Error",
            description: "Técnico no encontrado",
            variant: "destructive",
          });
          return;
        }
      }
      toast({
        title: "Algo salió mal",
        description: "No se pudo actualizar el técnico",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Técnico</DialogTitle>
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
                    <Input placeholder="Ingrese el teléfono (opcional)" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una especialidad (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin especialidad</SelectItem>
                      {TECHNICIAN_SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty.value} value={specialty.value}>
                          {specialty.label}
                        </SelectItem>
                      ))}
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
              >
                Cancelar
              </Button>
              <Button type="submit">Actualizar Técnico</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}