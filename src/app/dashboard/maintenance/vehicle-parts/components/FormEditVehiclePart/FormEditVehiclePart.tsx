'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
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
import { useToast } from '@/components/hooks/use-toast';
import { editFormSchema, type EditFormValues } from './FormEditVehiclePart.form';
import type { FormEditVehiclePartProps } from './FormEditVehiclePart.types';

export function FormEditVehiclePart({
    isOpen,
    setIsOpen,
    entry,
    onEdit,
    masterParts,
}: FormEditVehiclePartProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<EditFormValues>({
        resolver: zodResolver(editFormSchema),
        defaultValues: {
            yearFrom: entry.yearFrom,
            yearTo: entry.yearTo,
            masterPartId: entry.masterPart.id,
            quantity: parseFloat(entry.quantity),
            notes: entry.notes,
        },
    });

    const onSubmit = async (values: EditFormValues) => {
        try {
            setIsLoading(true);
            const response = await axios.put(
                `/api/maintenance/vehicle-parts/${entry.id}`,
                values,
            );
            onEdit(response.data);
            setIsOpen(false);
            toast({
                title: 'Vinculo actualizado',
                description: 'La autoparte fue actualizada exitosamente',
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 409) {
                    toast({
                        title: 'Vinculo duplicado',
                        description: 'Ya existe un vinculo para esta combinacion',
                        variant: 'destructive',
                    });
                    return;
                }
                if (error.response?.status === 403) {
                    toast({
                        title: 'Sin permisos',
                        description: error.response.data?.error ?? 'No tiene permisos',
                        variant: 'destructive',
                    });
                    return;
                }
            }
            toast({
                title: 'Error al actualizar',
                description: 'Por favor intenta de nuevo',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Editar Vinculo</DialogTitle>
                </DialogHeader>

                {/* Contexto fijo (no editable) */}
                <div className="rounded-md bg-slate-50 p-3 text-sm space-y-1 mb-2">
                    <p><span className="font-medium text-slate-500">Item:</span> {entry.mantItem.name}</p>
                    <p><span className="font-medium text-slate-500">Marca:</span> {entry.vehicleBrand.name}</p>
                    <p><span className="font-medium text-slate-500">Linea:</span> {entry.vehicleLine.name}</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="yearFrom"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Desde (anio)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="2018"
                                                disabled={isLoading}
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(e.target.value ? parseInt(e.target.value) : null)
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="yearTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hasta (anio)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="2025"
                                                disabled={isLoading}
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(e.target.value ? parseInt(e.target.value) : null)
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="masterPartId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Autoparte</FormLabel>
                                    <Select
                                        disabled={isLoading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar autoparte..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {masterParts.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.code} - {p.description}
                                                </SelectItem>
                                            ))}
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
                                            step="0.1"
                                            disabled={isLoading}
                                            value={field.value}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas (opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Notas adicionales..."
                                            disabled={isLoading}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value || null)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-2">
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
