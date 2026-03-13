'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InventoryItemRow } from '../StockList/StockList.types';
import {
    thresholdsSchema,
    ThresholdsFormValues,
} from './ThresholdsDialog.form';

export type ThresholdsDialogProps = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    item: InventoryItemRow;
    onSuccess: (updatedItem: InventoryItemRow) => void;
};

export function ThresholdsDialog({
    open,
    onOpenChange,
    item,
    onSuccess,
}: ThresholdsDialogProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<ThresholdsFormValues>({
        resolver: zodResolver(thresholdsSchema),
        defaultValues: {
            minStock: item.minStock,
            maxStock: item.maxStock,
            location: item.location,
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                minStock: item.minStock,
                maxStock: item.maxStock,
                location: item.location,
            });
        }
    }, [open, item, form]);

    const onSubmit = async (values: ThresholdsFormValues) => {
        try {
            setLoading(true);
            const response = await axios.patch(`/api/inventory/items/${item.id}`, values);

            onSuccess(response.data);
            onOpenChange(false);

            toast({
                title: 'Umbrales actualizados',
                description: 'Se actualizaron los datos correctamente.',
            });
        } catch (error) {
            console.error('Error updating thresholds:', error);
            toast({
                title: 'Error',
                description: 'Ocurrió un error al actualizar los datos.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Umbrales y Ubicación</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="minStock"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock Mínimo</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="maxStock"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock Máximo (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ubicación (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value ? e.target.value : null)}
                                            placeholder="Ej: Pasillo 3, Estante B"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
