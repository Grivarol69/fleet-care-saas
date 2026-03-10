'use client';

import { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  ShoppingCart,
  Ticket,
  Wrench,
  ExternalLink,
  Info,
  Package,
} from 'lucide-react';
import { AddItemDialog } from './AddItemDialog';
import { WorkItemRow } from './WorkItemRow';
import { InternalTicketDialog } from './InternalTicketDialog';
import { useToast } from '@/components/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type WorkTabProps = {
  workOrder: any;
  currentUser: any;
  onRefresh: () => void;
};

export function WorkTab({ workOrder, currentUser, onRefresh }: WorkTabProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<'SERVICE' | 'PART'>('SERVICE');
  const [defaultSource, setDefaultSource] = useState<
    'INTERNAL_STOCK' | 'EXTERNAL'
  >('INTERNAL_STOCK');
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [selectedExternalIds, setSelectedExternalIds] = useState<string[]>([]);
  const [isGeneratingOC, setIsGeneratingOC] = useState(false);

  const items = workOrder.workOrderItems || [];
  const internalItems = items.filter(
    (i: any) => i.itemSource === 'INTERNAL_STOCK'
  );
  const externalItems = items.filter((i: any) => i.itemSource === 'EXTERNAL');

  const pendingInternal = internalItems.filter(
    (i: any) => i.closureType === 'PENDING'
  );

  const openAddDialog = (
    type: 'SERVICE' | 'PART',
    source: 'INTERNAL_STOCK' | 'EXTERNAL'
  ) => {
    setAddType(type);
    setDefaultSource(source);
    setIsAddDialogOpen(true);
  };

  const toggleExternalSelect = (id: string) => {
    setSelectedExternalIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerateOC = async () => {
    if (selectedExternalIds.length === 0) return;
    try {
      setIsGeneratingOC(true);
      await axios.post(
        `/api/maintenance/work-orders/${workOrder.id}/purchase-orders`,
        {
          itemIds: selectedExternalIds,
        }
      );
      toast({
        title: 'OC Generada',
        description: 'Se ha creado la orden de compra correctamente.',
      });
      setSelectedExternalIds([]);
      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo generar la orden de compra.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingOC(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Taller Propio</CardTitle>
              <p className="text-xs text-muted-foreground">
                Trabajos realizados internamente
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => setIsTicketDialogOpen(true)}
              disabled={pendingInternal.length === 0}
            >
              <Ticket className="h-4 w-4 mr-2" />
              Generar Ticket ({pendingInternal.length})
            </Button>
            <Button
              size="sm"
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => openAddDialog('SERVICE', 'INTERNAL_STOCK')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Trabajo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {internalItems.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">
                No hay trabajos internos registrados.
              </p>
            </div>
          ) : (
            internalItems.map((item: any) => (
              <WorkItemRow
                key={item.id}
                workOrderId={workOrder.id}
                item={item}
                currentUser={currentUser}
                onRefresh={onRefresh}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-orange-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Terceros / Repuestos</CardTitle>
              <p className="text-xs text-muted-foreground">
                Ítems a adquirir a proveedores externos
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-orange-200 text-orange-700 hover:bg-orange-50"
              onClick={handleGenerateOC}
              disabled={selectedExternalIds.length === 0 || isGeneratingOC}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Generar OC ({selectedExternalIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => openAddDialog('PART', 'EXTERNAL')}
            >
              <Package className="h-4 w-4 mr-2" />
              Repuesto Externo
            </Button>
            <Button
              size="sm"
              className="h-9 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => openAddDialog('SERVICE', 'EXTERNAL')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Servicio Externo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {externalItems.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">
                No hay requerimientos externos registrados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {externalItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-3">
                  {item.closureType === 'PENDING' && (
                    <Checkbox
                      className="mt-5"
                      checked={selectedExternalIds.includes(item.id)}
                      onCheckedChange={() => toggleExternalSelect(item.id)}
                    />
                  )}
                  <div className="flex-1">
                    <WorkItemRow
                      workOrderId={workOrder.id}
                      item={item}
                      currentUser={currentUser}
                      onRefresh={onRefresh}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {externalItems.some((i: any) => i.closureType === 'PENDING') && (
            <Alert className="bg-orange-50/50 border-orange-100 text-orange-800">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-xs font-semibold">
                Instrucciones
              </AlertTitle>
              <AlertDescription className="text-xs">
                Selecciona los ítems pendientes (checkbox) y haz clic en
                "Generar OC" para agruparlos en una nueva Orden de Compra.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <AddItemDialog
        workOrderId={workOrder.id}
        vehicleId={workOrder.vehicleId}
        type={addType}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={onRefresh}
        defaultItemSource={defaultSource}
      />

      <InternalTicketDialog
        workOrderId={workOrder.id}
        pendingItems={pendingInternal}
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        onSuccess={onRefresh}
      />
    </div>
  );
}
