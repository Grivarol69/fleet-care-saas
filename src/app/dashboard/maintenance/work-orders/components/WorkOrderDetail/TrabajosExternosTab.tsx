import { useState } from 'react';
import axios from 'axios';
import { ExternalLink, Briefcase, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/hooks/use-toast';
import { WorkItemRow } from './WorkItemRow';
import { AddItemDialog } from './AddItemDialog';

export function TrabajosExternosTab({
  workOrder,
  currentUser,
  onRefresh,
}: any) {
  const { toast } = useToast();
  const [selectedExternalIds, setSelectedExternalIds] = useState<string[]>([]);
  const [isGeneratingOC, setIsGeneratingOC] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<'SERVICE' | 'PART'>('SERVICE');

  const externalItems =
    workOrder.workOrderItems?.filter((i: any) => i.itemSource === 'EXTERNAL') ||
    [];
  const serviceItems = externalItems.filter(
    (i: any) => i.mantItem.type === 'SERVICE'
  );
  const partItems = externalItems.filter(
    (i: any) => i.mantItem.type === 'PART'
  );

  const toggleSelect = (id: string) => {
    setSelectedExternalIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGenerateOC = async () => {
    setIsGeneratingOC(true);
    try {
      await axios.post(
        `/api/maintenance/work-orders/${workOrder.id}/purchase-orders`,
        { itemIds: selectedExternalIds }
      );
      toast({
        title: 'OC generada',
        description: 'Orden de compra creada correctamente.',
      });
      setSelectedExternalIds([]);
      onRefresh();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo generar la OC',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingOC(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-bold">Trabajos Externos</h2>
        </div>
        <Button
          variant="outline"
          disabled={selectedExternalIds.length === 0 || isGeneratingOC}
          onClick={handleGenerateOC}
        >
          Generar OC ({selectedExternalIds.length})
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Briefcase className="h-4 w-4" /> Servicios Externos
          </div>
          <Button
            size="sm"
            onClick={() => {
              setAddType('SERVICE');
              setIsAddDialogOpen(true);
            }}
          >
            Agregar Servicio
          </Button>
        </CardHeader>
        <CardContent>
          {serviceItems.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed rounded-lg text-muted-foreground text-sm">
              No hay servicios externos.
            </div>
          ) : (
            <div className="space-y-2">
              {serviceItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedExternalIds.includes(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    disabled={item.closureType !== 'PENDING'}
                    className="mt-4"
                  />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Package className="h-4 w-4" /> Repuestos Externos
          </div>
          <Button
            size="sm"
            onClick={() => {
              setAddType('PART');
              setIsAddDialogOpen(true);
            }}
          >
            Agregar Repuesto
          </Button>
        </CardHeader>
        <CardContent>
          {partItems.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed rounded-lg text-muted-foreground text-sm">
              No hay repuestos externos.
            </div>
          ) : (
            <div className="space-y-2">
              {partItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedExternalIds.includes(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    disabled={item.closureType !== 'PENDING'}
                    className="mt-4"
                  />
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
        </CardContent>
      </Card>

      <AddItemDialog
        workOrderId={workOrder.id}
        vehicleId={workOrder.vehicle?.id}
        type={addType}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          setIsAddDialogOpen(false);
          onRefresh();
        }}
        defaultItemSource="EXTERNAL"
      />
    </div>
  );
}
