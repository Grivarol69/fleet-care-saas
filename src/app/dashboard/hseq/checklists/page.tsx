'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/hooks/use-toast';

type ChecklistItem = {
  id: string;
  category: string;
  label: string;
  status: string;
  notes: string | null;
};

type Checklist = {
  id: string;
  code: string | null;
  odometer: number;
  status: string;
  notes: string | null;
  createdAt: string;
  vehicle: { id: string; licensePlate: string };
  driver: { id: string; name: string };
  items: ChecklistItem[];
};

const statusConfig: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  OK: {
    label: 'OK',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-800',
  },
  OBSERVATION: {
    label: 'Observación',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  CRITICAL: {
    label: 'Crítico',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-800',
  },
};

const itemStatusConfig: Record<string, string> = {
  OK: 'text-green-700',
  OBSERVATION: 'text-yellow-700',
  CRITICAL: 'text-red-700 font-semibold',
};

const CATEGORY_LABELS: Record<string, string> = {
  lights: 'Luces',
  brakes: 'Frenos',
  tires: 'Neumáticos',
  leaks: 'Fugas',
  seatbelt: 'Cinturón',
  extinguisher: 'Extintor',
};

export default function ChecklistsPage() {
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchChecklists = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/hseq/checklists');
      setChecklists(res.data);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los checklists',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  const filtered = useMemo(() => {
    return checklists.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.vehicle.licensePlate.toLowerCase().includes(q) &&
          !c.driver.name.toLowerCase().includes(q) &&
          !(c.code ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [checklists, search, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const countByStatus = (s: string) =>
    checklists.filter(c => c.status === s).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Checklists Pre-operacionales</h1>
        <p className="text-muted-foreground mt-1">
          Historial de inspecciones diarias realizadas por conductores
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(['OK', 'OBSERVATION', 'CRITICAL'] as const).map(s => {
          const cfg = statusConfig[s];
          return (
            <div
              key={s}
              className="rounded-lg border p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setStatusFilter(prev => (prev === s ? 'all' : s))}
            >
              <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
              <div>
                <p className="text-sm font-medium">{cfg.label}</p>
                <p className="text-2xl font-bold">{countByStatus(s)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Buscar por placa, conductor o código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="OBSERVATION">Observación</SelectItem>
            <SelectItem value="CRITICAL">Crítico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Código</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Odómetro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay checklists
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(checklist => {
                const isOpen = expanded.has(checklist.id);
                const cfg = statusConfig[checklist.status];
                return (
                  <>
                    <TableRow
                      key={checklist.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(checklist.id)}
                    >
                      <TableCell>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {checklist.code ?? '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {checklist.vehicle.licensePlate}
                      </TableCell>
                      <TableCell>{checklist.driver.name}</TableCell>
                      <TableCell>
                        {checklist.odometer.toLocaleString('es')} km
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${cfg?.dot}`}
                          />
                          <Badge className={cfg?.badge}>
                            {cfg?.label ?? checklist.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(
                          new Date(checklist.createdAt),
                          'dd/MM/yy HH:mm',
                          { locale: es }
                        )}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={`${checklist.id}-detail`}>
                        <TableCell
                          colSpan={7}
                          className="bg-muted/30 px-6 py-4"
                        >
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                            {checklist.items.map(item => {
                              const itemCfg = statusConfig[item.status];
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <span
                                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${itemCfg?.dot ?? 'bg-gray-400'}`}
                                  />
                                  <div>
                                    <span className="text-muted-foreground">
                                      {CATEGORY_LABELS[item.category] ??
                                        item.category}
                                      :{' '}
                                    </span>
                                    <span
                                      className={
                                        itemStatusConfig[item.status] ?? ''
                                      }
                                    >
                                      {item.label}
                                    </span>
                                    {item.notes && (
                                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                                        {item.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {checklist.notes && (
                            <p className="mt-3 text-sm text-muted-foreground border-t pt-2">
                              <strong>Notas:</strong> {checklist.notes}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
