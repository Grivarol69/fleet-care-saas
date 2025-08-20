"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  //const [user, setUser] = useState<User | null>(null);
  //const [loading, setLoading] = useState(true);
  const router = useRouter();

  //useEffect(() => {
  //  const getUser = async () => {
  //    const {
  //      data: { user },
  //    } = await supabase.auth.getUser();
  //
  //    if (!user) {
  //      router.push("/login");
  //      return;
  //    }

  //    setUser(user);
  //    setLoading(false);
  //  };

  //  getUser();
  //}, [router]);

  const { user, loading, signOut } = useAuth();

  const handleLogout = async () => {
    // Logout de Supabase
    await supabase.auth.signOut();

    // Limpiar manualmente todas las cookies sb-
    const cookies = document.cookie.split(";");
    cookies.forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith("sb-")) {
        // Eliminar cookie
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
      }
    });

    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Fleet Care SaaS
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.email}</span>

              {/* <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
              */}

              <button
                onClick={signOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🎉 ¡Bienvenido a Fleet Care SaaS!
              </h2>
              <p className="text-gray-600 mb-4">
                Tu aplicación SaaS está funcionando correctamente
              </p>
              <p className="text-sm text-gray-500">Usuario: {user?.email}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
