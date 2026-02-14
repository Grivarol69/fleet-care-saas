'use client';

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
import {
  PlusCircle,
  Warehouse,
  ShoppingCart,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { cn } from '@/lib/utils';

type MantItemResult = {
  id: number;
  name: string;
  description: string | null;
  type: 'ACTION' | 'PART' | 'SERVICE';
  categoryName: string;
  parts: Array<{
    masterPartId: string;
    code: string;
    description: string;
    referencePrice: number | null;
    quantity: number;
    isPrimary: boolean;
  }>;
};

type WorkOrderItemFormatted = {
  workOrderItemId: number;
  mantItemId: number;
  mantItemName: string;
  mantItemType: string;
  categoryName: string;
  masterPartCode: string | null;
  masterPartDescription: string | null;
  description: string;
  details: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  supplier: string;
  closureType: string;
  status: string;
};

type WorkOrder = {
  id: number;
  vehicle: {
    id: number;
  };
  workOrderItems: Array<{
    id: number;
    description: string;
    supplier: string | null;
    unitPrice: number;
    quantity: number;
    totalCost: number;
    status: string;
    mantItem: {
      id: number;
      name: string;
      type?: string;
    };
  }>;
};

type WorkOrderItemsTabProps = {
  workOrder: WorkOrder;
  onRefresh: () => void;
};

const itemStatusConfig = {
  PENDING: { label: 'Pendiente', variant: 'secondary' as const },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' as const },
  COMPLETED: { label: 'Completado', variant: 'default' as const },
  CANCELLED: { label: 'Cancelado', variant: 'outline' as const },
};

const typeConfig = {
  ACTION: { label: 'Accion', className: 'bg-purple-100 text-purple-700' },
  PART: { label: 'Repuesto', className: 'bg-blue-100 text-blue-700' },
  SERVICE: { label: 'Servicio', className: 'bg-green-100 text-green-700' },
};

export function WorkOrderItemsTab({
  workOrder,
  onRefresh,
}: WorkOrderItemsTabProps) {
  const { toast } = useToast();

  // Add Item State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [source, setSource] = useState<'EXTERNAL' | 'STOCK'>('EXTERNAL');
  const [stockItem, setStockItem] = useState<string | null>(null);
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  // MantItem Combobox State
  const [comboOpen, setComboOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mantItems, setMantItems] = useState<MantItemResult[]>([]);
  const [selectedMantItem, setSelectedMantItem] =
    useState<MantItemResult | null>(null);
  const [selectedMasterPartId, setSelectedMasterPartId] = useState<
    string | null
  >(null);
  const [isSearching, setIsSearching] = useState(false);

  // Enriched items from API
  const [enrichedItems, setEnrichedItems] = useState<WorkOrderItemFormatted[]>(
    []
  );

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch enriched items
  useEffect(() => {
    fetchEnrichedItems();
  }, [workOrder.id]);

  const fetchEnrichedItems = async () => {
    try {
      const res = await axios.get(
        `/api/maintenance/work-orders/${workOrder.id}/items`
      );
      setEnrichedItems(res.data.items || []);
    } catch {
      // Fall back to basic workOrderItems if enriched fetch fails
      setEnrichedItems([]);
    }
  };

  // Search MantItems with debounce
  const searchMantItems = useCallback(async (q: string) => {
    setIsSearching(true);
    try {
      const res = await axios.get(
        `/api/maintenance/mant-items/search?q=${encodeURIComponent(q)}`
      );
      setMantItems(res.data);
    } catch {
      setMantItems([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length >= 1) {
      debounceRef.current = setTimeout(() => {
        searchMantItems(searchQuery);
      }, 300);
    } else if (searchQuery.trim().length === 0 && comboOpen) {
      // Load initial items when combobox opens with empty query
      searchMantItems('');
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, comboOpen, searchMantItems]);

  const handleSelectMantItem = (item: MantItemResult) => {
    setSelectedMantItem(item);
    setDescription(item.name);
    setComboOpen(false);

    // Auto-fill price from primary part's referencePrice
    const primaryPart = item.parts.find(p => p.isPrimary) || item.parts[0];
    if (primaryPart) {
      setSelectedMasterPartId(primaryPart.masterPartId);
      if (primaryPart.referencePrice) {
        setUnitPrice(primaryPart.referencePrice.toString());
      }
    } else {
      setSelectedMasterPartId(null);
    }
  };

  const checkStock = async (masterPartId: string) => {
    try {
      const res = await axios.get(
        `/api/inventory/items?masterPartId=${masterPartId}`
      );
      const items = res.data;
      if (items.length > 0) {
        setAvailableStock(Number(items[0].quantity));
        setStockItem(items[0].id);
      } else {
        setAvailableStock(0);
        setStockItem(null);
      }
    } catch {
      setAvailableStock(null);
      setStockItem(null);
    }
  };

  const handleSourceChange = (newSource: 'EXTERNAL' | 'STOCK') => {
    setSource(newSource);
    if (newSource === 'STOCK' && selectedMasterPartId) {
      checkStock(selectedMasterPartId);
    }
  };

  const handleAddItem = async () => {
    if (!selectedMantItem) {
      toast({
        title: 'Error',
        description: 'Selecciona un item de mantenimiento.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await axios.post(`/api/maintenance/work-orders/${workOrder.id}/items`, {
        mantItemId: selectedMantItem.id,
        masterPartId: selectedMasterPartId || undefined,
        description,
        quantity: parseInt(quantity),
        unitPrice: unitPrice ? parseFloat(unitPrice) : 0,
        source,
        stockItemId: stockItem || undefined,
      });
      toast({
        title: 'Item Agregado',
        description: `"${description}" agregado desde: ${source === 'STOCK' ? 'Inventario' : 'Compra Externa'}`,
      });
      resetForm();
      setIsAddOpen(false);
      fetchEnrichedItems();
      onRefresh();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : 'No se pudo agregar el item.';
      toast({
        title: 'Error',
        description: message || 'No se pudo agregar el item.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setDescription('');
    setQuantity('1');
    setUnitPrice('');
    setSource('EXTERNAL');
    setStockItem(null);
    setAvailableStock(null);
    setSelectedMantItem(null);
    setSelectedMasterPartId(null);
    setSearchQuery('');
    setMantItems([]);
  };

  // Use enriched items if available, otherwise fall back to basic
  const displayItems = enrichedItems.length > 0 ? enrichedItems : null;

  const totalCost = displayItems
    ? displayItems.reduce((sum, item) => sum + item.totalCost, 0)
    : workOrder.workOrderItems.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Items de Trabajo (
              {displayItems
                ? displayItems.length
                : workOrder.workOrderItems.length}
              )
            </CardTitle>
            <Dialog
              open={isAddOpen}
              onOpenChange={open => {
                setIsAddOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Agregar Item de Mantenimiento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* MantItem Combobox */}
                  <div className="space-y-2">
                    <Label>Item de Mantenimiento</Label>
                    <Popover open={comboOpen} onOpenChange={setComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboOpen}
                          className="w-full justify-between font-normal"
                        >
                          {selectedMantItem ? (
                            <span className="truncate">
                              {selectedMantItem.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Buscar item...
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nombre..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {isSearching
                                ? 'Buscando...'
                                : 'No se encontraron items.'}
                            </CommandEmpty>
                            <CommandGroup>
                              {mantItems.map(item => (
                                <CommandItem
                                  key={item.id}
                                  value={item.id.toString()}
                                  onSelect={() => handleSelectMantItem(item)}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedMantItem?.id === item.id
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate font-medium">
                                        {item.name}
                                      </span>
                                      <span
                                        className={cn(
                                          'text-xs px-1.5 py-0.5 rounded-full shrink-0',
                                          typeConfig[item.type]?.className ||
                                            'bg-gray-100 text-gray-700'
                                        )}
                                      >
                                        {typeConfig[item.type]?.label ||
                                          item.type}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {item.categoryName}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Description (auto-filled, editable) */}
                  <div className="space-y-2">
                    <Label>Descripcion</Label>
                    <Input
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Ej: Aceite 15W40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        min="1"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="space-y-2">
                      <Label>Precio Estimado</Label>
                      <Input
                        type="number"
                        value={unitPrice}
                        onChange={e => setUnitPrice(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Source */}
                  <div className="space-y-2">
                    <Label>Fuente del Repuesto</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={source === 'EXTERNAL' ? 'default' : 'outline'}
                        onClick={() => handleSourceChange('EXTERNAL')}
                        className="flex-1"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Compra Externa
                      </Button>
                      <Button
                        type="button"
                        variant={source === 'STOCK' ? 'default' : 'outline'}
                        onClick={() => handleSourceChange('STOCK')}
                        className="flex-1"
                      >
                        <Warehouse className="mr-2 h-4 w-4" />
                        Usar Inventario
                      </Button>
                    </div>
                  </div>

                  {source === 'STOCK' && (
                    <div className="p-3 bg-blue-50 rounded border border-blue-100 text-sm">
                      <span className="font-semibold text-blue-700">
                        Stock Disponible:
                      </span>{' '}
                      {availableStock !== null
                        ? `${availableStock} unidades`
                        : selectedMasterPartId
                          ? 'Consultando...'
                          : 'Selecciona un item con repuesto para ver stock'}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleAddItem} disabled={!selectedMantItem}>
                    Agregar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead>Proveedor / Origen</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">P. Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems
                ? displayItems.map(item => (
                    <TableRow key={item.workOrderItemId}>
                      <TableCell className="font-medium">
                        {item.mantItemName}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full',
                            typeConfig[
                              item.mantItemType as keyof typeof typeConfig
                            ]?.className || 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {typeConfig[
                            item.mantItemType as keyof typeof typeConfig
                          ]?.label || item.mantItemType}
                        </span>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        {item.supplier === 'INTERNAL_INVENTORY' ? (
                          <Badge variant="secondary">
                            <Warehouse className="h-3 w-3 mr-1" /> Stock Interno
                          </Badge>
                        ) : (
                          <span>{item.supplier || 'N/A'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            itemStatusConfig[
                              item.status as keyof typeof itemStatusConfig
                            ]?.variant || 'default'
                          }
                        >
                          {itemStatusConfig[
                            item.status as keyof typeof itemStatusConfig
                          ]?.label || item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                : workOrder.workOrderItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.mantItem.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full',
                            typeConfig[
                              (item.mantItem.type ||
                                'ACTION') as keyof typeof typeConfig
                            ]?.className || 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {typeConfig[
                            (item.mantItem.type ||
                              'ACTION') as keyof typeof typeConfig
                          ]?.label || 'Item'}
                        </span>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        {item.supplier === 'INTERNAL_INVENTORY' ? (
                          <Badge variant="secondary">
                            <Warehouse className="h-3 w-3 mr-1" /> Stock Interno
                          </Badge>
                        ) : (
                          <span>{item.supplier || 'N/A'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            itemStatusConfig[
                              item.status as keyof typeof itemStatusConfig
                            ]?.variant || 'default'
                          }
                        >
                          {itemStatusConfig[
                            item.status as keyof typeof itemStatusConfig
                          ]?.label || item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>

          {/* Total */}
          {totalCost > 0 && (
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <span className="text-sm text-muted-foreground">
                  Total Estimado:{' '}
                </span>
                <span className="text-lg font-bold">
                  ${totalCost.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
