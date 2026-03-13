'use client';

import { OrganizationProfile } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';


export default function UserManagementPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Equipo</h2>
                    <p className="text-slate-500">
                        Administra los miembros de tu organización, roles e invitaciones.
                    </p>
                </div>
            </div>

            <div className="grid gap-4">
                <Card className="border-none shadow-none bg-transparent">
                    <CardContent className="p-0">
                        {/* 
              Usamos OrganizationProfile de Clerk directamente. 
              Esto permite gestionar miembros, invitaciones y roles.
              El webhook se encargará de sincronizar estos cambios con nuestra BD Prisma.
            */}
                        <OrganizationProfile
                            routing="hash"
                            appearance={{
                                elements: {
                                    rootBox: "w-full mx-auto",
                                    card: "shadow-md border border-slate-200",
                                    navbar: "hidden md:flex", // Ocultamos el navbar lateral si preferimos el look embebido
                                    headerTitle: "text-slate-900",
                                    headerSubtitle: "text-slate-500",
                                },
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
