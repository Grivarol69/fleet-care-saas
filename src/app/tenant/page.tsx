'use client';

import { useEffect, useState } from 'react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  createdAt: string;
  industryPreset?: string;
  businessType?: string;
  maxVehicles: number;
  onboardingCompleted: boolean;
}

export default function TenantDashboard() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener tenant slug desde la URL del navegador
  const getTenantSlug = (): string | null => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (
        parts.length > 1 &&
        parts[0] &&
        parts[0] !== 'localhost' &&
        parts[0] !== 'www'
      ) {
        console.log('🎯 Tenant slug extraído del hostname:', parts[0]);
        return parts[0];
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchTenant = async () => {
      const tenantSlug = getTenantSlug();

      if (!tenantSlug) {
        setError('No se especificó el tenant');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching tenant:', tenantSlug);
        const response = await fetch(`/api/tenants/slug/${tenantSlug}`);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const tenantData = await response.json();
        console.log('✅ Tenant data received:', tenantData);
        setTenant(tenantData);
      } catch (error) {
        console.error('❌ Error fetching tenant:', error);
        setError(error instanceof Error ? error.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando información del tenant...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Tenant no encontrado</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🎉 Dashboard - {tenant.name}
          </h1>
          <p className="text-gray-600 mt-2">
            Slug: {tenant.slug} | Multi-tenant funcionando correctamente ✅
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card básica de información */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Información del Tenant
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>ID:</strong> {tenant.id}
              </div>
              <div>
                <strong>Nombre:</strong> {tenant.name}
              </div>
              <div>
                <strong>Slug:</strong> {tenant.slug}
              </div>
              <div>
                <strong>Estado:</strong> {tenant.subscriptionStatus}
              </div>
              <div>
                <strong>Creado:</strong>{' '}
                {new Date(tenant.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Card de preset de industria */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Configuración</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Preset:</strong>{' '}
                {tenant.industryPreset || 'No configurado'}
              </div>
              <div>
                <strong>Tipo:</strong>{' '}
                {tenant.businessType || 'No especificado'}
              </div>
              <div>
                <strong>Máx. Vehículos:</strong> {tenant.maxVehicles}
              </div>
              <div>
                <strong>Onboarding:</strong>{' '}
                {tenant.onboardingCompleted ? 'Completado' : 'Pendiente'}
              </div>
            </div>
          </div>

          {/* Card de éxito */}
          <div className="bg-green-50 rounded-lg shadow p-6 border border-green-200">
            <h3 className="text-lg font-semibold mb-4 text-green-800">
              🚀 Multi-tenant OK
            </h3>
            <div className="text-green-700 text-sm">
              <p>✅ Middleware detectando subdomain</p>
              <p>✅ API de tenants funcionando</p>
              <p>✅ Datos cargados correctamente</p>
              <p>✅ URL rewrite funcionando</p>
            </div>
          </div>
        </div>

        {/* Debug info (temporal) */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(tenant, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
