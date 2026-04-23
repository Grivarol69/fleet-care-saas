'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = searchParams.get('items') ?? '0';
  const isOffline = searchParams.get('offline') === '1';

  useEffect(() => {
    const timer = setTimeout(() => router.push('/home'), 4000);
    return () => clearTimeout(timer);
  }, [router]);

  const today = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#F1F5F9]">
      <CheckCircle2 className="w-20 h-20 text-green-600 mb-6" />

      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        {isOffline ? '¡Guardado localmente!' : '¡Checklist completado!'}
      </h1>

      {isOffline ? (
        <p className="text-sm text-slate-500 mb-6">
          Se enviará al servidor cuando recuperes la conexión.
        </p>
      ) : (
        <p className="text-sm text-slate-500 mb-2">{today}</p>
      )}

      {!isOffline && items !== '0' && (
        <p className="text-sm text-slate-500 mb-6">
          {items} ítems inspeccionados
        </p>
      )}

      <p className="text-sm text-slate-400 mb-8">
        Si reportaste ítems críticos, informá a tu supervisor.
      </p>

      <button
        onClick={() => router.push('/home')}
        className="w-full max-w-xs h-12 bg-primary text-white rounded-xl font-semibold"
      >
        Ir al inicio
      </button>

      <p className="text-xs text-slate-300 mt-4">
        Redirigiendo en 4 segundos...
      </p>
    </div>
  );
}

export default function SuccessScreen() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
