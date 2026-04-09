'use client';

import { OrganizationProfile } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FleetCareRolesTable } from './FleetCareRolesTable';

export default function UserManagementPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Equipo</h2>
          <p className="text-slate-500">
            Administra los miembros de tu organización, roles e invitaciones.
          </p>
        </div>
      </div>

      {/* Sección 1: Clerk — invitaciones y miembros de la organización */}
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <OrganizationProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full mx-auto',
                card: 'shadow-md border border-slate-200',
                navbar: 'hidden md:flex',
                headerTitle: 'text-slate-900',
                headerSubtitle: 'text-slate-500',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Sección 2: Fleet Care roles — roles de negocio no gestionados por Clerk */}
      <Card>
        <CardHeader>
          <CardTitle>Roles Fleet Care</CardTitle>
          <CardDescription>
            Asigna los roles operativos del sistema. Estos roles controlan el acceso a módulos como
            mantenimiento, compras e inventario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FleetCareRolesTable />
        </CardContent>
      </Card>
    </div>
  );
}
