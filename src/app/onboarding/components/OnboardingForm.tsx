'use client';

import { useActionState, useEffect, useState } from 'react';
import { updateTenantProfile } from '@/actions/onboarding';
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function OnboardingForm({ tenantName }: { tenantName: string }) {
    const [state, formAction, pending] = useActionState(updateTenantProfile, null);
    const [country, setCountry] = useState('CO');
    const [currency, setCurrency] = useState('COP');

    const currencyMap: Record<string, string> = {
        CO: 'COP',
        MX: 'MXN',
        CL: 'CLP',
        AR: 'ARS',
        PE: 'PEN',
        US: 'USD',
    };

    useEffect(() => {
        setCurrency(currencyMap[country] || 'USD');
    }, [country]);

    return (
        <form action={formAction}>
            <CardHeader>
                <CardTitle>Perfil de la Organización</CardTitle>
                <CardDescription>
                    Datos básicos para configurar tu facturación y reportes. Al finalizar, prepararemos tu entorno de pruebas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {state?.error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                        {state.error}
                    </div>
                )}
                {tenantName && (
                    <div className="space-y-2">
                        <Label>Empresa Verificada</Label>
                        <Input
                            value={tenantName}
                            disabled
                            className="bg-slate-100 text-slate-500 font-medium"
                        />
                        <p className="text-xs text-slate-400">Nombre registrado en Clerk.</p>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="country">País</Label>
                        <Select name="country" value={country} onValueChange={setCountry}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CO">Colombia 🇨🇴</SelectItem>
                                <SelectItem value="MX">México 🇲🇽</SelectItem>
                                <SelectItem value="CL">Chile 🇨🇱</SelectItem>
                                <SelectItem value="AR">Argentina 🇦🇷</SelectItem>
                                <SelectItem value="PE">Perú 🇵🇪</SelectItem>
                                <SelectItem value="US">Estados Unidos 🇺🇸</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="currency">Moneda</Label>
                        <Input
                            id="currency"
                            value={currency}
                            disabled
                            className="bg-slate-100"
                        />
                        <p className="text-xs text-slate-500">
                            Se ajusta automáticamente al país.
                        </p>
                    </div>
                </div>
            </CardContent>
            <div className="p-6 pt-0 flex justify-end">
                <Button type="submit" disabled={pending}>
                    {pending ? 'Configurando...' : 'Finalizar y Configurar'}
                </Button>
            </div>
        </form>
    )
}
