'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wrench,
  Clock,
  Package,
  Loader2,
  AlertCircle,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

export type SubTask = {
  id: string;
  workOrderItemId: string;
  procedureId: string | null;
  description: string;
  standardHours: number | null;
  directHours: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  sequence: number;
  notes: string | null;
  completedAt: string | null;
};

type Technician = {
  id: string;
  name: string;
  hourlyRate?: number;
};

type ServiceItem = {
  workOrderItemId: number;
  mantItemName: string;
  mantItemType: 'ACTION' | 'SERVICE';
  categoryName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  closureType: string;
  status: string;
  itemSource?: string;
};

type LaborEntry = {
  description: string;
  hours: number | string;
  hourlyRate: number | string;
  laborCost: number | string;
};

type PartEntry = {
  quantity: number | string;
  unitCost: number | string;
  totalCost: number | string;
  inventoryItem: {
    masterPart: {
      code: string | null;
      description: string | null;
    } | null;
  };
};

// Simplified internal ticket type for listing
type InternalTicket = {
  id: string;
  ticketNumber: string;
  ticketDate: string;
  status: string;
  totalLaborHours: number | string;
  totalLaborCost: number | string;
  totalPartsCost: number | string;
  totalCost: number | string;
  technician: { name: string } | null;
  laborEntries: LaborEntry[];
  partEntries: PartEntry[];
};

type Props = {
  workOrderId: string;
  onRefresh: () => void;
};

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  }
> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' },
  COMPLETED: { label: 'Completado', variant: 'default' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
};

const ticketStatusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  }
> = {
  DRAFT: { label: 'Borrador', variant: 'secondary' },
  SUBMITTED: { label: 'Enviado', variant: 'default' },
  APPROVED: { label: 'Aprobado', variant: 'default' },
  REJECTED: { label: 'Rechazado', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
};

const typeConfig = {
  ACTION: { label: 'Acción', className: 'bg-purple-100 text-purple-700' },
  SERVICE: { label: 'Servicio', className: 'bg-green-100 text-green-700' },
};

export function InternalWorkTab({ workOrderId, onRefresh }: Props) {
  const { toast } = useToast();

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [subTasks, setSubTasks] = useState<Record<string, SubTask[]>>({});
  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingSubTasks, setIsLoadingSubTasks] = useState(true);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  // Dialog
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoadingItems(true);
      const res = await axios.get(
        `/api/maintenance/work-orders/${workOrderId}/items?type=SERVICE,ACTION`
      );
      const fetchedItems = (res.data.items || []) as ServiceItem[];

      const internalItems = fetchedItems.filter(
        i => i.itemSource === 'INTERNAL' || i.closureType === 'PENDING'
      );
      setItems(internalItems);
    } catch (error) {
      console.error('Error fetching internal items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los servicios de taller',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingItems(false);
    }
  }, [workOrderId, toast]);

  const fetchSubTasks = useCallback(async () => {
    try {
      setIsLoadingSubTasks(true);
      const res = await axios.get(
        `/api/maintenance/work-orders/${workOrderId}/subtasks`
      );
      setSubTasks(res.data || {});
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    } finally {
      setIsLoadingSubTasks(false);
    }
  }, [workOrderId]);

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoadingTickets(true);
      const res = await axios.get(
        `/api/internal-tickets?workOrderId=${workOrderId}`
      );
      setTickets(res.data || []);
    } catch (error) {
      console.error('Error fetching interal tickets:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los tickets internos',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTickets(false);
    }
  }, [workOrderId, toast]);

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await axios.get('/api/people/technicians');
      setTechnicians(res.data || []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchTickets();
    fetchTechnicians();
    fetchSubTasks();
  }, [fetchItems, fetchTickets, fetchTechnicians, fetchSubTasks]);

  // SubTask Handlers
  const expandTempario = async (workOrderItemId: string) => {
    try {
      await axios.post(
        `/api/maintenance/work-orders/${workOrderId}/subtasks/expand`,
        { workOrderItemId }
      );
      toast({ title: 'Éxito', description: 'Tempario expandido con éxito' });
      fetchSubTasks();
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast({
          title: 'Aviso',
          description: 'El tempario ya fue expandido para esta tarea',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description:
            error.response?.data?.error || 'Error al expandir tempario',
          variant: 'destructive',
        });
      }
    }
  };

  const addManualSubTask = async (workOrderItemId: string) => {
    try {
      await axios.post(`/api/maintenance/work-orders/${workOrderId}/subtasks`, {
        workOrderItemId,
        description: 'Nueva subtarea manual',
        sequence: 0,
      });
      fetchSubTasks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al crear subtarea manual',
        variant: 'destructive',
      });
    }
  };

  const updateSubTask = async (subTaskId: string, changes: any) => {
    try {
      await axios.patch(
        `/api/maintenance/work-orders/${workOrderId}/subtasks/${subTaskId}`,
        changes
      );
      fetchSubTasks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al actualizar subtarea',
        variant: 'destructive',
      });
    }
  };

  const deleteSubTask = async (subTaskId: string) => {
    try {
      await axios.delete(
        `/api/maintenance/work-orders/${workOrderId}/subtasks/${subTaskId}`
      );
      toast({ title: 'Éxito', description: 'Subtarea eliminada' });
      fetchSubTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error.response?.data?.error || 'Error al eliminar subtarea',
        variant: 'destructive',
      });
    }
  };

  // Compute pending items for ticket generation
  const pendingItemsIds = items
    .filter(i => i.closureType === 'PENDING')
    .map(i => i.workOrderItemId);

  const handleGenerateTicket = async () => {
    if (!selectedTechnicianId) {
      toast({
        title: 'Técnico requerido',
        description: 'Selecciona un técnico para el ticket interno',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const pendingItems = items.filter(i => i.closureType === 'PENDING');
      const technician = technicians.find(t => t.id === selectedTechnicianId);
      const hourlyRate = technician?.hourlyRate || 50000;

      const laborEntries = pendingItems.map(item => ({
        description: item.description || item.mantItemName,
        hours: 1,
        hourlyRate,
        workOrderItemId: item.workOrderItemId,
      }));

      await axios.post('/api/internal-tickets', {
        workOrderId,
        technicianId: selectedTechnicianId,
        description: `Ticket interno para servicios OT #${workOrderId}`,
        laborEntries,
        partEntries: [],
      });

      await Promise.all(
        pendingItems.map(item =>
          axios.patch(
            `/api/maintenance/work-orders/${workOrderId}/items/${item.workOrderItemId}`,
            {
              itemSource: 'INTERNAL',
              closureType: 'INTERNAL_TICKET',
            }
          )
        )
      );

      toast({
        title: 'Ticket Creado',
        description: `Ticket interno creado con ${pendingItems.length} tareas`,
      });

      setShowDialog(false);
      setSelectedTechnicianId('');
      fetchItems();
      fetchTickets();
      onRefresh();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : 'Error al crear ticket';
      toast({
        title: 'Error',
        description: message || 'No se pudo crear el ticket interno',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingItems || isLoadingTickets || isLoadingSubTasks) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Aggregate global totals
  const sumTotalLaborHours = tickets.reduce(
    (acc, t) => acc + Number(t.totalLaborHours || 0),
    0
  );
  const sumTotalLaborCost = tickets.reduce(
    (acc, t) => acc + Number(t.totalLaborCost || 0),
    0
  );
  const sumTotalPartsCost = tickets.reduce(
    (acc, t) => acc + Number(t.totalPartsCost || 0),
    0
  );
  const sumGrandTotal = tickets.reduce(
    (acc, t) => acc + Number(t.totalCost || 0),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Items de Taller
            </CardTitle>
            {pendingItemsIds.length > 0 && (
              <Button size="sm" onClick={() => setShowDialog(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Crear Ticket Interno ({pendingItemsIds.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
              No hay tareas de taller asignadas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.workOrderItemId}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {item.description || item.mantItemName}
                    </TableCell>
                    <TableCell>{item.categoryName}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          typeConfig[item.mantItemType]?.className ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {typeConfig[item.mantItemType]?.label ||
                          item.mantItemType}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalCost)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusConfig[item.status]?.variant || 'outline'
                        }
                      >
                        {statusConfig[item.status]?.label || item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subtareas por Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map(item => {
            const wItemIdStr = String(item.workOrderItemId);
            const tasks = subTasks[wItemIdStr] || [];
            const hasProcedure = tasks.some(t => t.procedureId !== null);

            return (
              <Collapsible
                key={wItemIdStr}
                className="border rounded-md p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger className="flex items-center gap-2 font-medium hover:underline">
                    <ChevronDown className="h-4 w-4" />
                    {item.mantItemName} — {tasks.length} subtareas
                  </CollapsibleTrigger>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => expandTempario(wItemIdStr)}
                      disabled={hasProcedure}
                    >
                      Expandir Tempario
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addManualSubTask(wItemIdStr)}
                    >
                      Agregar manual
                    </Button>
                  </div>
                </div>
                <CollapsibleContent>
                  {tasks.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="w-[100px]">
                              Hs Estándar
                            </TableHead>
                            <TableHead className="w-[120px]">
                              Hs Directas
                            </TableHead>
                            <TableHead className="w-[120px]">Estado</TableHead>
                            <TableHead className="text-right">
                              Acciones
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map(task => (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium text-sm">
                                <Input
                                  className="h-8 p-1 text-sm border-transparent focus:border-input bg-transparent hover:bg-muted font-medium w-full"
                                  defaultValue={task.description}
                                  onBlur={e => {
                                    if (e.target.value !== task.description)
                                      updateSubTask(task.id, {
                                        description: e.target.value,
                                      });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                {task.standardHours !== null
                                  ? Number(task.standardHours).toFixed(2)
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  defaultValue={task.directHours ?? ''}
                                  onBlur={e => {
                                    const val = e.target.value
                                      ? parseFloat(e.target.value)
                                      : null;
                                    if (val !== task.directHours)
                                      updateSubTask(task.id, {
                                        directHours: val,
                                      });
                                  }}
                                  className="w-full h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={task.status}
                                  onValueChange={val =>
                                    updateSubTask(task.id, { status: val })
                                  }
                                >
                                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none p-0 focus:ring-0">
                                    <SelectValue>
                                      <Badge
                                        variant={
                                          task.status === 'DONE'
                                            ? 'default'
                                            : task.status === 'IN_PROGRESS'
                                              ? 'default'
                                              : task.status === 'CANCELLED'
                                                ? 'outline'
                                                : 'secondary'
                                        }
                                        className={
                                          task.status === 'DONE'
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : ''
                                        }
                                      >
                                        {task.status === 'DONE'
                                          ? 'Completado'
                                          : task.status === 'IN_PROGRESS'
                                            ? 'En Progreso'
                                            : task.status === 'CANCELLED'
                                              ? 'Cancelado'
                                              : 'Pendiente'}
                                      </Badge>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PENDING">
                                      Pendiente
                                    </SelectItem>
                                    <SelectItem value="IN_PROGRESS">
                                      En Progreso
                                    </SelectItem>
                                    <SelectItem value="DONE">
                                      Completado
                                    </SelectItem>
                                    <SelectItem value="CANCELLED">
                                      Cancelado
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:bg-red-50"
                                  onClick={() => deleteSubTask(task.id)}
                                  disabled={task.status !== 'PENDING'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      No hay subtareas registradas para este item.
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tickets del Taller ({tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se han generado tickets de taller aún
            </div>
          ) : (
            tickets.map(ticket => (
              <Card key={ticket.id} className="overflow-hidden">
                <div className="bg-muted p-3 flex justify-between items-center bg-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      Ticket #
                      {ticket.ticketNumber || ticket.id.slice(-6).toUpperCase()}
                    </span>
                    <Badge
                      variant={
                        ticketStatusConfig[ticket.status]?.variant || 'outline'
                      }
                    >
                      {ticketStatusConfig[ticket.status]?.label ||
                        ticket.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex gap-4">
                    <span>{ticket.technician?.name || 'Sin asignar'}</span>
                    <span>
                      {new Date(ticket.ticketDate).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {ticket.laborEntries?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-blue-800 flex items-center mb-2">
                        <Clock className="w-4 h-4 mr-1" />
                        Mano de Obra
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b">
                            <TableHead className="h-8 py-1">
                              Descripción
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right">
                              Horas
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right">
                              Tarifa/hr
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right">
                              Total
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ticket.laborEntries.map((l, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="py-2">
                                {l.description}
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                {Number(l.hours).toFixed(1)}
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                {formatCurrency(Number(l.hourlyRate))}
                              </TableCell>
                              <TableCell className="py-2 text-right font-medium">
                                {formatCurrency(Number(l.laborCost))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <tfoot>
                          <TableRow>
                            <TableCell className="font-medium py-2">
                              Total Mano de Obra
                            </TableCell>
                            <TableCell className="text-right font-bold py-2">
                              {Number(ticket.totalLaborHours || 0).toFixed(1)}
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-right font-bold py-2">
                              {formatCurrency(Number(ticket.totalLaborCost))}
                            </TableCell>
                          </TableRow>
                        </tfoot>
                      </Table>
                    </div>
                  )}

                  {ticket.partEntries?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-amber-800 flex items-center mb-2">
                        <Package className="w-4 h-4 mr-1" />
                        Repuestos Consumidos
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b">
                            <TableHead className="h-8 py-1">Código</TableHead>
                            <TableHead className="h-8 py-1">
                              Descripción
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right">
                              Cant
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right">
                              Costo Unit
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right">
                              Total
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ticket.partEntries.map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="py-2">
                                {p.inventoryItem.masterPart?.code || '-'}
                              </TableCell>
                              <TableCell className="py-2">
                                {p.inventoryItem.masterPart?.description || '-'}
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                {Number(p.quantity)}
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                {formatCurrency(Number(p.unitCost))}
                              </TableCell>
                              <TableCell className="py-2 text-right font-medium">
                                {formatCurrency(Number(p.totalCost))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <tfoot>
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="font-medium text-right py-2"
                            >
                              Total Repuestos
                            </TableCell>
                            <TableCell className="text-right font-bold py-2">
                              {formatCurrency(Number(ticket.totalPartsCost))}
                            </TableCell>
                          </TableRow>
                        </tfoot>
                      </Table>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t text-sm">
                    <span className="text-muted-foreground mr-4">
                      Total Ticket:
                    </span>
                    <span className="font-bold text-lg">
                      {formatCurrency(Number(ticket.totalCost))}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* FOOTER TOTALS */}
      {tickets.length > 0 && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">
                  Total Horas
                </span>
                <p className="text-2xl font-bold">
                  {sumTotalLaborHours.toFixed(1)} hs
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">
                  Total Mano de Obra
                </span>
                <p className="text-2xl font-bold text-slate-700">
                  {formatCurrency(sumTotalLaborCost)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">
                  Total Repuestos
                </span>
                <p className="text-2xl font-bold text-slate-700">
                  {formatCurrency(sumTotalPartsCost)}
                </p>
              </div>
              <div className="space-y-1 border-l pl-6 border-slate-200">
                <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">
                  Costo Taller Total
                </span>
                <p className="text-3xl font-black text-slate-900">
                  {formatCurrency(sumGrandTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Ticket Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Ticket Interno</DialogTitle>
            <DialogDescription>
              Se creará un ticket para {pendingItemsIds.length} tarea(s) de
              taller pendiente(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Técnico Asignado</label>
              <Select
                value={selectedTechnicianId}
                onValueChange={setSelectedTechnicianId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-muted p-3">
              <h4 className="font-medium mb-2">Tareas a asignar:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {items
                  .filter(i => i.closureType === 'PENDING')
                  .map(item => (
                    <li key={item.workOrderItemId}>{item.mantItemName}</li>
                  ))}
              </ul>
            </div>

            {technicians.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                No hay técnicos registrados
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateTicket}
              disabled={isSubmitting || !selectedTechnicianId}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
