'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { UploadButton } from '@/lib/uploadthing';
import { useToast } from '@/components/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';
import type { DocumentTypeConfig } from './VehicleCreateWizard.types';
import type { DocumentOCRResult } from '@/lib/ocr/claude-vision';

const docFormSchema = z.object({
  documentNumber: z.string().min(1, 'El número de documento es requerido'),
  entity: z.string().optional(),
  fileUrl: z.string().min(1, 'Debe subir un archivo'),
  expiryDate: z.date().optional(),
});

type DocFormValues = z.infer<typeof docFormSchema>;

interface DocumentUploadCardProps {
  vehiclePlate: string;
  documentType: DocumentTypeConfig;
  preloadedUrl?: string;
  preloadedOcr?: DocumentOCRResult;
  onSaved?: (documentId: string) => void;
}

export function DocumentUploadCard({
  vehiclePlate,
  documentType,
  preloadedUrl,
  preloadedOcr,
  onSaved,
}: DocumentUploadCardProps) {
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(!!preloadedUrl);
  const [ocrResult, setOcrResult] = useState<DocumentOCRResult | null>(
    preloadedOcr ?? null
  );

  const form = useForm<DocFormValues>({
    resolver: zodResolver(docFormSchema),
    defaultValues: {
      documentNumber: preloadedOcr?.documentNumber ?? '',
      entity: preloadedOcr?.entity ?? '',
      fileUrl: preloadedUrl ?? '',
      expiryDate: preloadedOcr?.expiryDate
        ? (() => {
            const d = new Date(preloadedOcr.expiryDate!);
            return isNaN(d.getTime()) ? undefined : d;
          })()
        : undefined,
    },
  });

  const onSubmit = async (values: DocFormValues) => {
    try {
      setIsSaving(true);
      const response = await axios.post('/api/vehicles/documents', {
        vehiclePlate,
        documentTypeId: documentType.id,
        documentNumber: values.documentNumber,
        entity: values.entity || null,
        fileUrl: values.fileUrl,
        fileName: documentType.name,
        expiryDate: values.expiryDate ?? null,
      });
      setIsSaved(true);
      onSaved?.(response.data.id);
      toast({
        title: 'Documento guardado',
        description: `${documentType.name} registrado correctamente`,
      });
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el documento',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-2 py-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-800">{documentType.name}</span>
          <Badge variant="outline" className="ml-auto text-green-700 border-green-300">
            Guardado
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {documentType.name}
          {documentType.isMandatory && (
            <Badge variant="secondary" className="text-xs">Requerido</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Upload */}
            <FormField
              control={form.control}
              name="fileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Archivo *</FormLabel>
                  <FormControl>
                    <div>
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
                                  ...(typeof sd?.ocrDocumentNumber === 'string' && {
                                    documentNumber: sd.ocrDocumentNumber,
                                  }),
                                  ...(typeof sd?.ocrEntity === 'string' && {
                                    entity: sd.ocrEntity,
                                  }),
                                  ...(typeof sd?.ocrExpiryDate === 'string' && {
                                    expiryDate: sd.ocrExpiryDate,
                                  }),
                                };
                                setOcrResult(ocr);
                                if (ocr.documentNumber)
                                  form.setValue('documentNumber', ocr.documentNumber);
                                if (ocr.entity)
                                  form.setValue('entity', ocr.entity);
                                if (ocr.expiryDate) {
                                  const parsed = new Date(ocr.expiryDate);
                                  if (!isNaN(parsed.getTime()))
                                    form.setValue('expiryDate', parsed);
                                }
                                toast({
                                  title: 'Datos detectados',
                                  description: `${confidence}% confianza — revisá los campos`,
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
                          className="ut-button:w-full ut-button:bg-primary ut-button:hover:bg-primary/90 ut-button:text-sm"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200 text-sm">
                          <span className="text-green-700">Archivo subido</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              field.onChange('');
                              setFileUploaded(false);
                              setOcrResult(null);
                            }}
                          >
                            Cambiar
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* OCR Banner */}
            {ocrResult && ocrResult.confidence > 0 && (
              <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs">
                <div className="flex items-center gap-1 font-medium text-blue-700 mb-1">
                  <Sparkles className="h-3 w-3" />
                  Datos detectados ({ocrResult.confidence}% confianza)
                </div>
              </div>
            )}

            {/* Número de Documento */}
            <FormField
              control={form.control}
              name="documentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Número *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 2508004334695000"
                      className="h-8 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entidad */}
            <FormField
              control={form.control}
              name="entity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Entidad emisora</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: SURA"
                      className="h-8 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de Vencimiento */}
            {documentType.requiresExpiry && (
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs">Vencimiento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'h-8 text-sm pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
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
            )}

            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !fileUploaded}
              className="w-full"
            >
              {isSaving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Guardar Documento
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
