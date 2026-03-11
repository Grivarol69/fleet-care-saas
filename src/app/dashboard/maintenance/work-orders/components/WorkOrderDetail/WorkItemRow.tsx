'use client';

import { useState } from 'react';
import axios from 'axios';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ChevronDown, Loader2, Trash2, Search } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { canViewCosts } from '@/lib/permissions';
import { TemparioPickerModal } from './TemparioPickerModal';

type SubTask = {
  id: string;
  description: string;
  standardHours: number | null;
  directHours: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  sequence: number;
  procedureId?: string | null;
};

type WorkOrderItemSummary = {
  id: string;
  description: string;
  itemSource: string | null;
  closureType: string | null;
  notes: string | null;
  status: string;
  unitPrice: number;
  quantity: number;
  totalCost: number;
  mantItem: {
    id: string;
    name: string;
    type: string;
  };
};

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

type WorkItemRowProps = {
  workOrderId: string;
  item: WorkOrderItemSummary;
  currentUser: CurrentUser;
  onRefresh: () => void;
};

const closureTypeLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  INTERNAL_TICKET: 'Ticket Taller',
  PURCHASE_ORDER: 'Orden Compra',
};

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'outline' | 'secondary' | 'default' | 'destructive';
  }
> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' },
  COMPLETED: { label: 'Completado', variant: 'default' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
};

export function WorkItemRow({
  workOrderId,
  item,
  currentUser,
  onRefresh,
}: WorkItemRowProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const showCosts = canViewCosts(currentUser as any);

  const fetchSubtasks = async () => {
    try {
      setIsLoadingSubtasks(true);
      const res = await axios.get(
        `/api/maintenance/work-orders/${workOrderId}/subtasks?workOrderItemId=${item.id}`
      );
      const data = res.data;
      if (Array.isArray(data)) {
        setSubtasks(data);
      } else if (data[item.id]) {
        setSubtasks(data[item.id]);
      }
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    } finally {
      setIsLoadingSubtasks(false);
    }
  };

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchSubtasks();
    }
  };

  const handleUpdateSubtask = async (subtaskId: string, updates: any) => {
    try {
      await axios.patch(
        `/api/maintenance/work-orders/${workOrderId}/subtasks/${subtaskId}`,
        updates
      );
      setSubtasks(prev =>
        prev.map(st => (st.id === subtaskId ? { ...st, ...updates } : st))
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la subtarea',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await axios.delete(
        `/api/maintenance/work-orders/${workOrderId}/subtasks/${subtaskId}`
      );
      setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
      toast({ title: 'Éxito', description: 'Subtarea eliminada' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Collapsible
        open={isOpen}
        onOpenChange={handleToggle}
        className="border rounded-md overflow-hidden bg-card"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
              <span className="font-semibold text-sm">
                {item.mantItem.name}
              </span>
              <Badge variant={statusConfig[item.status]?.variant || 'outline'}>
                {statusConfig[item.status]?.label || item.status}
              </Badge>
              {item.closureType && item.closureType !== 'PENDING' && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {closureTypeLabels[item.closureType] || item.closureType}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-6">
              {showCosts && (
                <div className="flex gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase">
                      Unitario
                    </p>
                    <p className="font-mono">
                      {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase">
                      Total
                    </p>
                    <p className="font-bold font-mono">
                      {formatCurrency(item.totalCost)}
                    </p>
                  </div>
                </div>
              )}
              {!showCosts && (
                <div className="text-sm font-medium">
                  {item.quantity}{' '}
                  {item.mantItem.type === 'PART' ? 'und' : 'serv'}
                </div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t bg-muted/20">
          <div className="p-4 space-y-4">
            {item.notes && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground px-1">
                  Notas del item
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 p-3 rounded-md">
                  {item.notes}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  Hoja de Trabajo / Subtareas
                  {isLoadingSubtasks && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-[11px]"
                    onClick={e => {
                      e.stopPropagation();
                      setShowPicker(true);
                    }}
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Agregar desde Tempario
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[100px]">Est. (hs)</TableHead>
                    <TableHead className="w-[100px]">Dir. (hs)</TableHead>
                    <TableHead className="w-[140px]">Estado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subtasks.length === 0 && !isLoadingSubtasks && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-muted-foreground text-xs italic"
                      >
                        Sin subtareas. Agregá desde el Tempario o manualmente.
                      </TableCell>
                    </TableRow>
                  )}
                  {subtasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Input
                          className="h-8 text-xs bg-transparent border-transparent hover:border-input focus:bg-background"
                          defaultValue={task.description}
                          onBlur={e => {
                            if (e.target.value !== task.description)
                              handleUpdateSubtask(task.id, {
                                description: e.target.value,
                              });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {task.standardHours || '—'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          className="h-8 text-xs w-20"
                          defaultValue={task.directHours || ''}
                          onBlur={e => {
                            const val = e.target.value
                              ? parseFloat(e.target.value)
                              : null;
                            if (val !== task.directHours)
                              handleUpdateSubtask(task.id, {
                                directHours: val,
                              });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={val =>
                            handleUpdateSubtask(task.id, { status: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pendiente</SelectItem>
                            <SelectItem value="IN_PROGRESS">
                              En Progreso
                            </SelectItem>
                            <SelectItem value="DONE">Completado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSubtask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <TemparioPickerModal
        open={showPicker}
        onOpenChange={setShowPicker}
        workOrderId={workOrderId}
        workOrderItemId={item.id}
        nextSequence={subtasks.length}
        onSuccess={() => {
          fetchSubtasks();
          onRefresh();
        }}
      />
    </>
  );
}
