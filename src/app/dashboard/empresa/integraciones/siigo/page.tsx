'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Play, Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const configSchema = z.object({
    enabled: z.boolean(),
    username: z.string().email('Debe ser un email válido').min(1, 'El usuario es requerido'),
    accessKey: z.string().optional(),
    defaultCostCenterId: z.number().optional().nullable(),
    defaultPaymentTypeId: z.number().optional().nullable(),
    defaultDocumentTypeId: z.number().optional().nullable(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function SiigoConfigPanel() {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Data fetching
    const { data: configData, mutate: mutateConfig } = useSWR('/api/integrations/siigo/config', fetcher);
    const { data: syncData, mutate: mutateSync } = useSWR('/api/integrations/siigo/sync', fetcher, { refreshInterval: 10000 });
    const [referenceData, setReferenceData] = useState<{
        costCenters?: any[];
        paymentTypes?: any[];
        documentTypes?: any[];
    } | null>(null);

    const form = useForm<ConfigFormValues>({
        resolver: zodResolver(configSchema),
        defaultValues: {
            enabled: false,
            username: '',
            accessKey: '',
            defaultCostCenterId: null,
            defaultPaymentTypeId: null,
            defaultDocumentTypeId: null,
        },
    });

    useEffect(() => {
        if (configData?.config) {
            form.reset({
                enabled: configData.config.enabled || false,
                username: configData.config.username || '',
                accessKey: '', // Always empty initially for security
                defaultCostCenterId: configData.config.defaultCostCenterId || null,
                defaultPaymentTypeId: configData.config.defaultPaymentTypeId || null,
                defaultDocumentTypeId: configData.config.defaultDocumentTypeId || null,
            });
        }
    }, [configData, form]);

    const onSubmit = async (values: ConfigFormValues) => {
        setIsSaving(true);
        try {
            const payload = { ...values };
            if (!payload.accessKey) {
                delete payload.accessKey; // Only send if user typed a new one
            }

            const res = await fetch('/api/integrations/siigo/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Error guardando configuración');

            toast({ title: 'Configuración guardada', description: 'Los cambios se han guardado exitosamente.' });
            mutateConfig();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            const res = await fetch('/api/integrations/siigo/test-connection', { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.success) {
                toast({ title: 'Conexión Exitosa', description: 'Las credenciales son válidas y conectan con Siigo.' });
            } else {
                throw new Error(data.error || 'Error de autenticación');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error de Conexión', description: error.message });
        } finally {
            setIsTesting(false);
        }
    };

    const handleBootstrap = async () => {
        setIsBootstrapping(true);
        try {
            const res = await fetch('/api/integrations/siigo/bootstrap');
            const data = await res.json();

            if (res.ok && data.success) {
                setReferenceData(data.data);
                toast({ title: 'Datos Cargados', description: 'Centros de costo, pagos y documentos obtenidos desde Siigo.' });
            } else {
                throw new Error(data.error || 'Error al obtener datos');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsBootstrapping(false);
        }
    };

    const handleBatchSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/integrations/siigo/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entityTypes: ['providers', 'parts', 'invoices'] })
            });

            if (res.ok) {
                toast({ title: 'Sincronización Iniciada', description: 'Los registros pendientes se están procesando en segundo plano.' });
                mutateSync();
            } else {
                throw new Error('Error al iniciar sincronización');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integración Siigo</h1>
                <p className="text-muted-foreground">Configura la sincronización automática de facturas, proveedores y catálogo con tu cuenta de Siigo Nube.</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Credenciales</CardTitle>
                                <CardDescription>Autenticación de acceso a la API (partner o cliente).</CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="enabled" className="text-sm text-muted-foreground mr-2">Habilitar Integración</Label>
                                <Switch
                                    id="enabled"
                                    checked={form.watch('enabled')}
                                    onCheckedChange={(val) => form.setValue('enabled', val)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="username">Usuario (Email Siigo)</Label>
                                <Input id="username" type="email" {...form.register('username')} />
                                {form.formState.errors.username && <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accessKey">Access Key</Label>
                                <Input id="accessKey" type="password" placeholder="••••••••••••" {...form.register('accessKey')} />
                                {configData?.config?.accessKeyMasked && !form.watch('accessKey') && (
                                    <p className="text-xs text-muted-foreground">Actual: {configData.config.accessKeyMasked} (dejá vacío para mantener config)</p>
                                )}
                            </div>
                        </div>

                        <Button type="button" variant="secondary" onClick={handleTestConnection} disabled={isTesting || !form.watch('username')}>
                            {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Probar Conexión
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Valores por Defecto</CardTitle>
                        <CardDescription>Parámetros requeridos por Siigo al crear facturas y productos. Carga los datos de tu cuenta primero.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button type="button" variant="outline" onClick={handleBootstrap} disabled={isBootstrapping}>
                            {isBootstrapping ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Cargar Listados desde Siigo
                        </Button>

                        <div className="grid gap-4 md:grid-cols-3 pt-2">
                            <div className="space-y-2">
                                <Label>Centro de Costo</Label>
                                <Select
                                    disabled={!referenceData?.costCenters}
                                    value={form.watch('defaultCostCenterId')?.toString() || ''}
                                    onValueChange={(val) => form.setValue('defaultCostCenterId', parseInt(val))}
                                >
                                    <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                    <SelectContent>
                                        {referenceData?.costCenters?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo de Pago</Label>
                                <Select
                                    disabled={!referenceData?.paymentTypes}
                                    value={form.watch('defaultPaymentTypeId')?.toString() || ''}
                                    onValueChange={(val) => form.setValue('defaultPaymentTypeId', parseInt(val))}
                                >
                                    <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                    <SelectContent>
                                        {referenceData?.paymentTypes?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Documento Factura (FC)</Label>
                                <Select
                                    disabled={!referenceData?.documentTypes}
                                    value={form.watch('defaultDocumentTypeId')?.toString() || ''}
                                    onValueChange={(val) => form.setValue('defaultDocumentTypeId', parseInt(val))}
                                >
                                    <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                    <SelectContent>
                                        {referenceData?.documentTypes?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Configuración
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>

            <Card>
                <CardHeader>
                    <CardTitle>Estado de Sincronización</CardTitle>
                    <CardDescription>Resumen de registros marcados para enviar a Siigo (Proveedores, Insumos, Facturas de Compra).</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="border rounded-lg p-3 text-center">
                            <p className="text-sm font-medium text-muted-foreground">Total Revisados</p>
                            <p className="text-2xl font-bold">{syncData?.summary?.total || 0}</p>
                        </div>
                        <div className="border border-green-200 bg-green-50 rounded-lg p-3 text-center dark:bg-green-950/20 dark:border-green-900/50">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">Sincronizados</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{syncData?.summary?.synced || 0}</p>
                        </div>
                        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 text-center dark:bg-yellow-950/20 dark:border-yellow-900/50">
                            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pendientes</p>
                            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{syncData?.summary?.pending || 0}</p>
                        </div>
                        <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-3 text-center">
                            <p className="text-sm font-medium text-destructive">Con Errores</p>
                            <p className="text-2xl font-bold text-destructive">{syncData?.summary?.failed || 0}</p>
                        </div>
                    </div>

                    <Button onClick={handleBatchSync} disabled={isSyncing || (syncData?.summary?.pending || 0) === 0}>
                        {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Forzar Sincronización Pendientes
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
