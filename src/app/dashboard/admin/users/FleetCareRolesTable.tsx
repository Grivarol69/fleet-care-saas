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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type UserRole =
  | 'OWNER'
  | 'MANAGER'
  | 'COORDINATOR'
  | 'PURCHASER'
  | 'TECHNICIAN'
  | 'DRIVER';

type UserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  createdAt: string;
};

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Propietario',
  MANAGER: 'Gerente',
  COORDINATOR: 'Coordinador',
  PURCHASER: 'Compras',
  TECHNICIAN: 'Técnico',
  DRIVER: 'Conductor',
};

const ROLE_COLORS: Record<UserRole, string> = {
  OWNER: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  COORDINATOR: 'bg-cyan-100 text-cyan-800',
  PURCHASER: 'bg-amber-100 text-amber-800',
  TECHNICIAN: 'bg-green-100 text-green-800',
  DRIVER: 'bg-slate-100 text-slate-800',
};

const ASSIGNABLE_ROLES: UserRole[] = [
  'MANAGER',
  'COORDINATOR',
  'PURCHASER',
  'TECHNICIAN',
  'DRIVER',
];

export function FleetCareRolesTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Error cargando usuarios');
        setLoading(false);
      });
  }, []);

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdating(userId);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast.success('Rol actualizado');
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Error actualizando rol');
    }
    setUpdating(null);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando usuarios...</p>;
  }

  if (!users.length) {
    return <p className="text-sm text-slate-500">No hay usuarios en este tenant.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol actual</TableHead>
          <TableHead>Cambiar rol</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(u => {
          const isOwner = u.role === 'OWNER';
          const displayName =
            [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;

          return (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{displayName}</TableCell>
              <TableCell className="text-slate-500">{u.email}</TableCell>
              <TableCell>
                <Badge className={ROLE_COLORS[u.role]}>
                  {ROLE_LABELS[u.role]}
                </Badge>
              </TableCell>
              <TableCell>
                {isOwner ? (
                  <span className="text-xs text-slate-400">No modificable</span>
                ) : (
                  <Select
                    value={u.role}
                    onValueChange={val => handleRoleChange(u.id, val as UserRole)}
                    disabled={updating === u.id}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map(role => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
