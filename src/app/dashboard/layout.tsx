// src/app/dashboard/layout.tsx - Fleet Care SaaS
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import React from 'react';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getCurrentUser() maneja:
  // - Usuario con org → retorna user del tenant
  // - SUPER_ADMIN sin org → retorna user del Platform Tenant
  // - Sin auth o sin org y no es SUPER_ADMIN → retorna null
  const user = await getCurrentUser();

  if (!user) {
    redirect('/onboarding');
  }

  if (user.role === 'DRIVER') {
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);

    if (isMobile) {
      redirect('/home');
    }

    return (
      <div className="flex w-full h-screen items-center justify-center bg-[#F1F5F9] p-4">
        <div className="text-center p-8 bg-white shadow-xl rounded-2xl max-w-md border border-gray-200">
          <div className="bg-red-100 text-red-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Como Conductor, debes utilizar la Aplicación Móvil (PWA) desde tu teléfono celular para reportar novedades y realizar pre-operacionales.
          </p>
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
            Abre esta misma dirección desde tu celular para ingresar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full">
      <div className="hidden h-full xl:block w-80 xl:fixed border-r">
        <Sidebar />
      </div>
      <div className="w-full h-full xl:ml-80">
        <Navbar />
        <div className="p-6 h-max">{children}</div>
      </div>
    </div>
  );
}
