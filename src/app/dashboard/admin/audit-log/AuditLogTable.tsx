'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

type AuditEntry = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  changes: unknown;
  createdAt: string;
  actor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

export function AuditLogTable() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/audit-log?page=${page}&limit=${limit}`, {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        setEntries(data.items ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          toast.error('Error cargando historial');
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [page]);

  const goToPage = (p: number) => {
    setLoading(true);
    setPage(p);
  };

  if (loading)
    return <p className="text-sm text-slate-500">Cargando historial...</p>;

  if (!entries.length) {
    return (
      <p className="text-sm text-slate-500">Sin registros de auditoría.</p>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Recurso</TableHead>
            <TableHead>Cambios</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(e => {
            const actorName =
              [e.actor.firstName, e.actor.lastName].filter(Boolean).join(' ') ||
              e.actor.email;
            const changesLabel =
              e.action === 'USER_ROLE_CHANGED' && e.changes
                ? `${(e.changes as { before: string; after: string }).before} → ${(e.changes as { before: string; after: string }).after}`
                : e.action;

            return (
              <TableRow key={e.id}>
                <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString('es-CO')}
                </TableCell>
                <TableCell className="font-medium">{actorName}</TableCell>
                <TableCell>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                    {e.action}
                  </span>
                </TableCell>
                <TableCell>
                  {e.resource}
                  {e.resourceId ? (
                    <span className="ml-1 text-xs text-slate-400">
                      #{e.resourceId.slice(0, 8)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">{changesLabel}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {total} registros · Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
