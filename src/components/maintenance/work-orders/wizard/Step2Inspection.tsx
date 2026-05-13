'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';

const step2Schema = z.object({
  date: z.string().min(1, 'La fecha de inspección es requerida'),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  vehicleGrounded: z.boolean().default(false),
  estimatedRepairHours: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal(0))
    .optional(),
});

type Step2FormValues = z.infer<typeof step2Schema>;

interface Step2InspectionProps {
  workOrderId: string;
  currentUserId: string;
}

export function Step2Inspection({
  workOrderId,
  currentUserId,
}: Step2InspectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 16),
      description: '',
      vehicleGrounded: false,
      estimatedRepairHours: undefined,
    },
  });

  const vehicleGrounded = form.watch('vehicleGrounded');

  const onSubmit = async (values: Step2FormValues) => {
    setIsLoading(true);
    try {
      await axios.post(
        `/api/maintenance/work-orders/${workOrderId}/inspection`,
        {
          date: new Date(values.date).toISOString(),
          description: values.description,
          vehicleGrounded: values.vehicleGrounded,
          estimatedRepairHours: values.estimatedRepairHours || null,
          inspectedBy: currentUserId,
        }
      );

      toast({
        title: 'Inspección registrada',
        description: 'Continuá con la confección de ítems.',
      });

      router.push(
        `/dashboard/maintenance/work-orders/${workOrderId}/wizard?step=3`
      );
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Error',
        description:
          axiosError.response?.data?.error ||
          'No se pudo registrar la inspección.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Paso 2: Inspección técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Inspection date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha y hora de inspección *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de la inspección *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describí el estado del vehículo, las fallas encontradas, partes revisadas..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimated repair hours */}
            <FormField
              control={form.control}
              name="estimatedRepairHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Horas estimadas de reparación (opcional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Ej: 4"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vehicle grounded */}
            <FormField
              control={form.control}
              name="vehicleGrounded"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Vehículo fuera de servicio
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Marcá esta opción si el vehículo no puede circular hasta
                      que se complete el mantenimiento
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Warning alert when vehicle is grounded */}
            {vehicleGrounded && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Vehículo inmovilizado</AlertTitle>
                <AlertDescription>
                  Al guardar esta inspección, se notificará a los responsables
                  que el vehículo está fuera de servicio. El vehículo NO puede
                  circular hasta completar el mantenimiento.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar inspección y continuar
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
