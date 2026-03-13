import { useState, useEffect } from 'react';
import axios from 'axios';
import { ExternalLink, Briefcase, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    (i: any) => i.mantItem.type !== 'PART'
  );
  const partItems = externalItems.filter(
    (i: any) => i.mantItem.type === 'PART'
  );

  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [applySameProvider, setApplySameProvider] = useState(false);
  const [bulkProviderId, setBulkProviderId] = useState<string>('');

  useEffect(() => {
    axios.get('/api/people/providers')
      .then(res => setProviders(res.data))
      .catch(() => { });
  }, []);

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

  const handleBulkApply = async () => {
    if (!bulkProviderId) return;
    setIsBulkApplying(true);
    try {
      const itemsToUpdate = externalItems.filter((i: any) => (i.purchaseOrderItems?.length || 0) === 0);
      await Promise.all(
        itemsToUpdate.map((item: any) =>
          axios.patch(`/api/maintenance/work-orders/${workOrder.id}/items/${item.id}`, {
            providerId: bulkProviderId,
          })
        )
      );
      toast({ title: 'Proveedores actualizados', description: 'Se aplicó el proveedor a los ítems seleccionados' });
      onRefresh();
      setApplySameProvider(false);
      setBulkProviderId('');
    } catch {
      toast({ title: 'Error', variant: 'destructive', description: 'No se pudieron actualizar los items' });
    } finally {
      setIsBulkApplying(false);
    }
  };

  const hasUnassigned = selectedExternalIds.some(id => externalItems.find((i: any) => i.id === id)?.providerId === null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-bold">Trabajos Externos</h2>
        </div>
        <Button
          variant="outline"
          disabled={selectedExternalIds.length === 0 || isGeneratingOC || hasUnassigned}
          onClick={handleGenerateOC}
        >
          Generar OC ({selectedExternalIds.length})
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg mb-6 border">
        <div className="flex items-center gap-2">
          <Checkbox
            id="bulk-provider"
            checked={applySameProvider}
            onCheckedChange={(c) => setApplySameProvider(!!c)}
          />
          <label htmlFor="bulk-provider" className="text-sm font-medium leading-none cursor-pointer">
            Aplicar mismo proveedor a todos
          </label>
        </div>
        {applySameProvider && (
          <div className="flex items-center gap-2 ml-auto">
            <Select value={bulkProviderId} onValueChange={setBulkProviderId}>
              <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleBulkApply}
              disabled={!bulkProviderId || isBulkApplying}
              className="h-8 text-xs"
            >
              {isBulkApplying && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Aplicar a todos
            </Button>
          </div>
        )}
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
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mt-4">
                          <Checkbox
                            checked={selectedExternalIds.includes(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                            disabled={item.closureType !== 'PENDING' || item.providerId === null}
                          />
                        </div>
                      </TooltipTrigger>
                      {item.providerId === null && (
                        <TooltipContent>
                          <p>Asigna un proveedor primero</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex-1">
                    <WorkItemRow
                      workOrderId={workOrder.id}
                      item={item}
                      currentUser={currentUser}
                      onRefresh={onRefresh}
                      showSubtasks={false}
                      providers={providers}
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
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mt-4">
                          <Checkbox
                            checked={selectedExternalIds.includes(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                            disabled={item.closureType !== 'PENDING' || item.providerId === null}
                          />
                        </div>
                      </TooltipTrigger>
                      {item.providerId === null && (
                        <TooltipContent>
                          <p>Asigna un proveedor primero</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex-1">
                    <WorkItemRow
                      workOrderId={workOrder.id}
                      item={item}
                      currentUser={currentUser}
                      onRefresh={onRefresh}
                      showSubtasks={false}
                      providers={providers}
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
        lockItemSource
      />
    </div>
  );
}
