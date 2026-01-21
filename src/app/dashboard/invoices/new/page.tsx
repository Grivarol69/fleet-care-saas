'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, CheckCircle2, Plus, X, Search, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { UploadButton } from '@/lib/uploadthing';

interface InvoiceItem {
  id: string;
  workOrderItemId?: number;
  mantItemId?: number;
  description: string;
  details?: string;
  category?: string;
  quantity: number;

  // Estimado (desde WO)
  estimatedUnitPrice: number;
  estimatedTotal: number;

  // Real (usuario llena)
  realUnitPrice: number;
  realTotal: number;

  taxRate: number;
  taxAmount: number;
  total: number;

  // Control
  included: boolean;  // Si incluir en factura
  isFree: boolean;    // Si es sin costo
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const workOrderId = searchParams.get('workOrderId');

  interface Provider {
    id: number;
    name: string;
    [key: string]: unknown;
  }

  interface WorkOrder {
    id: number;
    title: string;
    items?: InvoiceItem[];
    estimatedCost?: number;
    vehicle?: {
      licensePlate: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  const [loading, setLoading] = useState(false);
  const [loadingWOItems, setLoadingWOItems] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [fileUploaded, setFileUploaded] = useState(false);

  // Dialog agregar item
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mantItems, setMantItems] = useState<MantItemType[]>([]);
  const [searchingItems, setSearchingItems] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar providers
        const providersRes = await axios.get('/api/people/providers');
        setProviders(providersRes.data);

        // Si viene workOrderId, cargar datos
        if (workOrderId) {
          const woRes = await axios.get(
            `/api/maintenance/work-orders/${workOrderId}`
          );
          setWorkOrder(woRes.data);

          // Pre-fill supplierId si la WO tiene provider
          if (woRes.data.providerId) {
            setSupplierId(woRes.data.providerId.toString());
          }

          // 🎯 CARGAR ITEMS DE LA WORKORDER
          setLoadingWOItems(true);
          const woItemsRes = await axios.get(
            `/api/maintenance/work-orders/${workOrderId}/items`
          );

          // Mapear items de WO a formato de factura
          interface WOItemResponse {
            id: number;
            description: string;
            mantItemId?: number;
            category?: { name: string };
            cost?: number;
            quantity?: number;
            [key: string]: unknown;
          }
          const woItems = woItemsRes.data.items.map((item: WOItemResponse) => ({
            id: crypto.randomUUID(),
            workOrderItemId: item.workOrderItemId,
            description: item.description,
            details: item.details,
            category: item.category,
            quantity: item.quantity,
            estimatedUnitPrice: item.estimatedUnitPrice,
            estimatedTotal: item.estimatedTotal,
            // Usuario llenará estos
            realUnitPrice: item.estimatedUnitPrice, // Pre-poblar con estimado
            realTotal: item.estimatedTotal,
            taxRate: 19, // IVA Colombia
            taxAmount: 0,
            total: 0,
            included: true,  // Por defecto incluido
            isFree: false,   // Por defecto no es gratis
          }));

          // Calcular totales iniciales
          const itemsWithTotals = woItems.map((item: InvoiceItem) => {
            const totals = calculateItemTotals(
              item.quantity,
              item.realUnitPrice,
              item.taxRate
            );
            return { ...item, ...totals };
          });

          setItems(itemsWithTotals);
          setLoadingWOItems(false);
        } else {
          // Sin WO, item vacío por defecto
          setItems([
            {
              id: crypto.randomUUID(),
              description: '',
              quantity: 1,
              estimatedUnitPrice: 0,
              estimatedTotal: 0,
              realUnitPrice: 0,
              realTotal: 0,
              taxRate: 19,
              taxAmount: 0,
              total: 0,
              included: true,
              isFree: false,
            },
          ]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos',
          variant: 'destructive',
        });
        setLoadingWOItems(false);
      }
    };

    fetchData();
  }, [workOrderId, toast]);

  // Buscar MantItems cuando cambia el término de búsqueda
  useEffect(() => {
    const searchMantItems = async () => {
      if (searchTerm.length < 2) {
        setMantItems([]);
        return;
      }

      try {
        setSearchingItems(true);
        const response = await axios.get('/api/maintenance/mant-items', {
          params: { search: searchTerm }
        });
        setMantItems(response.data);
      } catch (error) {
        console.error('Error searching mant items:', error);
      } finally {
        setSearchingItems(false);
      }
    };

    const timeoutId = setTimeout(searchMantItems, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Agregar item desde MantItem
  interface MantItemType {
    id: number;
    name: string;
    description?: string;
    category?: { name: string };
    [key: string]: unknown;
  }

  const addItemFromMantItem = (mantItem: MantItemType) => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      mantItemId: mantItem.id,
      description: mantItem.name,
      details: mantItem.description || '',
      category: mantItem.category?.name || '',
      quantity: 1,
      estimatedUnitPrice: 0,
      estimatedTotal: 0,
      realUnitPrice: 0,
      realTotal: 0,
      taxRate: 19,
      taxAmount: 0,
      total: 0,
      included: true,
      isFree: false,
    };

    setItems((prev) => [...prev, newItem]);
    setAddItemDialogOpen(false);
    setSearchTerm('');
    setMantItems([]);

    toast({
      title: 'Item Agregado',
      description: `${mantItem.name} fue agregado a la factura`,
    });
  };

  // Agregar item manual (sin MantItem)
  const addBlankItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      estimatedUnitPrice: 0,
      estimatedTotal: 0,
      realUnitPrice: 0,
      realTotal: 0,
      taxRate: 19,
      taxAmount: 0,
      total: 0,
      included: true,
      isFree: false,
    };

    setItems((prev) => [...prev, newItem]);
    setAddItemDialogOpen(false);
  };

  // Toggle incluir item
  const toggleIncluded = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, included: !item.included } : item
      )
    );
  };

  // Toggle sin costo
  const toggleFree = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const isFree = !item.isFree;
        const realUnitPrice = isFree ? 0 : item.estimatedUnitPrice;
        const totals = calculateItemTotals(item.quantity, realUnitPrice, item.taxRate);

        return {
          ...item,
          isFree,
          realUnitPrice,
          ...totals
        };
      })
    );
  };

  // Remover item
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calcular totales de un item
  const calculateItemTotals = (
    quantity: number,
    unitPrice: number,
    taxRate: number
  ) => {
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return {
      realTotal: subtotal,
      taxAmount,
      total
    };
  };

  // Calcular variación porcentual
  const calculateVariance = (estimated: number, real: number) => {
    if (estimated === 0) return 0;
    return ((real - estimated) / estimated) * 100;
  };

  // Actualizar precio real de item
  const updateRealPrice = (id: string, realUnitPrice: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const totals = calculateItemTotals(
          item.quantity,
          realUnitPrice,
          item.taxRate
        );

        return {
          ...item,
          realUnitPrice,
          ...totals
        };
      })
    );
  };

  // Calcular totales generales (solo items incluidos)
  const totals = items
    .filter((item) => item.included)
    .reduce(
      (acc, item) => ({
        estimatedSubtotal: acc.estimatedSubtotal + item.estimatedTotal,
        realSubtotal: acc.realSubtotal + item.realTotal,
        taxAmount: acc.taxAmount + item.taxAmount,
        total: acc.total + item.total,
      }),
      { estimatedSubtotal: 0, realSubtotal: 0, taxAmount: 0, total: 0 }
    );

  const totalVariance = calculateVariance(
    totals.estimatedSubtotal,
    totals.realSubtotal
  );

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!invoiceNumber.trim()) {
      toast({
        title: 'Error',
        description: 'El número de factura es requerido',
        variant: 'destructive',
      });
      return;
    }

    if (!supplierId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un proveedor',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        invoiceNumber,
        invoiceDate,
        dueDate: dueDate || null,
        supplierId: parseInt(supplierId),
        workOrderId: workOrderId ? parseInt(workOrderId) : null,
        subtotal: totals.realSubtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        currency: 'COP',
        notes,
        attachmentUrl: attachmentUrl || null,
        items: items
          .filter((item) => item.included) // Solo items incluidos
          .map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.realUnitPrice,
            subtotal: item.realTotal,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            total: item.total,
            workOrderItemId: item.workOrderItemId || null,
          })),
      };

      await axios.post('/api/invoices', payload);

      toast({
        title: '¡Éxito!',
        description: 'Factura creada correctamente',
      });

      // Redirect
      if (workOrderId) {
        router.push(`/dashboard/maintenance/work-orders/${workOrderId}`);
      } else {
        router.push('/dashboard/invoices');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'No se pudo crear la factura';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Renderizar badge de variación
  const renderVarianceBadge = (variance: number) => {
    if (Math.abs(variance) < 3) {
      return (
        <Badge variant="outline" className="gap-1">
          <Minus className="h-3 w-3" />
          {variance.toFixed(1)}%
        </Badge>
      );
    }

    if (variance > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          +{variance.toFixed(1)}%
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <TrendingDown className="h-3 w-3" />
        {variance.toFixed(1)}%
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nueva Factura de Compra</h1>
            {workOrder && (
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Vinculada a: {workOrder.title} ({workOrder.vehicle?.licensePlate})
              </p>
            )}
          </div>
          {workOrder && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Costo Estimado</p>
              <p className="text-2xl font-bold text-blue-600">
                ${workOrder.estimatedCost?.toLocaleString('es-CO') || '0'}
              </p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Número factura */}
              <div>
                <Label htmlFor="invoiceNumber">
                  Número de Factura <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="FC-2024-00123"
                  required
                />
              </div>

              {/* Proveedor */}
              <div>
                <Label htmlFor="supplier">
                  Proveedor <span className="text-red-500">*</span>
                </Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id.toString()}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha emisión */}
              <div>
                <Label htmlFor="invoiceDate">
                  Fecha Emisión <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </div>

              {/* Fecha vencimiento */}
              <div>
                <Label htmlFor="dueDate">Fecha Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Notas */}
              <div className="col-span-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items - Tabla Comparativa */}
        <Card>
          <CardHeader>
            <CardTitle>
              Items de la Factura
              {workOrder && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Pre-cargados desde la Orden de Trabajo)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loading state items */}
            {loadingWOItems ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando items de la orden de trabajo...
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px] text-center">
                        <Checkbox
                          checked={items.every((i) => i.included)}
                          onCheckedChange={(checked) => {
                            setItems((prev) =>
                              prev.map((item) => ({
                                ...item,
                                included: checked === true,
                              }))
                            );
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-[35%]">Item</TableHead>
                      <TableHead className="text-center w-[60px]">Cant.</TableHead>
                      <TableHead className="text-right w-[140px]">Estimado</TableHead>
                      <TableHead className="text-right w-[180px]">
                        Precio Real *
                      </TableHead>
                      <TableHead className="text-right w-[120px]">Total Real</TableHead>
                      <TableHead className="text-center w-[100px]">Variación</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const variance = calculateVariance(
                        item.estimatedUnitPrice,
                        item.realUnitPrice
                      );

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            'group transition-opacity',
                            !item.included && 'opacity-40'
                          )}
                        >
                          {/* Checkbox Incluir */}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={item.included}
                              onCheckedChange={() => toggleIncluded(item.id)}
                            />
                          </TableCell>

                          {/* Descripción */}
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.details && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.details}
                                </p>
                              )}
                              <div className="flex gap-1 mt-1">
                                {item.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.category}
                                  </Badge>
                                )}
                                {item.isFree && (
                                  <Badge variant="default" className="text-xs bg-blue-600">
                                    Sin costo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Cantidad */}
                          <TableCell className="text-center font-medium">
                            {item.quantity}
                          </TableCell>

                          {/* Estimado */}
                          <TableCell className="text-right">
                            <div className="text-muted-foreground text-sm">
                              ${item.estimatedUnitPrice.toLocaleString('es-CO')}
                            </div>
                            {item.estimatedTotal > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Total: ${item.estimatedTotal.toLocaleString('es-CO')}
                              </div>
                            )}
                          </TableCell>

                          {/* Precio Real (Editable) */}
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.realUnitPrice}
                                onChange={(e) =>
                                  updateRealPrice(
                                    item.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={item.isFree}
                                className={cn(
                                  'text-right font-medium',
                                  variance > 5 && 'border-red-300 bg-red-50',
                                  variance < -5 && 'border-green-300 bg-green-50',
                                  item.isFree && 'bg-blue-50'
                                )}
                                required={!item.isFree}
                              />
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`free-${item.id}`}
                                  checked={item.isFree}
                                  onCheckedChange={() => toggleFree(item.id)}
                                />
                                <Label
                                  htmlFor={`free-${item.id}`}
                                  className="text-xs cursor-pointer"
                                >
                                  Sin costo
                                </Label>
                              </div>
                            </div>
                          </TableCell>

                          {/* Total Real */}
                          <TableCell className="text-right font-semibold">
                            ${item.realTotal.toLocaleString('es-CO')}
                          </TableCell>

                          {/* Variación */}
                          <TableCell className="text-center">
                            {renderVarianceBadge(variance)}
                          </TableCell>

                          {/* Eliminar */}
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Botón Agregar Item */}
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddItemDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialog Agregar Item */}
        <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agregar Item a la Factura</DialogTitle>
              <DialogDescription>
                Busca un item del catálogo o agrega uno manual
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {/* Resultados */}
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                {searchingItems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : mantItems.length > 0 ? (
                  <div className="divide-y">
                    {mantItems.map((mantItem) => (
                      <button
                        key={mantItem.id}
                        type="button"
                        onClick={() => addItemFromMantItem(mantItem)}
                        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{mantItem.name}</p>
                            {mantItem.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {mantItem.description}
                              </p>
                            )}
                            {mantItem.category && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {mantItem.category.name}
                              </Badge>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground ml-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchTerm.length >= 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron items
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Escribe al menos 2 caracteres para buscar
                  </div>
                )}
              </div>

              {/* Botón item manual */}
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBlankItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item Manual (sin catálogo)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Totales */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {/* Comparación Estimado vs Real */}
              {workOrder && (
                <div className="grid grid-cols-2 gap-4 pb-3 border-b">
                  <div>
                    <p className="text-sm text-muted-foreground">Subtotal Estimado</p>
                    <p className="text-xl font-medium text-muted-foreground">
                      ${totals.estimatedSubtotal.toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Subtotal Real</p>
                    <p className="text-xl font-bold">
                      ${totals.realSubtotal.toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              )}

              {/* IVA y Total */}
              <div className="space-y-2">
                {!workOrder && (
                  <div className="flex justify-between text-lg">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      ${totals.realSubtotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg">
                  <span>IVA (19%):</span>
                  <span className="font-semibold">
                    ${totals.taxAmount.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-2xl font-bold pt-3 border-t-2">
                  <span>TOTAL:</span>
                  <span className="text-blue-600">
                    ${totals.total.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {/* Variación Total */}
              {workOrder && (
                <div className="mt-4 p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Variación Total:</span>
                    <div className="text-right">
                      {renderVarianceBadge(totalVariance)}
                      <p className="text-sm text-muted-foreground mt-1">
                        {totalVariance > 0 ? 'Sobrecosto' : totalVariance < 0 ? 'Ahorro' : 'Sin variación'}: $
                        {Math.abs(
                          totals.realSubtotal - totals.estimatedSubtotal
                        ).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Factura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Factura Escaneada (Opcional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!fileUploaded ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Sube el PDF o imagen de la factura para respaldo documental
                </p>
                <UploadButton
                  endpoint="invoiceUploader"
                  onClientUploadComplete={(res) => {
                    if (res?.[0]?.url) {
                      setAttachmentUrl(res[0].url);
                      setFileUploaded(true);
                      toast({
                        title: '¡Archivo subido!',
                        description: 'La factura se ha cargado correctamente',
                      });
                    }
                  }}
                  onUploadError={(error) => {
                    toast({
                      title: 'Error al subir archivo',
                      description: error.message,
                      variant: 'destructive',
                    });
                  }}
                  className="ut-button:w-full ut-button:bg-primary ut-button:hover:bg-primary/90"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    ✓ Factura cargada correctamente
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAttachmentUrl('');
                    setFileUploaded(false);
                  }}
                >
                  Cambiar archivo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Guardando...' : '💾 Guardar Factura'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
