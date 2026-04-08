import { getCurrentUser } from '@/lib/auth';
import { canViewAuditLogs } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { AuditLogTable } from './AuditLogTable';

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user || !canViewAuditLogs(user)) redirect('/dashboard');

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Historial de Auditoría</h2>
        <p className="text-slate-500">
          Registro de cambios administrativos realizados en el sistema.
        </p>
      </div>
      <AuditLogTable />
    </div>
  );
}
