'use client';

import { useState, useEffect } from 'react';
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
import axios from 'axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formEditPurchaseSchema } from './FormEditPurchase.form';
import { FormEditPurchaseProps } from './FormEditPurchase.types';

interface Provider {
    id: string;
    name: string;
}

export function FormEditPurchase({
    isOpen,
    setIsOpen,
    purchase,
    onEditPurchase,
}: FormEditPurchaseProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [providers, setProviders] = useState<Provider[]>([]);

    useEffect(() => {
        if (isOpen) {
            axios
                .get<Provider[]>('/api/people/providers')
                .then((res) => setProviders(res.data))
                .catch((error) => console.error('Error fetching providers:', error));
        }
    }, [isOpen]);

    const form = useForm<z.infer<typeof formEditPurchaseSchema>>({
        resolver: zodResolver(formEditPurchaseSchema),
        defaultValues: {
            invoiceNumber: purchase.invoiceNumber,
            invoiceDate: new Date(purchase.invoiceDate).toISOString().split('T')[0],
            supplierId: (purchase.supplier as any)?.id || (purchase as any).supplierId || '',
        },
    });

    const router = useRouter();

    const onSubmit = async (values: z.infer<typeof formEditPurchaseSchema>) => {
        try {
            setIsLoading(true);
            const response = await axios.patch(
                `/api/inventory/purchases/${purchase.id}`,
                {
                    ...values,
                    invoiceDate: new Date(values.invoiceDate).toISOString(),
                }
            );

            const updatedPurchase = {
                ...purchase,
                invoiceNumber: response.data.invoiceNumber,
                invoiceDate: response.data.invoiceDate,
                supplierId: response.data.supplierId,
                supplier: providers.find((p) => p.id === response.data.supplierId) || purchase.supplier,
            };

            onEditPurchase(updatedPurchase);
            setIsOpen(false);
            form.reset();

            toast.success('Compra actualizada', {
                description: 'La factura ha sido actualizada exitosamente',
            });

            router.refresh();
        } catch (error) {
            console.error('Error updating purchase:', error);
            toast.error('Error al actualizar', {
                description: 'Verificá los datos e intentá nuevamente',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Factura {purchase.invoiceNumber}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="invoiceNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>N° Factura</FormLabel>
                                    <FormControl>
                                        <Input placeholder="N° de factura" disabled={isLoading} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="invoiceDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha de Factura</FormLabel>
                                    <FormControl>
                                        <Input type="date" disabled={isLoading} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor</FormLabel>
                                    <Select
                                        disabled={isLoading}
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar proveedor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {providers.map((provider) => (
                                                <SelectItem key={provider.id} value={provider.id}>
                                                    {provider.name}
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
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
