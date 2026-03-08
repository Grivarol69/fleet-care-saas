import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { CostCenter, CostCenterFormData } from './CostCentersList.types';

const costCenterSchema = z.object({
    code: z.string().min(1, 'El código es requerido'),
    name: z.string().min(1, 'El nombre es requerido'),
    description: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
    taxId: z.string().optional().nullable(),
    billingEmail: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
});

interface FormCostCenterProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    costCenter?: CostCenter | null;
    onSuccess: () => void;
}

export function FormCostCenter({ isOpen, setIsOpen, costCenter, onSuccess }: FormCostCenterProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CostCenterFormData>({
        resolver: zodResolver(costCenterSchema),
        defaultValues: {
            code: '',
            name: '',
            description: '',
            isActive: true,
            taxId: '',
            billingEmail: '',
            phone: '',
            address: '',
        },
    });

    const isActive = watch('isActive');

    useEffect(() => {
        if (costCenter && isOpen) {
            reset({
                code: costCenter.code,
                name: costCenter.name,
                description: costCenter.description || '',
                isActive: costCenter.isActive,
                taxId: costCenter.taxId || '',
                billingEmail: costCenter.billingEmail || '',
                phone: costCenter.phone || '',
                address: costCenter.address || '',
            });
        } else if (!costCenter && isOpen) {
            reset({
                code: '',
                name: '',
                description: '',
                isActive: true,
                taxId: '',
                billingEmail: '',
                phone: '',
                address: '',
            });
        }
    }, [costCenter, isOpen, reset]);

    const onSubmit = async (data: CostCenterFormData) => {
        try {
            setIsSubmitting(true);

            // Filter out empty string optional fields to null for DB cleanlyness
            const payload = {
                ...data,
                description: data.description || null,
                taxId: data.taxId || null,
                billingEmail: data.billingEmail || null,
                phone: data.phone || null,
                address: data.address || null,
            };

            if (costCenter) {
                await axios.patch(`/api/cost-centers/${costCenter.id}`, payload);
                toast.success('Centro de costos actualizado');
            } else {
                await axios.post('/api/cost-centers', payload);
                toast.success('Centro de costos creado');
            }

            onSuccess();
            setIsOpen(false);
        } catch (error: any) {
            console.error('Error saving cost center:', error);
            toast.error(error.response?.data?.error || 'Error al guardar el centro de costos');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {costCenter ? 'Editar Centro de Costos' : 'Nuevo Centro de Costos'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Código *</Label>
                            <Input
                                id="code"
                                placeholder="CC-001"
                                {...register('code')}
                                className={errors.code ? 'border-red-500' : ''}
                            />
                            {errors.code && <p className="text-red-500 text-sm">{errors.code.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="taxId">NIT / CUIT</Label>
                            <Input id="taxId" {...register('taxId')} placeholder="Tributario" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre / Razón Social *</Label>
                        <Input
                            id="name"
                            placeholder="Transportes García S.A."
                            {...register('name')}
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            {...register('description')}
                            placeholder="Detalles adicionales..."
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="billingEmail">Email de Facturación</Label>
                            <Input
                                id="billingEmail"
                                {...register('billingEmail')}
                                placeholder="facturas@empresa.com"
                                className={errors.billingEmail ? 'border-red-500' : ''}
                            />
                            {errors.billingEmail && <p className="text-red-500 text-sm">{errors.billingEmail.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" {...register('phone')} placeholder="+57 300..." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input id="address" {...register('address')} placeholder="Calle falsa 123" />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch
                            id="isActive"
                            checked={isActive}
                            onCheckedChange={(checked) => setValue('isActive', checked)}
                        />
                        <Label htmlFor="isActive">Estado: {isActive ? 'Activo' : 'Inactivo'}</Label>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {costCenter ? 'Guardar Cambios' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
