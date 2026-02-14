import { currentUser, auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Check, Truck, Building2 } from 'lucide-react';
import {
  Card,
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
import { updateTenantProfile, completeOnboarding } from '@/actions/onboarding';

import { Prisma } from '@prisma/client';

type UserWithTenant = Prisma.UserGetPayload<{
  include: { tenant: true };
}>;

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) return redirect('/sign-in');

  const { orgId } = await auth();
  const email = user.emailAddresses?.[0]?.emailAddress || '';

  // Buscar usuario filtrando por orgId (tenant) para evitar retornar
  // el usuario del tenant equivocado en caso de multi-org
  const dbUser: UserWithTenant | null = orgId
    ? await prisma.user.findFirst({
        where: { email, tenantId: orgId },
        include: { tenant: true },
      })
    : await prisma.user.findFirst({
        where: { email },
        include: { tenant: true },
      });

  // Si no tiene tenant, es usuario nuevo sin invitación -> Crear Tenant
  // Si tiene tenant pero status es PENDING -> Mostrar Wizard
  // Si status es COMPLETED -> Redirect Dashboard

  if (dbUser?.tenant?.onboardingStatus === 'COMPLETED') {
    return redirect('/dashboard');
  }

  const step = dbUser?.tenant?.onboardingStatus === 'PROFILE_COMPLETED' ? 2 : 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Bienvenido a Fleet Care
          </h1>
          <p className="text-slate-500">
            Configuremos tu espacio de trabajo en unos minutos.
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-between items-center px-10">
          <StepItem
            number={1}
            title="Perfil"
            active={step >= 1}
            completed={step > 1}
          />
          <div
            className={`h-1 flex-1 mx-4 ${step > 1 ? 'bg-blue-600' : 'bg-slate-200'}`}
          />
          <StepItem
            number={2}
            title="Flota"
            active={step >= 2}
            completed={step > 2}
          />
          <div
            className={`h-1 flex-1 mx-4 ${step > 2 ? 'bg-blue-600' : 'bg-slate-200'}`}
          />
          <StepItem
            number={3}
            title="Listo"
            active={step >= 3}
            completed={step > 3}
          />
        </div>

        {/* Wizard Content */}
        <Card className="border-slate-200 shadow-lg">
          {step === 1 && (
            <form action={updateTenantProfile}>
              <CardHeader>
                <CardTitle>Perfil de la Organización</CardTitle>
                <CardDescription>
                  Datos básicos para configurar tu facturación y reportes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nombre de la Empresa</Label>
                  <Input
                    id="orgName"
                    name="orgName"
                    defaultValue={dbUser?.tenant?.name || ''}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Select name="country" defaultValue="CO">
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
                      value="COP"
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
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form action={completeOnboarding}>
              <CardHeader>
                <CardTitle>Configuración de Flota</CardTitle>
                <CardDescription>
                  Selecciona los tipos de vehículos que administras para cargar
                  planes de mantenimiento sugeridos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border p-4 rounded-lg flex items-start gap-3 hover:border-blue-500 cursor-pointer">
                    <Truck className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="font-medium">Transporte de Carga</p>
                      <p className="text-sm text-slate-500">
                        Camiones, Tractomulas, Furgones.
                      </p>
                    </div>
                  </div>
                  <div className="border p-4 rounded-lg flex items-start gap-3 hover:border-blue-500 cursor-pointer">
                    <Building2 className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="font-medium">Maquinaria Amarilla</p>
                      <p className="text-sm text-slate-500">
                        Excavadoras, Retroexcavadoras, Grúas.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end">
                <Button type="submit">Finalizar y Configurar</Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

function StepItem({
  number,
  title,
  active,
  completed,
}: {
  number: number;
  title: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors
                ${completed ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}
            `}
      >
        {completed ? <Check className="h-4 w-4" /> : number}
      </div>
      <span
        className={`text-sm font-medium ${active ? 'text-slate-900' : 'text-slate-500'}`}
      >
        {title}
      </span>
    </div>
  );
}
