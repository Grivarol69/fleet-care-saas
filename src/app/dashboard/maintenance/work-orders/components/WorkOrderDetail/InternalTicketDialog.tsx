'use client';

import { useState } from 'react';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import { Loader2, Ticket } from 'lucide-react';
import { TicketPDF } from './TicketPDF';
import type { WorkOrderItem, WorkOrderSummary } from './TicketPDF';

type InternalTicketDialogProps = {
  workOrderId: string;
  pendingItems: WorkOrderItem[];
  workOrder: WorkOrderSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function InternalTicketDialog({
  workOrderId,
  pendingItems,
  workOrder,
  open,
  onOpenChange,
  onSuccess,
}: InternalTicketDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const services = pendingItems.filter(i => i.mantItem.type !== 'PART');
  const parts = pendingItems.filter(i => i.mantItem.type === 'PART');

  const handleGenerate = async () => {
    try {
      setIsSubmitting(true);

      const res = await axios.post(
        `/api/maintenance/work-orders/${workOrderId}/workshop-tickets`,
        { itemIds: pendingItems.map(i => i.id) }
      );

      const { ticketNumber } = res.data;

      const blob = await pdf(
        <TicketPDF
          ticketNumber={ticketNumber}
          workOrder={workOrder}
          services={services}
          parts={parts}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ticketNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Ticket generado',
        description: `${ticketNumber} descargado.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo generar el ticket de taller.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-blue-600" />
            Generar Ticket de Taller
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Se generará un ticket de taller con todos los ítems pendientes:
          </p>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
            {services.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">{services.length}</span> servicio
                {services.length !== 1 ? 's' : ''}
              </p>
            )}
            {parts.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">{parts.length}</span> repuesto
                {parts.length !== 1 ? 's' : ''}
              </p>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              Total: {pendingItems.length} ítem
              {pendingItems.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={pendingItems.length === 0 || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Generando PDF...' : 'Confirmar y descargar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
