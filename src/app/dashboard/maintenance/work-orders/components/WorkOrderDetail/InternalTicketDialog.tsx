'use client';

import { useState } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/hooks/use-toast';
import { Loader2, Ticket } from 'lucide-react';

type WorkOrderItem = {
  id: string;
  description: string;
  mantItem: {
    name: string;
  };
};

type InternalTicketDialogProps = {
  workOrderId: string;
  pendingItems: WorkOrderItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function InternalTicketDialog({
  workOrderId,
  pendingItems,
  open,
  onOpenChange,
  onSuccess,
}: InternalTicketDialogProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsSubmitting(true);
      await axios.post(
        `/api/maintenance/work-orders/${workOrderId}/workshop-tickets`,
        {
          itemIds: selectedIds,
        }
      );

      toast({
        title: 'Ticket generado',
        description: `Se ha generado un ticket de taller para ${selectedIds.length} ítem(s).`,
      });

      onSuccess();
      onOpenChange(false);
      setSelectedIds([]);
    } catch (error) {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-blue-600" />
            Generar Ticket de Taller
          </DialogTitle>
          <DialogDescription>
            Selecciona los ítems pendientes que deseas enviar al taller propio.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScrollArea className="h-[300px] border rounded-md p-2">
            {pendingItems.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                No hay ítems pendientes para taller propio.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      id={item.id}
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={item.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {item.mantItem.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {item.description || 'Sin descripción adicional'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
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
            disabled={selectedIds.length === 0 || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar Ticket ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
