'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreHorizontal, Eye, Wrench, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/hooks/use-toast';

type Incident = {
  id: string;
  code: string | null;
  description: string;
  severity: string;
  status: string;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  vehicle: { id: string; licensePlate: string };
  driver: { id: string; name: string } | null;
  workOrder: { id: string; code: string } | null;
};

const severityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Baja', className: 'bg-blue-100 text-blue-800' },
  MEDIUM: { label: 'Media', className: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: 'Alta', className: 'bg-orange-100 text-orange-800' },
  CRITICAL: { label: 'Crítica', className: 'bg-red-100 text-red-800' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  REPORTED: { label: 'Reportada', className: 'bg-gray-100 text-gray-700' },
  REVIEWED: { label: 'Revisada', className: 'bg-blue-100 text-blue-700' },
  WO_CREATED: { label: 'OT Creada', className: 'bg-green-100 text-green-700' },
  DISMISSED: { label: 'Desestimada', className: 'bg-red-100 text-red-700' },
};

const STATUS_TABS = [
  'ALL',
  'REPORTED',
  'REVIEWED',
  'WO_CREATED',
  'DISMISSED',
] as const;

type Modal =
  | { type: 'review'; incident: Incident }
  | { type: 'promote'; incident: Incident }
  | { type: 'dismiss'; incident: Incident };

export default function IncidentsPage() {
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [modal, setModal] = useState<Modal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // promote-to-wo form
  const [woForm, setWoForm] = useState({
    title: '',
    priority: 'MEDIUM',
    mantType: 'CORRECTIVE',
    workType: 'EXTERNAL',
  });
  // dismiss form
  const [dismissNote, setDismissNote] = useState('');

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/hseq/incidents');
      setIncidents(res.data);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las novedades',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filtered = useMemo(() => {
    return incidents.filter(i => {
      if (activeTab !== 'ALL' && i.status !== activeTab) return false;
      if (severityFilter !== 'all' && i.severity !== severityFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !i.description.toLowerCase().includes(q) &&
          !i.vehicle.licensePlate.toLowerCase().includes(q) &&
          !(i.code ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [incidents, activeTab, severityFilter, search]);

  const handleReview = async () => {
    if (!modal || modal.type !== 'review') return;
    setSubmitting(true);
    try {
      await axios.patch(`/api/hseq/incidents/${modal.incident.id}`, {
        status: 'REVIEWED',
      });
      toast({ title: 'Novedad marcada como revisada' });
      setModal(null);
      fetchIncidents();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromote = async () => {
    if (!modal || modal.type !== 'promote') return;
    if (!woForm.title.trim()) {
      toast({ title: 'El título es requerido', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `/api/hseq/incidents/${modal.incident.id}/promote-to-wo`,
        woForm
      );
      toast({ title: 'Orden de trabajo creada' });
      setModal(null);
      setWoForm({
        title: '',
        priority: 'MEDIUM',
        mantType: 'CORRECTIVE',
        workType: 'EXTERNAL',
      });
      fetchIncidents();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? 'Error al crear OT';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!modal || modal.type !== 'dismiss') return;
    setSubmitting(true);
    try {
      await axios.patch(`/api/hseq/incidents/${modal.incident.id}`, {
        status: 'DISMISSED',
        dismissNote,
      });
      toast({ title: 'Novedad desestimada' });
      setModal(null);
      setDismissNote('');
      fetchIncidents();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Novedades HSEQ</h1>
        <p className="text-muted-foreground mt-1">
          Incidentes reportados por conductores en campo
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map(tab => {
          const count =
            tab === 'ALL'
              ? incidents.length
              : incidents.filter(i => i.status === tab).length;
          const isActive = activeTab === tab;
          const label =
            tab === 'ALL' ? 'Todas' : (statusConfig[tab]?.label ?? tab);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-background/20' : 'bg-muted-foreground/10'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Buscar por descripción, placa o código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="LOW">Baja</SelectItem>
            <SelectItem value="MEDIUM">Media</SelectItem>
            <SelectItem value="HIGH">Alta</SelectItem>
            <SelectItem value="CRITICAL">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>OT</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay novedades
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(incident => {
                const sev = severityConfig[incident.severity];
                const sta = statusConfig[incident.status];
                return (
                  <TableRow key={incident.id}>
                    <TableCell className="font-mono text-sm">
                      {incident.code ?? '—'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {incident.vehicle.licensePlate}
                    </TableCell>
                    <TableCell>{incident.driver?.name ?? '—'}</TableCell>
                    <TableCell
                      className="max-w-xs truncate"
                      title={incident.description}
                    >
                      {incident.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={sev?.className}>
                        {sev?.label ?? incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={sta?.className}>
                        {sta?.label ?? incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {incident.workOrder ? (
                        <span className="text-sm font-mono text-green-700">
                          {incident.workOrder.code}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(incident.createdAt), 'dd/MM/yy HH:mm', {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {incident.status === 'REPORTED' && (
                            <DropdownMenuItem
                              onClick={() =>
                                setModal({ type: 'review', incident })
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Marcar revisada
                            </DropdownMenuItem>
                          )}
                          {incident.status !== 'WO_CREATED' &&
                            incident.status !== 'DISMISSED' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setModal({ type: 'promote', incident })
                                }
                              >
                                <Wrench className="mr-2 h-4 w-4" />
                                Crear OT
                              </DropdownMenuItem>
                            )}
                          {incident.status !== 'DISMISSED' &&
                            incident.status !== 'WO_CREATED' && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setModal({ type: 'dismiss', incident })
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Desestimar
                              </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal: Revisar */}
      <Dialog
        open={modal?.type === 'review'}
        onOpenChange={open => !open && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como revisada</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Confirmás que revisaste la novedad{' '}
            <strong>
              {modal?.type === 'review' ? modal.incident.code : ''}
            </strong>
            ?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleReview} disabled={submitting}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Crear OT */}
      <Dialog
        open={modal?.type === 'promote'}
        onOpenChange={open => !open && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Orden de Trabajo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={woForm.title}
                onChange={e =>
                  setWoForm(p => ({ ...p, title: e.target.value }))
                }
                placeholder="Ej: Reparación de frenos"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridad</Label>
                <Select
                  value={woForm.priority}
                  onValueChange={v => setWoForm(p => ({ ...p, priority: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de mantenimiento</Label>
                <Select
                  value={woForm.mantType}
                  onValueChange={v => setWoForm(p => ({ ...p, mantType: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                    <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
                    <SelectItem value="PREDICTIVE">Predictivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tipo de trabajo</Label>
              <Select
                value={woForm.workType}
                onValueChange={v => setWoForm(p => ({ ...p, workType: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Interno</SelectItem>
                  <SelectItem value="EXTERNAL">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handlePromote} disabled={submitting}>
              Crear OT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Desestimar */}
      <Dialog
        open={modal?.type === 'dismiss'}
        onOpenChange={open => !open && setModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desestimar novedad</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={dismissNote}
              onChange={e => setDismissNote(e.target.value)}
              placeholder="Explicar por qué se desestima..."
              className="mt-1"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDismiss}
              disabled={submitting}
            >
              Desestimar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
