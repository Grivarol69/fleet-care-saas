'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingKBForm } from '@/components/onboarding/OnboardingKBForm';
import { completeOnboarding } from '@/actions/onboarding';

export function OnboardingKBStep({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const result = await completeOnboarding();
    if (result.success) {
      router.push('/dashboard');
      return { success: true };
    }
    const msg = result.error ?? 'Error al completar el onboarding. Intenta de nuevo.';
    setError(msg);
    return { success: false, error: msg };
  }, [router]);

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void handleSuccess()}
            className="ml-4 underline hover:no-underline font-medium"
          >
            Reintentar
          </button>
        </div>
      )}
      <OnboardingKBForm tenantId={tenantId} onSuccess={handleSuccess} />
    </div>
  );
}
