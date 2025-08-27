/* "use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";


export default function OnboardingPage() {
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(false);
  const { createTenantAfterSignup, user } = useAuth({
    requireAuth: true,
    requireTenant: false,
  });

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim()) return;

    try {
      setLoading(true);
      await createTenantAfterSignup(tenantName);
    } catch (error) {
      console.error("Error creating tenant:", error);
      alert("Error al crear la organización");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">
            Configuración Inicial
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Bienvenido {user?.email}. Configura tu organización.
          </p>
        </div>

        <form onSubmit={handleCreateTenant} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre de la Organización
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Mi Empresa de Transporte"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !tenantName.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Organización"}
          </button>
        </form>
      </div>
    </div>
  );
}
 */
