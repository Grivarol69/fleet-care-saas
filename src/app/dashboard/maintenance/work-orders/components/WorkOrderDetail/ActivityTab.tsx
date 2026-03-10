'use client';

import { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FilePlus,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';

type Approval = {
  id: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
};

type ActivityTabProps = {
  workOrder: {
    id: string;
    createdAt: string;
    approvals: Approval[];
  };
  onRefresh: () => void;
};

const statusLabelMap: Record<string, string> = {
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Trabajo',
  COMPLETED: 'Cerrada',
  PENDING_INVOICE: 'Por Cerrar',
  CANCELLED: 'Cancelada',
};

export function ActivityTab({ workOrder, onRefresh }: ActivityTabProps) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedApprovals = [...(workOrder.approvals || [])].sort((a, b) => {
    const dateA = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
    const dateB = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
    return dateA - dateB;
  });

  const handleAddNote = async () => {
    if (!note.trim()) return;

    try {
      setIsSubmitting(true);
      await axios.post(
        `/api/maintenance/work-orders/${workOrder.id}/expenses`,
        {
          description: note,
          amount: 0,
          expenseType: 'OTHER',
          expenseDate: new Date().toISOString(),
        }
      );

      toast({
        title: 'Nota agregada',
        description: 'La nota se ha guardado correctamente como actividad.',
      });

      setNote('');
      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la nota.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Historial de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0 pb-8">
            {/* Timeline Line */}
            <div className="absolute left-[19px] top-2 bottom-0 w-px bg-muted-foreground/20" />

            {/* Event: Created */}
            <div className="relative pl-12 pb-8">
              <div className="absolute left-0 top-0 p-2 bg-blue-50 rounded-full border border-blue-200">
                <FilePlus className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold">Orden de trabajo creada</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(workOrder.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
            </div>

            {/* Event: Approvals/Status Changes */}
            {sortedApprovals.length === 0 ? (
              <div className="relative pl-12 pb-8">
                <p className="text-sm text-muted-foreground italic">
                  No hay actividad registrada aún
                </p>
              </div>
            ) : (
              sortedApprovals.map(approval => {
                const isApproved = approval.status === 'APPROVED';
                const isRejected = approval.status === 'REJECTED';

                let Icon = Clock;
                let iconColor = 'text-gray-500';
                let bgColor = 'bg-gray-50';
                let borderColor = 'border-gray-200';

                if (isApproved) {
                  Icon = CheckCircle;
                  iconColor = 'text-green-600';
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-200';
                } else if (isRejected) {
                  Icon = XCircle;
                  iconColor = 'text-red-600';
                  bgColor = 'bg-red-50';
                  borderColor = 'border-red-200';
                }

                return (
                  <div key={approval.id} className="relative pl-12 pb-8">
                    <div
                      className={`absolute left-0 top-0 p-2 ${bgColor} rounded-full border ${borderColor}`}
                    >
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold">
                        Cambió a{' '}
                        {statusLabelMap[approval.status] || approval.status}
                        {approval.approvedBy && ` por ${approval.approvedBy}`}
                      </p>
                      {approval.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md my-1 border-l-2 border-muted-foreground/20">
                          {approval.notes}
                        </p>
                      )}
                      {approval.approvedAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(approval.approvedAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Add Note Section */}
            <div className="relative pl-12 mt-4">
              <div className="absolute left-0 top-0 p-2 bg-purple-50 rounded-full border border-purple-200">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-3">
                <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-muted-foreground/30">
                  <h4 className="text-sm font-medium mb-2">
                    Agregar nota / comentario
                  </h4>
                  <Textarea
                    placeholder="Escribe una actualización o nota interna..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="min-h-[100px] bg-background text-sm"
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!note.trim() || isSubmitting}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Guardar nota
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
