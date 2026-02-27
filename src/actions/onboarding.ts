'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { seedTenantData } from '@/actions/seed-tenant';

export async function updateTenantProfile(formData: FormData) {
  const { orgId } = await auth();
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || '';

  let tenantId = orgId;
  if (!tenantId) {
    const dbUser = await prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });
    tenantId = dbUser?.tenantId || null;
  }

  if (!tenantId) throw new Error('No organization found');

  const name = formData.get('orgName') as string;
  const country = formData.get('country') as string;

  // Mapeo simple de moneda por país (podría ser una tabla en DB)
  const currencyMap: Record<string, string> = {
    CO: 'COP',
    MX: 'MXN',
    CL: 'CLP',
    AR: 'ARS',
    PE: 'PEN',
    US: 'USD',
  };
  const currency = currencyMap[country] || 'USD';

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name,
      country,
      currency,
      onboardingStatus: 'PROFILE_COMPLETED',
    },
  });

  revalidatePath('/onboarding');
}

export async function completeOnboarding() {
  const { orgId } = await auth();
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || '';

  let tenantId = orgId;
  if (!tenantId) {
    const dbUser = await prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });
    tenantId = dbUser?.tenantId || null;
  }

  if (!tenantId) throw new Error('No organization found');

  // Fetch tenant to get country for seeding context
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) throw new Error('Tenant not found');

  // Aquí podríamos leer checkbox de tipos de vehículos seleccionados
  // const vehicleTypes = formData.getAll("vehicleTypes");

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      onboardingStatus: 'COMPLETED',
    },
  });

  // Validar país antes de sembrar
  if (tenant.country) {
    // Ejecutar sembrado (bloqueante por ahora, mover a background job si crece)
    await seedTenantData(tenantId, tenant.country);
  }

  redirect('/dashboard');
}
