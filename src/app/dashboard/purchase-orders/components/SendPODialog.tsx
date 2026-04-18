'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';

const formSchema = z.object({
  recipientEmail: z.string().email('Email inválido'),
  recipientName: z.string().optional(),
});

interface SendPODialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
}

export function SendPODialog({
  isOpen,
  setIsOpen,
  purchaseOrderId,
  purchaseOrderNumber,
}: SendPODialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipientEmail: '',
      recipientName: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      await axios.post(`/api/purchase-orders/${purchaseOrderId}/send-email`, {
        ...values,
      });

      toast({
        title: '¡Email enviado!',
        description: `La OC ${purchaseOrderNumber} ha sido enviada a ${values.recipientEmail}`,
      });

      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error sending PO email:', error);

      let description = 'No se pudo enviar el email';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        description = error.response.data.error;
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar OC por Email
          </DialogTitle>
          <DialogDescription>
            Envía la Orden de Compra <strong>{purchaseOrderNumber}</strong>{' '}
            por correo electrónico adjuntando el PDF.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email del destinatario *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="ejemplo@correo.com"
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
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del destinatario (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre completo"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  form.reset();
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Enviando...' : 'Enviar Email'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
