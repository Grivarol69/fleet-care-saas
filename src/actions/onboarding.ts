'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function completeOnboarding(): Promise<{ success: boolean; error?: string }> {
  try {
    const dbUser = await getCurrentUser();

    if (!dbUser || !dbUser.tenantId) {
      return { success: false, error: 'No organization found' };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: dbUser.tenantId } });
    if (!tenant || tenant.onboardingStatus !== 'PROFILE_COMPLETED') {
      return { success: false, error: 'Debe completar el perfil primero' };
    }

    await prisma.tenant.update({
      where: { id: dbUser.tenantId },
      data: { onboardingStatus: 'COMPLETED' },
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Onboarding] completeOnboarding Error:', err);
    return { success: false, error: err.message || 'Error completing onboarding' };
  }
}

export async function updateTenantProfile(
  _prevState: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  console.log('[Onboarding] updateTenantProfile triggered. Payload:', Object.fromEntries(formData.entries()));

  try {
    const dbUser = await getCurrentUser();

    if (!dbUser || !dbUser.tenantId) {
      console.error(`[Onboarding] No organization found for user.`);
      return { success: false, error: 'No organization found. Por favor recarga la página en unos segundos.' };
    }

    const tenantId = dbUser.tenantId;

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

    console.log(`[Onboarding] Updating tenant ${tenantId} with country=${country}, currency=${currency}`);

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        country,
        currency,
        onboardingStatus: 'PROFILE_COMPLETED',
      },
    });

    console.log(`[Onboarding] Successfully updated tenant profile!`, updated.id);

  } catch (err: any) {
    console.error('[Onboarding] Server Action Error:', err);
    return { success: false, error: err.message || 'Error occurred during profile update.' };
  }

  // Perfil guardado, redirigir a paso 2
  redirect('/onboarding');
}
