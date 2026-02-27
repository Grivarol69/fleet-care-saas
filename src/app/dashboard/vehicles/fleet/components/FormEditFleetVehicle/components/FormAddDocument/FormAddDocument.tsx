'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { UploadButton } from '@/lib/uploadthing';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Sparkles } from 'lucide-react';
import {
  FormAddDocumentProps,
  DocumentTypeConfigProps,
} from '../SharedTypes/SharedTypes';
import type { DocumentOCRResult } from '@/lib/ocr/claude-vision';

const formSchema = z.object({
  documentTypeId: z.string().min(1, 'Requerido'),
  documentNumber: z.string().min(1, 'El número de documento es requerido'),
  entity: z.string().optional(),
  fileUrl: z.string().min(1, 'Debe subir un archivo'),
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
  const [ocrResult, setOcrResult] = useState<DocumentOCRResult | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeConfigProps[]>(
    []
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentNumber: '',
      entity: '',
      fileUrl: '',
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  // Fetch document types from API
  useEffect(() => {
    if (isOpen) {
      axios
        .get('/api/vehicles/document-types')
        .then(res => setDocumentTypes(res.data))
        .catch(err => console.error('Error fetching document types:', err));
    }
  }, [isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      const documentData = {
        ...values,
        vehiclePlate,
        expiryDate: values.expiryDate || null,
      };

      const response = await axios.post(
        '/api/vehicles/documents',
        documentData
      );

      onAddDocument(response.data);
      setIsOpen(false);
      form.reset();
      setFileUploaded(false);
      setOcrResult(null);

      toast({
        title: 'Documento creado!',
        description: 'El documento ha sido registrado exitosamente',
      });

      router.refresh();
    } catch (error) {
      console.error('Error creating document:', error);
      let description = 'No se pudo crear el documento';
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar Documento - {vehiclePlate}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de Documento */}
            <FormField
              control={form.control}
              name="documentTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes.map(dt => (
                        <SelectItem key={dt.id} value={dt.id.toString()}>
                          {dt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Numero de Documento */}
            <FormField
              control={form.control}
              name="documentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero de Documento *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 2508004334695000"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entidad Emisora */}
            <FormField
              control={form.control}
              name="entity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entidad Emisora</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: SURA, Seguros Equidad, Tecnimotors"
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
                          onClientUploadComplete={res => {
                            const uploaded = res?.[0];
                            if (uploaded?.url) {
                              field.onChange(uploaded.url);
                              setFileUploaded(true);

                              const sd = uploaded.serverData;
                              const confidence =
                                typeof sd?.ocrConfidence === 'number'
                                  ? sd.ocrConfidence
                                  : 0;
                              if (confidence >= 40) {
                                const ocr: DocumentOCRResult = {
                                  confidence,
                                  ...(typeof sd?.ocrDocumentNumber ===
                                    'string' && {
                                    documentNumber: sd.ocrDocumentNumber,
                                  }),
                                  ...(typeof sd?.ocrEntity === 'string' && {
                                    entity: sd.ocrEntity,
                                  }),
                                  ...(typeof sd?.ocrIssueDate === 'string' && {
                                    issueDate: sd.ocrIssueDate,
                                  }),
                                  ...(typeof sd?.ocrExpiryDate === 'string' && {
                                    expiryDate: sd.ocrExpiryDate,
                                  }),
                                  ...(typeof sd?.ocrDocumentType ===
                                    'string' && {
                                    documentType: sd.ocrDocumentType,
                                  }),
                                  ...(typeof sd?.ocrVehiclePlate ===
                                    'string' && {
                                    vehiclePlate: sd.ocrVehiclePlate,
                                  }),
                                };
                                setOcrResult(ocr);
                                if (ocr.documentNumber)
                                  form.setValue(
                                    'documentNumber',
                                    ocr.documentNumber
                                  );
                                if (ocr.entity)
                                  form.setValue('entity', ocr.entity);
                                if (ocr.expiryDate) {
                                  const parsed = new Date(ocr.expiryDate);
                                  if (!isNaN(parsed.getTime()))
                                    form.setValue('expiryDate', parsed);
                                }
                                toast({
                                  title: 'Datos detectados',
                                  description: `OCR completado con ${confidence}% de confianza — revisá los campos`,
                                });
                              } else {
                                toast({
                                  title: 'Archivo subido',
                                  description:
                                    'El archivo se ha cargado correctamente',
                                });
                              }
                            }
                          }}
                          onUploadError={error => {
                            toast({
                              title: 'Error al subir archivo',
                              description: error.message,
                              variant: 'destructive',
                            });
                          }}
                          className="ut-button:w-full ut-button:bg-primary ut-button:hover:bg-primary/90"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                          <span className="text-sm text-green-700 font-medium">
                            Archivo subido correctamente
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              field.onChange('');
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

            {/* Banner OCR */}
            {ocrResult && ocrResult.confidence > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-blue-700">
                  <Sparkles className="h-4 w-4" />
                  Datos detectados automáticamente ({ocrResult.confidence}%
                  confianza)
                </div>
                <div className="text-blue-600 space-y-0.5">
                  {ocrResult.documentNumber && (
                    <p>Número: {ocrResult.documentNumber}</p>
                  )}
                  {ocrResult.entity && <p>Entidad: {ocrResult.entity}</p>}
                  {ocrResult.expiryDate && (
                    <p>
                      Vencimiento:{' '}
                      {new Date(ocrResult.expiryDate).toLocaleDateString(
                        'es-CO'
                      )}
                    </p>
                  )}
                  {ocrResult.vehiclePlate && (
                    <p>Placa detectada: {ocrResult.vehiclePlate}</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-blue-500">
                  Los campos fueron pre-rellenados — revisá y corregí si es
                  necesario
                </p>
              </div>
            )}

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
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                          disabled={isLoading}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
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
                        disabled={date => date < new Date('1900-01-01')}
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
                  setOcrResult(null);
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !fileUploaded}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Creando...' : 'Crear Documento'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
