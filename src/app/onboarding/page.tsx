import { currentUser, auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Check } from 'lucide-react';
import { OrganizationList } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { OnboardingForm } from './components/OnboardingForm';
import { OnboardingKBStep } from './components/OnboardingKBStep';
import { Prisma } from '@prisma/client';

type UserWithTenant = Prisma.UserGetPayload<{
  include: { tenant: true };
}>;

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) return redirect('/sign-in');

  const { orgId } = await auth();
  const email = user.emailAddresses?.[0]?.emailAddress || '';

  if (!orgId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Crea tu Empresa</h1>
            <p className="text-slate-500">Para comenzar, crea tu primera organización en Fleet Care.</p>
          </div>
          <OrganizationList
            hidePersonal
            afterCreateOrganizationUrl="/onboarding"
            afterSelectOrganizationUrl="/onboarding"
          />
        </div>
      </div>
    );
  }

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

  let tenant = dbUser?.tenant || undefined;

  // Si el usuario no fue creado aún por el webhook, pero sí tenemos el orgId,
  // buscamos el Tenant directamente para saber en qué paso estamos.
  if (!tenant && orgId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: orgId },
    }) || undefined;
  }

  // Si no tiene tenant, es usuario nuevo sin invitación -> Crear Tenant
  // Si tiene tenant pero status es PENDING -> Mostrar Wizard
  // Si status es COMPLETED -> Redirect Dashboard

  if (tenant?.onboardingStatus === 'COMPLETED') {
    return redirect('/dashboard');
  }

  const step = tenant?.onboardingStatus === 'PROFILE_COMPLETED' ? 2 : 1;

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
            title="Precarga KB"
            active={step >= 2}
            completed={false}
          />
        </div>

        {/* Wizard Content */}
        <Card className="border-slate-200 shadow-lg">
          {step === 1 && (
            <OnboardingForm tenantName={dbUser?.tenant?.name || ''} />
          )}
          {step === 2 && orgId && (
            <OnboardingKBStep tenantId={orgId} />
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
