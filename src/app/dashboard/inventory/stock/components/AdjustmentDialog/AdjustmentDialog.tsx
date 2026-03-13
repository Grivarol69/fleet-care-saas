'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { InventoryItemRow } from '../StockList/StockList.types';
import {
    adjustmentSchema,
    AdjustmentFormValues,
} from './AdjustmentDialog.form';

export type AdjustmentDialogProps = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    item: InventoryItemRow;
    onSuccess: (updatedItem: InventoryItemRow) => void;
};

export function AdjustmentDialog({
    open,
    onOpenChange,
    item,
    onSuccess,
}: AdjustmentDialogProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<AdjustmentFormValues>({
        resolver: zodResolver(adjustmentSchema),
        defaultValues: {
            type: 'ADJUSTMENT_IN',
            quantity: 0,
            unitCost: undefined,
            notes: '',
        },
    });

    const type = form.watch('type');

    const onSubmit = async (values: AdjustmentFormValues) => {
        try {
            setLoading(true);
            const payload = {
                ...values,
                inventoryItemId: item.id,
            };

            const response = await axios.post('/api/inventory/adjustments', payload);

            onSuccess(response.data.updatedItem);
            onOpenChange(false);
            form.reset();

            toast({
                title: 'Ajuste guardado',
                description: 'El ajuste de inventario se guardó correctamente.',
            });
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                toast({
                    title: 'Stock insuficiente',
                    description: error.response.data?.error || 'No hay stock suficiente para esta salida',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Error',
                    description: 'Ocurrió un error al guardar el ajuste.',
                    variant: 'destructive',
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => {
            onOpenChange(v);
            if (!v) form.reset();
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajuste de Stock</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Ajuste</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ADJUSTMENT_IN">Entrada (ADJUSTMENT_IN)</SelectItem>
                                            <SelectItem value="ADJUSTMENT_OUT">Salida (ADJUSTMENT_OUT)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad</FormLabel>
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

                        {type === 'ADJUSTMENT_IN' && (
                            <FormField
                                control={form.control}
                                name="unitCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Costo Unitario</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Motivo del ajuste..."
                                            {...field}
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
                                Guardar Ajuste
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
