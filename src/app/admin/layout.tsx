import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Building2,
  FileBox,
  Settings,
  ArrowLeft,
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Verificar que el usuario es SUPER_ADMIN
  if (!user || !user.isSuperAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-slate-900 text-white p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-blue-400">Fleet Care</h1>
          <p className="text-sm text-slate-400">Panel de Administración</p>
        </div>

        <nav className="space-y-2">
          <Link href="/admin">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-slate-800"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          <Link href="/admin/tenants">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-slate-800"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Tenants
            </Button>
          </Link>

          <Link href="/admin/templates">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-slate-800"
            >
              <FileBox className="mr-2 h-4 w-4" />
              Templates Globales
            </Button>
          </Link>

          <Link href="/admin/settings">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-slate-800"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Button>
          </Link>

          <div className="pt-8">
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="w-full justify-start text-slate-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400">Logueado como</p>
            <p className="text-sm font-medium">{user.email}</p>
            <p className="text-xs text-blue-400">SUPER_ADMIN</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-slate-100">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
