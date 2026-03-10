'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { WorkItemRow } from '@/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkItemRow';
import { Loader2, Wrench } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';

type TallerDetailPanelProps = {
  workOrderId: string;
  currentUser: {
    id: string;
    role: string;
    isSuperAdmin: boolean;
  };
  onClose: () => void;
};

export function TallerDetailPanel({
  workOrderId,
  currentUser,
  onClose,
}: TallerDetailPanelProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(
        `/api/maintenance/work-orders/${workOrderId}/items?type=SERVICE,ACTION`
      );
      const allItems = res.data.items || [];

      // Filtrar por internos (INTERNAL_STOCK o null)
      const internalItems = allItems.filter(
        (i: any) => i.itemSource === 'INTERNAL_STOCK' || !i.itemSource
      );

      // Mapear al tipo WorkOrderItemSummary requerido por WorkItemRow
      const mappedItems = internalItems.map((item: any) => ({
        id: String(item.workOrderItemId),
        description: item.description,
        itemSource: item.itemSource || null,
        closureType: item.closureType || null,
        notes: item.notes || null,
        status: item.status,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalCost: item.totalCost,
        mantItem: {
          id: item.mantItemId,
          name: item.mantItemName,
          type: item.mantItemType,
        },
      }));

      setItems(mappedItems);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas del taller.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <Sheet open={true} onOpenChange={open => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-6 border-b mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            Gestión de Taller
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Orden de Trabajo #{workOrderId.slice(-6).toUpperCase()}
          </p>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="text-sm font-medium">Cargando tareas...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">
              Esta OT no tiene ítems de taller asignados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <WorkItemRow
                key={item.id}
                workOrderId={workOrderId}
                item={item}
                currentUser={currentUser}
                onRefresh={fetchItems}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
