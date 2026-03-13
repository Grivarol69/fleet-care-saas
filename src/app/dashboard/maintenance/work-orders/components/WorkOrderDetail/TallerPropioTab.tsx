import { useState } from 'react';
import { Wrench, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { WorkItemRow } from './WorkItemRow';
import { AddItemDialog } from './AddItemDialog';
import { InternalTicketDialog } from './InternalTicketDialog';

export function TallerPropioTab({ workOrder, currentUser, onRefresh }: any) {
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  const internalItems = workOrder.workOrderItems.filter(
    (i: any) => i.itemSource !== 'EXTERNAL'
  );
  const serviceItems = internalItems.filter(
    (i: any) => i.mantItem.type !== 'PART'
  );
  const partItems = internalItems.filter(
    (i: any) => i.mantItem.type === 'PART'
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
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Wrench className="h-4 w-4" /> Trabajos / Servicios
          </div>
          <Button size="sm" onClick={() => setIsAddServiceDialogOpen(true)}>
            Nuevo Trabajo
          </Button>
        </CardHeader>
        <CardContent>
          {serviceItems.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed rounded-lg text-muted-foreground text-sm">
              No hay trabajos internos registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {serviceItems.map((item: any) => (
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Package className="h-4 w-4" /> Repuestos de Inventario Propio
          </div>
          <Button size="sm" onClick={() => setIsAddPartDialogOpen(true)}>
            Agregar Repuesto
          </Button>
        </CardHeader>
        <CardContent>
          {partItems.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed rounded-lg text-muted-foreground text-sm">
              No hay repuestos de inventario registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {partItems.map((item: any) => (
                <WorkItemRow
                  key={item.id}
                  workOrderId={workOrder.id}
                  item={item}
                  currentUser={currentUser}
                  onRefresh={onRefresh}
                  showSubtasks={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddItemDialog
        workOrderId={workOrder.id}
        vehicleId={workOrder.vehicle?.id}
        type="SERVICE"
        open={isAddServiceDialogOpen}
        onOpenChange={setIsAddServiceDialogOpen}
        onSuccess={() => {
          setIsAddServiceDialogOpen(false);
          onRefresh();
        }}
        defaultItemSource="INTERNAL_STOCK"
        lockItemSource
      />

      <AddItemDialog
        workOrderId={workOrder.id}
        vehicleId={workOrder.vehicle?.id}
        type="PART"
        open={isAddPartDialogOpen}
        onOpenChange={setIsAddPartDialogOpen}
        onSuccess={() => {
          setIsAddPartDialogOpen(false);
          onRefresh();
        }}
        defaultItemSource="INTERNAL_STOCK"
        lockItemSource
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
