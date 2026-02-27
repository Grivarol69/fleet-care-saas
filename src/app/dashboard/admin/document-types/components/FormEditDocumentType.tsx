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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).nullable().optional(),
  requiresExpiry: z.boolean(),
  isMandatory: z.boolean(),
  expiryWarningDays: z.number().int().min(0),
  expiryCriticalDays: z.number().int().min(0),
  sortOrder: z.number().int().min(0),
});

interface DocumentTypeConfig {
  id: string;
  tenantId: string | null;
  isGlobal: boolean;
  countryCode: string;
  code: string;
  name: string;
  description: string | null;
  requiresExpiry: boolean;
  isMandatory: boolean;
  expiryWarningDays: number;
  expiryCriticalDays: number;
  sortOrder: number;
  status: string;
}

interface FormEditDocumentTypeProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  documentType: DocumentTypeConfig;
  onEdit: (updated: DocumentTypeConfig) => void;
}

export function FormEditDocumentType({
  isOpen,
  setIsOpen,
  documentType,
  onEdit,
}: FormEditDocumentTypeProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: documentType.name,
      description: documentType.description || '',
      requiresExpiry: documentType.requiresExpiry,
      isMandatory: documentType.isMandatory,
      expiryWarningDays: documentType.expiryWarningDays,
      expiryCriticalDays: documentType.expiryCriticalDays,
      sortOrder: documentType.sortOrder,
    },
  });

  useEffect(() => {
    form.reset({
      name: documentType.name,
      description: documentType.description || '',
      requiresExpiry: documentType.requiresExpiry,
      isMandatory: documentType.isMandatory,
      expiryWarningDays: documentType.expiryWarningDays,
      expiryCriticalDays: documentType.expiryCriticalDays,
      sortOrder: documentType.sortOrder,
    });
  }, [documentType, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const response = await axios.put(
        `/api/vehicles/document-types/${documentType.id}`,
        values
      );
      onEdit(response.data);
      setIsOpen(false);
      toast({
        title: 'Tipo actualizado',
        description: 'El tipo de documento ha sido actualizado exitosamente',
      });
    } catch (error) {
      console.error('Error updating document type:', error);
      let description = 'No se pudo actualizar el tipo de documento';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        description = error.response.data.error;
      }
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Editar Tipo de Documento: {documentType.code}
            {documentType.isGlobal && ' (Global)'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requiresExpiry"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel>Requiere fecha de vencimiento</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isMandatory"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel>Obligatorio para circular</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="expiryWarningDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias Warning</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e =>
                          field.onChange(parseInt(e.target.value, 10) || 0)
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
                name="expiryCriticalDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias Critical</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e =>
                          field.onChange(parseInt(e.target.value, 10) || 0)
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
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e =>
                          field.onChange(parseInt(e.target.value, 10) || 0)
                        }
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
