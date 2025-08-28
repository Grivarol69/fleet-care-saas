"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { UploadButton } from "@/lib/uploadthing";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { FormAddDocumentProps } from "../SharedTypes/SharedTypes";
import { DocumentType } from "@prisma/client";

const formSchema = z.object({
  type: z.nativeEnum(DocumentType),
  fileName: z.string().min(1, "El número de documento es requerido"),
  fileUrl: z.string().min(1, "Debe subir un archivo"),
  expiryDate: z.date().optional(),
});

export function FormAddDocument({
  isOpen,
  setIsOpen,
  vehiclePlate,
  onAddDocument,
}: FormAddDocumentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fileName: "",
      fileUrl: "",
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      const documentData = {
        ...values,
        vehiclePlate,
        expiryDate: values.expiryDate || null,
      };

      const response = await axios.post(
        "/api/vehicles/documents",
        documentData
      );

      onAddDocument(response.data);
      setIsOpen(false);
      form.reset();
      setFileUploaded(false);

      toast({
        title: "¡Documento creado!",
        description: "El documento ha sido registrado exitosamente",
      });

      router.refresh();
    } catch (error) {
      console.error("Error creating document:", error);
      let description = "No se pudo crear el documento";
      if (axios.isAxiosError(error) && error.response?.data) {
        description = error.response.data;
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const documentTypes = Object.values(DocumentType).map(type => ({
    value: type,
    label: type.charAt(0) + type.slice(1).toLowerCase().replace("_", " ")
  }));


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar Documento - {vehiclePlate}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de Documento */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Número de Documento */}
            <FormField
              control={form.control}
              name="fileName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Documento *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 123456789"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload de Archivo */}
            <FormField
              control={form.control}
              name="fileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Documento o Imagen *</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {!fileUploaded ? (
                        <UploadButton
                          endpoint="documentUploader"
                          onClientUploadComplete={(res) => {
                            if (res?.[0]?.url) {
                              field.onChange(res[0].url);
                              setFileUploaded(true);
                              toast({
                                title: "¡Archivo subido!",
                                description:
                                  "El archivo se ha cargado correctamente",
                              });
                            }
                          }}
                          onUploadError={(error) => {
                            toast({
                              title: "Error al subir archivo",
                              description: error.message,
                              variant: "destructive",
                            });
                          }}
                          className="ut-button:w-full ut-button:bg-primary ut-button:hover:bg-primary/90"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                          <span className="text-sm text-green-700 font-medium">
                            ✓ Archivo subido correctamente
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              field.onChange("");
                              setFileUploaded(false);
                            }}
                          >
                            Cambiar archivo
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de Vencimiento */}
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Vencimiento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  form.reset();
                  setFileUploaded(false);
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !fileUploaded}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Creando..." : "Crear Documento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
