'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wrench, ShoppingCart, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import axios from 'axios';
import { AddItemDialog } from './AddItemDialog';

type ServiceItem = {
  workOrderItemId: number;
  mantItemId: string;
  mantItemName: string;
  mantItemType: 'ACTION' | 'SERVICE';
  categoryName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  supplier: string;
  closureType: string;
  status: string;
  itemSource?: string;
};

type Provider = {
  id: string;
  name: string;
};

type ServicesTabProps = {
  workOrderId: string;
  onRefresh: () => void;
};

const typeConfig = {
  ACTION: { label: 'Acción', className: 'bg-purple-100 text-purple-700' },
  SERVICE: { label: 'Servicio', className: 'bg-green-100 text-green-700' },
};

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' },
  COMPLETED: { label: 'Completado', variant: 'default' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
};

export function ServicesTab({ workOrderId, onRefresh }: ServicesTabProps) {
  const { toast } = useToast();

  // State
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Dialog state
  const [showOCDialog, setShowOCDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch service items (ACTION + SERVICE types)
  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(
        `/api/maintenance/work-orders/${workOrderId}/items?type=SERVICE,ACTION`
      );
      const fetchedItems = (res.data.items || []) as ServiceItem[];

      const externalItems = fetchedItems.filter(
        i =>
          i.itemSource === 'EXTERNAL' ||
          (i.closureType === 'PENDING' && i.itemSource !== 'INTERNAL_STOCK')
      );

      setItems(externalItems);
    } catch (error) {
      console.error('Error fetching service items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los servicios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId, toast]);

  // Fetch providers
  const fetchResources = useCallback(async () => {
    try {
      const providersRes = await axios.get('/api/people/providers');
      setProviders(providersRes.data || []);
    } catch {
      // Non-critical, continue
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchResources();
  }, [fetchItems, fetchResources]);

  // Toggle item selection
  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Toggle all items
  const toggleAllItems = () => {
    const pendingItems = items.filter(i => i.closureType === 'PENDING');
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map(i => i.workOrderItemId)));
    }
  };

  // Calculate totals
  const pendingItems = items.filter(i => i.closureType === 'PENDING');
  const externalSelected = items.filter(item =>
    selectedItems.has(item.workOrderItemId)
  );
  const totalEstimated = items.reduce((sum, i) => sum + i.totalCost, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Servicios ({items.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Servicio
              </Button>
              {externalSelected.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowOCDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Generar OC ({externalSelected.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay servicios en esta OT
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Los servicios tipo ACTION y SERVICE aparecerán aquí
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      {pendingItems.length > 0 && (
                        <Checkbox
                          checked={
                            selectedItems.size === pendingItems.length &&
                            pendingItems.length > 0
                          }
                          onCheckedChange={toggleAllItems}
                        />
                      )}
                    </TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const isPending = item.closureType === 'PENDING';

                    return (
                      <TableRow key={item.workOrderItemId}>
                        <TableCell>
                          {isPending && (
                            <Checkbox
                              checked={selectedItems.has(item.workOrderItemId)}
                              onCheckedChange={() =>
                                toggleItemSelection(item.workOrderItemId)
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.mantItemName}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              typeConfig[item.mantItemType]?.className ||
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {typeConfig[item.mantItemType]?.label ||
                              item.mantItemType}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalCost)}
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <Badge variant="outline">Externo</Badge>
                          ) : (
                            <Badge variant="outline">Externo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                statusConfig[item.status]?.variant || 'outline'
                              }
                            >
                              {statusConfig[item.status]?.label || item.status}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Summary */}
              {totalEstimated > 0 && (
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">
                      Total Estimado:{' '}
                    </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(totalEstimated)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* OC Dialog */}
      <Dialog open={showOCDialog} onOpenChange={setShowOCDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Orden de Compra de Servicios</DialogTitle>
            <DialogDescription>
              Se creará una OC para {externalSelected.length} servicio(s)
              externo(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Select
                value={selectedProviderId}
                onValueChange={setSelectedProviderId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-muted p-3">
              <h4 className="font-medium mb-2">Items a incluir:</h4>
              <ul className="text-sm space-y-1">
                {externalSelected.map(item => (
                  <li
                    key={item.workOrderItemId}
                    className="flex justify-between"
                  >
                    <span>{item.mantItemName}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(item.totalCost)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                <span>Total:</span>
                <span>
                  {formatCurrency(
                    externalSelected.reduce((sum, i) => sum + i.totalCost, 0)
                  )}
                </span>
              </div>
            </div>

            {providers.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                No hay proveedores registrados
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOCDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (externalSelected.length === 0) {
                  toast({
                    title: 'Sin items',
                    description: 'No hay items externos seleccionados',
                    variant: 'destructive',
                  });
                  return;
                }

                if (!selectedProviderId) {
                  toast({
                    title: 'Proveedor requerido',
                    description: 'Selecciona un proveedor para la OC',
                    variant: 'destructive',
                  });
                  return;
                }

                setIsSubmitting(true);
                try {
                  const ocItems = externalSelected.map(item => ({
                    workOrderItemId: item.workOrderItemId,
                    mantItemId: item.mantItemId,
                    description: item.description || item.mantItemName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                  }));

                  await axios.post('/api/purchase-orders', {
                    workOrderId,
                    type: 'SERVICES',
                    providerId: selectedProviderId,
                    items: ocItems,
                    notes: `OC de Servicios generada desde OT #${workOrderId}`,
                  });

                  // Update itemSource for these items
                  await Promise.all(
                    externalSelected.map(item =>
                      axios.patch(
                        `/api/maintenance/work-orders/${workOrderId}/items/${item.workOrderItemId}`,
                        {
                          itemSource: 'EXTERNAL',
                        }
                      )
                    )
                  );

                  toast({
                    title: 'OC Creada',
                    description: `Orden de compra de servicios creada con ${externalSelected.length} items`,
                  });

                  setShowOCDialog(false);
                  setSelectedItems(new Set());
                  setSelectedProviderId('');
                  fetchItems();
                  onRefresh();
                } catch (error) {
                  const message = axios.isAxiosError(error)
                    ? error.response?.data?.error
                    : 'Error al crear OC';
                  toast({
                    title: 'Error',
                    description:
                      message || 'No se pudo crear la orden de compra',
                    variant: 'destructive',
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting || !selectedProviderId}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear OC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        workOrderId={workOrderId}
        type="SERVICE"
        onSuccess={() => {
          fetchItems();
          onRefresh();
        }}
      />
    </div>
  );
}
