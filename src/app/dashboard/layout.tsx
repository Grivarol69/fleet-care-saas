// src/app/dashboard/layout.tsx - Fleet Care SaaS
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
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
