'use client';
export const dynamic = 'force-dynamic';

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
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Plus,
  X,
  Search,
  FileText,
  Loader2,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import type { InvoiceOCRResult } from '@/lib/ocr/claude-vision';
import { useToast } from '@/components/hooks/use-toast';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { UploadButton } from '@/lib/uploadthing';

interface InvoiceItem {
  id: string;
  workOrderItemId?: number;
  mantItemId?: string;
  description: string;
  details?: string;
  category?: string;
  quantity: number;

  // Estimado (desde WO o PO)
  estimatedUnitPrice: number;
  estimatedTotal: number;

  // Real (usuario llena)
  realUnitPrice: number;
  realTotal: number;

  taxRate: number;
  taxAmount: number;
  total: number;

  // Control
  included: boolean;
  isFree: boolean;
}

interface PendingPO {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  total: number;
  provider: { id: string; name: string };
  workOrder: {
    id: string;
    title: string;
    vehicle: { licensePlate: string; brand: { name: string } };
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    workOrderItemId?: number;
    mantItemId?: string;
    masterPart?: { code: string; description: string };
  }>;
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const workOrderId = searchParams.get('workOrderId');
  const purchaseOrderIdParam = searchParams.get('purchaseOrderId');

  interface Provider {
    id: string;
    name: string;
    [key: string]: unknown;
  }

  interface WorkOrder {
    id: string;
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

  // Purchase Order state
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [selectedPOId, setSelectedPOId] = useState<string>(
    purchaseOrderIdParam || ''
  );
  const [selectedPO, setSelectedPO] = useState<PendingPO | null>(null);

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
  const [ocrResult, setOcrResult] = useState<InvoiceOCRResult | null>(null);

  // Dialog agregar item
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mantItems, setMantItems] = useState<MantItemType[]>([]);
  const [searchingItems, setSearchingItems] = useState(false);

  // Cargar items desde una OC seleccionada
  const loadPOItems = (po: PendingPO) => {
    setSelectedPO(po);
    setSupplierId(po.provider.id.toString());

    const poItems: InvoiceItem[] = po.items.map(item => {
      const unitPrice = Number(item.unitPrice);
      const qty = Number(item.quantity);
      const totals = calculateItemTotals(qty, unitPrice, 19);
      return {
        id: crypto.randomUUID(),
        ...(item.workOrderItemId
          ? { workOrderItemId: item.workOrderItemId }
          : {}),
        ...(item.mantItemId ? { mantItemId: item.mantItemId } : {}),
        description: item.masterPart
          ? `${item.description} (${item.masterPart.code})`
          : item.description,
        quantity: qty,
        estimatedUnitPrice: unitPrice,
        estimatedTotal: qty * unitPrice,
        realUnitPrice: unitPrice,
        ...totals,
        taxRate: 19,
        included: true,
        isFree: false,
      };
    });

    setItems(poItems);

    toast({
      title: 'Items pre-cargados',
      description: `${poItems.length} items cargados desde ${po.orderNumber}`,
    });
  };

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar providers y OC pendientes en paralelo
        const [providersRes, posRes] = await Promise.all([
          axios.get('/api/people/providers').catch(_err => ({ data: [] })),
          axios
            .get('/api/purchase-orders?status=APPROVED,SENT')
            .catch(_err => ({ data: [] })),
        ]);
        setProviders(Array.isArray(providersRes.data) ? providersRes.data : []);
        setPendingPOs(Array.isArray(posRes.data) ? posRes.data : []);

        // Si viene purchaseOrderId, cargar esa OC directamente
        if (purchaseOrderIdParam) {
          const poFromList = posRes.data.find(
            (po: PendingPO) => po.id === purchaseOrderIdParam
          );
          if (poFromList) {
            loadPOItems(poFromList);
          } else {
            // La OC no esta en la lista (puede que no sea SENT), intentar cargar igual
            try {
              const poRes = await axios.get(
                `/api/purchase-orders/${purchaseOrderIdParam}`
              );
              loadPOItems(poRes.data);
            } catch {
              toast({
                title: 'Error',
                description: 'No se pudo cargar la Orden de Compra',
                variant: 'destructive',
              });
            }
          }
        }
        // Si viene workOrderId (sin PO), cargar datos de la OT
        else if (workOrderId) {
          const woRes = await axios.get(
            `/api/maintenance/work-orders/${workOrderId}`
          );
          setWorkOrder(woRes.data);

          // Pre-fill supplierId si la WO tiene provider
          if (woRes.data.providerId) {
            setSupplierId(woRes.data.providerId.toString());
          }

          // Cargar items de la WorkOrder
          setLoadingWOItems(true);
          const woItemsRes = await axios.get(
            `/api/maintenance/work-orders/${workOrderId}/items`
          );

          interface WOItemResponse {
            id: string;
            description: string;
            mantItemId?: string;
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
            realUnitPrice: item.estimatedUnitPrice,
            realTotal: item.estimatedTotal,
            taxRate: 19,
            taxAmount: 0,
            total: 0,
            included: true,
            isFree: false,
          }));

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
          // Sin WO ni PO, item vacio por defecto
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, purchaseOrderIdParam]);

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
          params: { search: searchTerm },
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
    id: string;
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

    setItems(prev => [...prev, newItem]);
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

    setItems(prev => [...prev, newItem]);
    setAddItemDialogOpen(false);
  };

  // Toggle incluir item
  const toggleIncluded = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, included: !item.included } : item
      )
    );
  };

  // Toggle sin costo
  const toggleFree = (id: string) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const isFree = !item.isFree;
        const realUnitPrice = isFree ? 0 : item.estimatedUnitPrice;
        const totals = calculateItemTotals(
          item.quantity,
          realUnitPrice,
          item.taxRate
        );

        return {
          ...item,
          isFree,
          realUnitPrice,
          ...totals,
        };
      })
    );
  };

  // Remover item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
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
      total,
    };
  };

  // Calcular variación porcentual
  const calculateVariance = (estimated: number, real: number) => {
    if (estimated === 0) return 0;
    return ((real - estimated) / estimated) * 100;
  };

  // Actualizar precio real de item
  const updateRealPrice = (id: string, realUnitPrice: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const totals = calculateItemTotals(
          item.quantity,
          realUnitPrice,
          item.taxRate
        );

        return {
          ...item,
          realUnitPrice,
          ...totals,
        };
      })
    );
  };

  // Calcular totales generales (solo items incluidos)
  const totals = items
    .filter(item => item.included)
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
        workOrderId: workOrderId
          ? parseInt(workOrderId)
          : selectedPO?.workOrder.id || null,
        purchaseOrderId: selectedPO?.id || null,
        subtotal: totals.realSubtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        currency: 'COP',
        notes,
        attachmentUrl: attachmentUrl || null,
        items: items
          .filter(item => item.included) // Solo items incluidos
          .map(item => ({
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
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
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
          <TrendingUp className="h-3 w-3" />+{variance.toFixed(1)}%
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
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nueva Factura de Compra</h1>
            {workOrder && !selectedPO && (
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Vinculada a: {workOrder.title} (
                {workOrder.vehicle?.licensePlate})
              </p>
            )}
            {selectedPO && (
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                Desde OC: {selectedPO.orderNumber} —{' '}
                {selectedPO.workOrder.title} (
                {selectedPO.workOrder.vehicle.licensePlate})
              </p>
            )}
          </div>
          {workOrder && !selectedPO && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Costo Estimado</p>
              <p className="text-2xl font-bold text-blue-600">
                ${workOrder.estimatedCost?.toLocaleString('es-CO') || '0'}
              </p>
            </div>
          )}
          {selectedPO && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total OC</p>
              <p className="text-2xl font-bold text-blue-600">
                ${Number(selectedPO.total).toLocaleString('es-CO')}
              </p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selector de Orden de Compra - filtrado por proveedor */}
        {(() => {
          const filteredPOs = supplierId
            ? pendingPOs.filter(po => po.provider.id.toString() === supplierId)
            : pendingPOs;
          return (
            filteredPOs.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    Vincular a Orden de Compra
                    {supplierId && (
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {filteredPOs.length} OC
                        {filteredPOs.length !== 1 ? 's' : ''} pendiente
                        {filteredPOs.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>
                      {supplierId
                        ? 'Selecciona una OC de este proveedor para pre-cargar los items'
                        : 'Selecciona una OC para pre-cargar los items (o elige proveedor primero para filtrar)'}
                    </Label>
                    <Select
                      value={selectedPOId}
                      onValueChange={value => {
                        setSelectedPOId(value);
                        if (value === '_none') {
                          setSelectedPO(null);
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
                        } else {
                          const po = filteredPOs.find(p => p.id === value);
                          if (po) loadPOItems(po);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin orden de compra — factura independiente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">
                          Sin orden de compra — factura independiente
                        </SelectItem>
                        {filteredPOs.map(po => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.orderNumber} — {po.workOrder.title} —{' '}
                            {po.workOrder.vehicle.licensePlate} — $
                            {Number(po.total).toLocaleString('es-CO')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPO && (
                      <p className="text-xs text-muted-foreground">
                        OT: {selectedPO.workOrder.title} · Proveedor:{' '}
                        {selectedPO.provider.name} · {selectedPO.items.length}{' '}
                        items · Estado: {selectedPO.status}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          );
        })()}

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
                  onChange={e => setInvoiceNumber(e.target.value)}
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
                    {providers.map(provider => (
                      <SelectItem
                        key={provider.id}
                        value={provider.id.toString()}
                      >
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
                  onChange={e => setInvoiceDate(e.target.value)}
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
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>

              {/* Notas */}
              <div className="col-span-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
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
              {workOrder && !selectedPO && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Pre-cargados desde la Orden de Trabajo)
                </span>
              )}
              {selectedPO && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Pre-cargados desde {selectedPO.orderNumber})
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
                          checked={items.every(i => i.included)}
                          onCheckedChange={checked => {
                            setItems(prev =>
                              prev.map(item => ({
                                ...item,
                                included: checked === true,
                              }))
                            );
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-[35%]">Item</TableHead>
                      <TableHead className="text-center w-[60px]">
                        Cant.
                      </TableHead>
                      <TableHead className="text-right w-[140px]">
                        Estimado
                      </TableHead>
                      <TableHead className="text-right w-[180px]">
                        Precio Real *
                      </TableHead>
                      <TableHead className="text-right w-[120px]">
                        Total Real
                      </TableHead>
                      <TableHead className="text-center w-[100px]">
                        Variación
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => {
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
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {item.category}
                                  </Badge>
                                )}
                                {item.isFree && (
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-blue-600"
                                  >
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
                                Total: $
                                {item.estimatedTotal.toLocaleString('es-CO')}
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
                                onChange={e =>
                                  updateRealPrice(
                                    item.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={item.isFree}
                                className={cn(
                                  'text-right font-medium',
                                  variance > 5 && 'border-red-300 bg-red-50',
                                  variance < -5 &&
                                    'border-green-300 bg-green-50',
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
                  onChange={e => setSearchTerm(e.target.value)}
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
                    {mantItems.map(mantItem => (
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
                              <Badge
                                variant="secondary"
                                className="mt-2 text-xs"
                              >
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
              {(workOrder || selectedPO) && (
                <div className="grid grid-cols-2 gap-4 pb-3 border-b">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Subtotal Estimado
                    </p>
                    <p className="text-xl font-medium text-muted-foreground">
                      ${totals.estimatedSubtotal.toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Subtotal Real
                    </p>
                    <p className="text-xl font-bold">
                      ${totals.realSubtotal.toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              )}

              {/* IVA y Total */}
              <div className="space-y-2">
                {!workOrder && !selectedPO && (
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
              {(workOrder || selectedPO) && (
                <div className="mt-4 p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Variación Total:</span>
                    <div className="text-right">
                      {renderVarianceBadge(totalVariance)}
                      <p className="text-sm text-muted-foreground mt-1">
                        {totalVariance > 0
                          ? 'Sobrecosto'
                          : totalVariance < 0
                            ? 'Ahorro'
                            : 'Sin variación'}
                        : $
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
                  onClientUploadComplete={res => {
                    const uploaded = res?.[0];
                    if (uploaded?.url) {
                      setAttachmentUrl(uploaded.url);
                      setFileUploaded(true);

                      const sd = uploaded.serverData;
                      const confidence =
                        typeof sd?.ocrConfidence === 'number'
                          ? sd.ocrConfidence
                          : 0;
                      if (confidence >= 40) {
                        const parsedItems =
                          typeof sd?.ocrItemsJson === 'string'
                            ? (JSON.parse(
                                sd.ocrItemsJson
                              ) as InvoiceOCRResult['items'])
                            : undefined;
                        const ocr: InvoiceOCRResult = {
                          confidence,
                          ...(typeof sd?.ocrInvoiceNumber === 'string' && {
                            invoiceNumber: sd.ocrInvoiceNumber,
                          }),
                          ...(typeof sd?.ocrInvoiceDate === 'string' && {
                            invoiceDate: sd.ocrInvoiceDate,
                          }),
                          ...(typeof sd?.ocrDueDate === 'string' && {
                            dueDate: sd.ocrDueDate,
                          }),
                          ...(typeof sd?.ocrSupplierName === 'string' && {
                            supplierName: sd.ocrSupplierName,
                          }),
                          ...(typeof sd?.ocrSupplierNit === 'string' && {
                            supplierNit: sd.ocrSupplierNit,
                          }),
                          ...(typeof sd?.ocrSubtotal === 'number' && {
                            subtotal: sd.ocrSubtotal,
                          }),
                          ...(typeof sd?.ocrTaxAmount === 'number' && {
                            taxAmount: sd.ocrTaxAmount,
                          }),
                          ...(typeof sd?.ocrTotal === 'number' && {
                            total: sd.ocrTotal,
                          }),
                          ...(parsedItems !== undefined && {
                            items: parsedItems,
                          }),
                        };
                        setOcrResult(ocr);
                        if (ocr.invoiceNumber)
                          setInvoiceNumber(ocr.invoiceNumber);
                        if (ocr.invoiceDate) setInvoiceDate(ocr.invoiceDate);
                        if (ocr.dueDate) setDueDate(ocr.dueDate);
                        toast({
                          title: '¡Factura detectada!',
                          description: `OCR completado con ${confidence}% de confianza`,
                        });
                      } else {
                        toast({
                          title: '¡Archivo subido!',
                          description: 'La factura se ha cargado correctamente',
                        });
                      }
                    }
                  }}
                  onUploadError={error => {
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

        {/* Panel OCR — Datos detectados de la factura */}
        {ocrResult && ocrResult.confidence > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
                <Sparkles className="h-4 w-4" />
                Factura detectada ({ocrResult.confidence}% confianza)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Resumen de datos de cabecera */}
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-600">
                {ocrResult.invoiceNumber && (
                  <p>
                    <span className="font-medium">N° Factura:</span>{' '}
                    {ocrResult.invoiceNumber}
                  </p>
                )}
                {ocrResult.supplierName && (
                  <p>
                    <span className="font-medium">Proveedor:</span>{' '}
                    {ocrResult.supplierName}
                    {ocrResult.supplierNit &&
                      ` (NIT: ${ocrResult.supplierNit})`}
                  </p>
                )}
                {ocrResult.invoiceDate && (
                  <p>
                    <span className="font-medium">Fecha:</span>{' '}
                    {new Date(ocrResult.invoiceDate).toLocaleDateString(
                      'es-CO'
                    )}
                  </p>
                )}
                {ocrResult.total !== undefined && (
                  <p>
                    <span className="font-medium">Total:</span> $
                    {ocrResult.total.toLocaleString('es-CO')}
                  </p>
                )}
              </div>

              {/* Tabla de ítems detectados */}
              {ocrResult.items && ocrResult.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-700">
                    {ocrResult.items.length} ítem
                    {ocrResult.items.length !== 1 ? 's' : ''} detectado
                    {ocrResult.items.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="rounded border border-blue-200 bg-white overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-blue-700">
                            Descripción
                          </th>
                          <th className="px-3 py-2 text-center font-medium text-blue-700 w-14">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-blue-700 w-28">
                            P/Unit
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-blue-700 w-28">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ocrResult.items.map((item, idx) => (
                          <tr key={idx} className="border-t border-blue-100">
                            <td className="px-3 py-1.5 text-gray-700">
                              {item.description}
                            </td>
                            <td className="px-3 py-1.5 text-center text-gray-600">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-600">
                              ${item.unitPrice.toLocaleString('es-CO')}
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-600">
                              ${item.total.toLocaleString('es-CO')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const ocrItems = (ocrResult.items ?? []).map(item => {
                          const totals = calculateItemTotals(
                            item.quantity,
                            item.unitPrice,
                            19
                          );
                          return {
                            id: crypto.randomUUID(),
                            description: item.description,
                            quantity: item.quantity,
                            estimatedUnitPrice: item.unitPrice,
                            estimatedTotal: item.quantity * item.unitPrice,
                            realUnitPrice: item.unitPrice,
                            taxRate: 19,
                            included: true,
                            isFree: false,
                            ...totals,
                          } satisfies InvoiceItem;
                        });
                        setItems(prev => [...prev, ...ocrItems]);
                        setOcrResult(prev =>
                          prev ? { ...prev, items: [] } : null
                        );
                        toast({
                          title: 'Ítems agregados',
                          description: `${ocrItems.length} ítem${ocrItems.length !== 1 ? 's' : ''} agregado${ocrItems.length !== 1 ? 's' : ''} al formulario`,
                        });
                      }}
                    >
                      Agregar al formulario
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-700"
                      onClick={() =>
                        setOcrResult(prev =>
                          prev ? { ...prev, items: [] } : null
                        )
                      }
                    >
                      Ignorar ítems
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-blue-500">
                N° de factura y fechas aplicados al formulario — revisá y
                corregí si es necesario
              </p>
            </CardContent>
          </Card>
        )}

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
