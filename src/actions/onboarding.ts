'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { seedTenantData } from '@/actions/seed-tenant';

export async function updateTenantProfile(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) throw new Error('No organization found');

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
    where: { id: orgId },
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
  if (!orgId) throw new Error('No organization found');

  // Fetch tenant to get country for seeding context
  const tenant = await prisma.tenant.findUnique({
    where: { id: orgId },
  });

  if (!tenant) throw new Error('Tenant not found');

  // Aquí podríamos leer checkbox de tipos de vehículos seleccionados
  // const vehicleTypes = formData.getAll("vehicleTypes");

  await prisma.tenant.update({
    where: { id: orgId },
    data: {
      onboardingStatus: 'COMPLETED',
    },
  });

  // Validar país antes de sembrar
  if (tenant.country) {
    // Ejecutar sembrado (bloqueante por ahora, mover a background job si crece)
    await seedTenantData(orgId, tenant.country);
  }

  redirect('/dashboard');
}
