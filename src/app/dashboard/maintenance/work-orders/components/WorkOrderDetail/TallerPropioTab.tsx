import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkItemRow } from './WorkItemRow';
import { AddItemDialog } from './AddItemDialog';
import { InternalTicketDialog } from './InternalTicketDialog';

export function TallerPropioTab({ workOrder, currentUser, onRefresh }: any) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  const internalItems = workOrder.workOrderItems.filter(
    (i: any) => i.itemSource !== 'EXTERNAL'
  );
  const pendingInternal = internalItems.filter(
    (i: any) => i.closureType === 'PENDING'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold">Taller Propio</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pendingInternal.length === 0}
            onClick={() => setIsTicketDialogOpen(true)}
          >
            Generar Ticket ({pendingInternal.length})
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            Nuevo Trabajo
          </Button>
        </div>
      </div>

      {internalItems.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed rounded-lg text-muted-foreground">
          No hay trabajos internos registrados.
        </div>
      ) : (
        <div className="space-y-2">
          {internalItems.map((item: any) => (
            <WorkItemRow
              key={item.id}
              workOrderId={workOrder.id}
              item={item}
              currentUser={currentUser}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      <AddItemDialog
        workOrderId={workOrder.id}
        vehicleId={workOrder.vehicle?.id}
        type="SERVICE"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          setIsAddDialogOpen(false);
          onRefresh();
        }}
        defaultItemSource="INTERNAL_STOCK"
      />

      <InternalTicketDialog
        workOrderId={workOrder.id}
        pendingItems={pendingInternal}
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        onSuccess={() => {
          setIsTicketDialogOpen(false);
          onRefresh();
        }}
      />
    </div>
  );
}
