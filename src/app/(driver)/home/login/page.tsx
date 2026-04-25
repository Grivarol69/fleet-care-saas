'use client';

import { useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Truck } from 'lucide-react';

type Step = 'credentials' | 'second_factor';

export default function PWALoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get('returnUrl');
  const returnUrl = rawReturnUrl?.startsWith('/home') ? rawReturnUrl : '/home';

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        strategy: 'password',
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push(returnUrl);
      } else if (result.status === 'needs_second_factor') {
        setStep('second_factor');
      } else {
        setError('Error inesperado. Contacta a soporte.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleSecondFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError('');

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'totp',
        code,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push(returnUrl);
      } else {
        setError('Código incorrecto. Intenta de nuevo.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const Spinner = () => (
    <span className="flex items-center justify-center">
      <svg
        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      Verificando...
    </span>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E3A5F] p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 transform transition-all">
        <div className="text-center mb-10">
          <div className="bg-[#1E3A5F] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Fleet Care
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Acceso Conductores</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-center">
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleCredentials} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#1E3A5F]/10 focus:border-[#1E3A5F] transition-all outline-none text-gray-800 bg-gray-50"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#1E3A5F]/10 focus:border-[#1E3A5F] transition-all outline-none text-gray-800 bg-gray-50"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E3A5F] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-[#1E3A5F]/30 hover:bg-[#152a45] hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? <Spinner /> : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSecondFactor} className="space-y-6">
            <div className="text-center text-sm text-gray-600 mb-2">
              Ingresa el código de tu app de autenticación
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código de verificación
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={e =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#1E3A5F]/10 focus:border-[#1E3A5F] transition-all outline-none text-gray-800 bg-gray-50 text-center text-2xl tracking-widest"
                placeholder="000000"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-[#1E3A5F] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-[#1E3A5F]/30 hover:bg-[#152a45] hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? <Spinner /> : 'Verificar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setError('');
                setCode('');
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Volver
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
