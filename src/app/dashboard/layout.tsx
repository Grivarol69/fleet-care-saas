// src/app/dashboard/layout.tsx - Fleet Care SaaS
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar autenticación
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Si no hay usuario o hay error, redirigir a login
  if (!user || error) {
    redirect("/login");
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
