import { currentUser, auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OrganizationList } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { OnboardingForm } from './components/OnboardingForm';
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

        {/* Wizard Content */}
        <Card className="border-slate-200 shadow-lg">
          <OnboardingForm tenantName={dbUser?.tenant?.name || ''} />
        </Card>
      </div>
    </div>
  );
}
