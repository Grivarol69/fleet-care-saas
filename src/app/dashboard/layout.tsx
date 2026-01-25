// src/app/dashboard/layout.tsx - Fleet Care SaaS
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar autenticación con Clerk
  const { userId, orgId } = await auth();

  // Si no hay usuario, redirigir a sign-in
  if (!userId) {
    redirect("/sign-in");
  }

  // Si no tiene organización, redirigir a onboarding
  if (!orgId) {
    redirect("/onboarding");
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
