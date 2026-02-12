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
import {
  Package,
  Warehouse,
  ShoppingCart,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import axios from 'axios';

type PartItem = {
  workOrderItemId: number;
  mantItemId: number;
  mantItemName: string;
  mantItemType: 'PART';
  categoryName: string;
  masterPartCode: string | null;
  masterPartDescription: string | null;
  masterPartId?: string;
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
  id: number;
  name: string;
};

type InventoryStock = {
  masterPartId: string;
  quantity: number;
  averageCost: number;
  inventoryItemId: string;
};

type PartsTabProps = {
  workOrderId: number;
  onRefresh: () => void;
};

type ItemOrigin = 'EXTERNAL' | 'STOCK';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' },
  COMPLETED: { label: 'Completado', variant: 'default' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
};

export function PartsTab({ workOrderId, onRefresh }: PartsTabProps) {
  const { toast } = useToast();

  // State
  const [items, setItems] = useState<PartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stockInfo, setStockInfo] = useState<Map<string, InventoryStock>>(new Map());

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [itemOrigins, setItemOrigins] = useState<Map<number, ItemOrigin>>(new Map());

  // Dialog state
  const [showOCDialog, setShowOCDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch part items (PART type only)
  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/maintenance/work-orders/${workOrderId}/items?type=PART`);
      const fetchedItems = (res.data.items || []) as PartItem[];
      setItems(fetchedItems);

      // Initialize origins for pending items
      const initialOrigins = new Map<number, ItemOrigin>();
      fetchedItems.forEach((item) => {
        if (item.closureType === 'PENDING') {
          initialOrigins.set(item.workOrderItemId, 'EXTERNAL');
        }
      });
      setItemOrigins(initialOrigins);

      // Fetch stock info for items with masterPartId
      const masterPartIds = fetchedItems
        .filter((i) => i.masterPartId)
        .map((i) => i.masterPartId as string);

      if (masterPartIds.length > 0) {
        fetchStockInfo(masterPartIds);
      }
    } catch (error) {
      console.error('Error fetching part items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los repuestos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId, toast]);

  // Fetch stock info for multiple parts
  const fetchStockInfo = async (masterPartIds: string[]) => {
    try {
      const stockMap = new Map<string, InventoryStock>();

      // Fetch stock for each unique masterPartId
      const uniqueIds = [...new Set(masterPartIds)];
      await Promise.all(
        uniqueIds.map(async (partId) => {
          const res = await axios.get(`/api/inventory/items?masterPartId=${partId}`);
          const items = res.data;
          if (items.length > 0) {
            stockMap.set(partId, {
              masterPartId: partId,
              quantity: Number(items[0].quantity),
              averageCost: Number(items[0].averageCost),
              inventoryItemId: items[0].id,
            });
          }
        })
      );

      setStockInfo(stockMap);
    } catch {
      // Non-critical
    }
  };

  // Fetch providers
  const fetchProviders = useCallback(async () => {
    try {
      const res = await axios.get('/api/providers');
      setProviders(res.data || []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchProviders();
  }, [fetchItems, fetchProviders]);

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
    const pendingItems = items.filter((i) => i.closureType === 'PENDING');
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map((i) => i.workOrderItemId)));
    }
  };

  // Change item origin
  const setItemOrigin = (itemId: number, origin: ItemOrigin) => {
    const newOrigins = new Map(itemOrigins);
    newOrigins.set(itemId, origin);
    setItemOrigins(newOrigins);
  };

  // Get selected items by origin
  const getSelectedByOrigin = (origin: ItemOrigin) => {
    return items.filter(
      (item) =>
        selectedItems.has(item.workOrderItemId) &&
        itemOrigins.get(item.workOrderItemId) === origin
    );
  };

  // Check if item has enough stock
  const hasEnoughStock = (item: PartItem): boolean => {
    if (!item.masterPartId) return false;
    const stock = stockInfo.get(item.masterPartId);
    return stock ? stock.quantity >= item.quantity : false;
  };

  // Get stock display for an item
  const getStockDisplay = (item: PartItem) => {
    if (!item.masterPartId) return null;
    const stock = stockInfo.get(item.masterPartId);
    if (!stock) return { quantity: 0, sufficient: false };
    return {
      quantity: stock.quantity,
      sufficient: stock.quantity >= item.quantity,
    };
  };

  // Generate Purchase Order for external parts
  const handleGeneratePartsOC = async () => {
    const externalItems = getSelectedByOrigin('EXTERNAL');
    if (externalItems.length === 0) {
      toast({
        title: 'Sin items',
        description: 'No hay repuestos externos seleccionados',
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
      const ocItems = externalItems.map((item) => ({
        workOrderItemId: item.workOrderItemId,
        mantItemId: item.mantItemId,
        masterPartId: item.masterPartId || undefined,
        description: item.masterPartDescription || item.description || item.mantItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      await axios.post('/api/purchase-orders', {
        workOrderId,
        type: 'PARTS',
        providerId: parseInt(selectedProviderId),
        items: ocItems,
        notes: `OC de Repuestos generada desde OT #${workOrderId}`,
      });

      // Update itemSource for these items
      await Promise.all(
        externalItems.map((item) =>
          axios.patch(`/api/maintenance/work-orders/${workOrderId}/items/${item.workOrderItemId}`, {
            itemSource: 'EXTERNAL',
          })
        )
      );

      toast({
        title: 'OC Creada',
        description: `Orden de compra de repuestos creada con ${externalItems.length} items`,
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
        description: message || 'No se pudo crear la orden de compra',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Consume from stock
  const handleConsumeFromStock = async () => {
    const stockItems = getSelectedByOrigin('STOCK');
    if (stockItems.length === 0) {
      toast({
        title: 'Sin items',
        description: 'No hay repuestos de inventario seleccionados',
        variant: 'destructive',
      });
      return;
    }

    // Verify all items have enough stock
    const insufficientStock = stockItems.filter((item) => !hasEnoughStock(item));
    if (insufficientStock.length > 0) {
      toast({
        title: 'Stock insuficiente',
        description: `${insufficientStock.length} item(s) no tienen stock suficiente`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare consumption items
      const consumeItems = stockItems.map((item) => {
        const stock = stockInfo.get(item.masterPartId as string);
        return {
          workOrderItemId: item.workOrderItemId,
          inventoryItemId: stock?.inventoryItemId,
          masterPartId: item.masterPartId,
          quantity: item.quantity,
        };
      });

      await axios.post('/api/inventory/consume', {
        workOrderId,
        items: consumeItems,
      });

      toast({
        title: 'Stock descontado',
        description: `Se descontaron ${stockItems.length} repuestos del inventario`,
      });

      setShowStockDialog(false);
      setSelectedItems(new Set());
      fetchItems();
      onRefresh();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : 'Error al descontar stock';
      toast({
        title: 'Error',
        description: message || 'No se pudo descontar del inventario',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const pendingItems = items.filter((i) => i.closureType === 'PENDING');
  const externalSelected = getSelectedByOrigin('EXTERNAL');
  const stockSelected = getSelectedByOrigin('STOCK');
  const totalEstimated = items.reduce((sum, i) => sum + i.totalCost, 0);

  // Check if any stock item is missing sufficient stock
  const stockItemsWithIssues = stockSelected.filter((item) => !hasEnoughStock(item));

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
              <Package className="h-5 w-5" />
              Repuestos ({items.length})
            </CardTitle>
            <div className="flex gap-2">
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
              {stockSelected.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowStockDialog(true)}
                  disabled={stockItemsWithIssues.length > 0}
                >
                  <Warehouse className="mr-2 h-4 w-4" />
                  Descontar Stock ({stockSelected.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay repuestos en esta OT</p>
              <p className="text-sm text-muted-foreground mt-1">
                Los items tipo PART aparecerán aquí
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
                          checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
                          onCheckedChange={toggleAllItems}
                        />
                      )}
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isPending = item.closureType === 'PENDING';
                    const origin = itemOrigins.get(item.workOrderItemId) || 'EXTERNAL';
                    const stockDisplay = getStockDisplay(item);

                    return (
                      <TableRow key={item.workOrderItemId}>
                        <TableCell>
                          {isPending && (
                            <Checkbox
                              checked={selectedItems.has(item.workOrderItemId)}
                              onCheckedChange={() => toggleItemSelection(item.workOrderItemId)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.masterPartCode || '-'}
                        </TableCell>
                        <TableCell className="font-medium max-w-xs">
                          <div className="truncate">
                            {item.masterPartDescription || item.mantItemName}
                          </div>
                          {item.masterPartDescription && item.masterPartDescription !== item.mantItemName && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.mantItemName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                        <TableCell>
                          {stockDisplay ? (
                            <div className="flex items-center gap-1">
                              {stockDisplay.sufficient ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              )}
                              <span
                                className={
                                  stockDisplay.sufficient ? 'text-green-600' : 'text-amber-500'
                                }
                              >
                                {stockDisplay.quantity}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <Select
                              value={origin}
                              onValueChange={(val) =>
                                setItemOrigin(item.workOrderItemId, val as ItemOrigin)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EXTERNAL">
                                  <div className="flex items-center gap-1">
                                    <ShoppingCart className="h-3 w-3" />
                                    Compra
                                  </div>
                                </SelectItem>
                                <SelectItem
                                  value="STOCK"
                                  disabled={!stockDisplay || !stockDisplay.sufficient}
                                >
                                  <div className="flex items-center gap-1">
                                    <Warehouse className="h-3 w-3" />
                                    Inventario
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">
                              {item.itemSource === 'INTERNAL_STOCK' ? 'Inventario' : 'Compra'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[item.status]?.variant || 'outline'}>
                            {statusConfig[item.status]?.label || item.status}
                          </Badge>
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
                    <span className="text-sm text-muted-foreground">Total Estimado: </span>
                    <span className="text-lg font-bold">{formatCurrency(totalEstimated)}</span>
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
            <DialogTitle>Generar Orden de Compra de Repuestos</DialogTitle>
            <DialogDescription>
              Se creará una OC para {externalSelected.length} repuesto(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-muted p-3">
              <h4 className="font-medium mb-2">Items a incluir:</h4>
              <ul className="text-sm space-y-1 max-h-40 overflow-auto">
                {externalSelected.map((item) => (
                  <li key={item.workOrderItemId} className="flex justify-between">
                    <span className="truncate mr-2">
                      {item.masterPartCode || item.mantItemName}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                <span>Total:</span>
                <span>
                  {formatCurrency(externalSelected.reduce((sum, i) => sum + i.totalCost, 0))}
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
              onClick={handleGeneratePartsOC}
              disabled={isSubmitting || !selectedProviderId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear OC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Consumption Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descontar del Inventario</DialogTitle>
            <DialogDescription>
              Se descontarán {stockSelected.length} repuesto(s) del inventario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-md bg-muted p-3">
              <h4 className="font-medium mb-2">Repuestos a descontar:</h4>
              <ul className="text-sm space-y-2 max-h-40 overflow-auto">
                {stockSelected.map((item) => {
                  const stockDisplay = getStockDisplay(item);
                  return (
                    <li key={item.workOrderItemId} className="flex justify-between items-center">
                      <span className="truncate mr-2">
                        {item.masterPartCode || item.mantItemName}
                      </span>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span>-{item.quantity}</span>
                        {stockDisplay && (
                          <span className="text-muted-foreground">
                            (Stock: {stockDisplay.quantity})
                          </span>
                        )}
                        {stockDisplay?.sufficient ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {stockItemsWithIssues.length > 0 && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {stockItemsWithIssues.length} item(s) con stock insuficiente
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConsumeFromStock}
              disabled={isSubmitting || stockItemsWithIssues.length > 0}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Descuento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
