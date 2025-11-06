'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import axios from 'axios';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  workOrderItemId?: number;
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const workOrderId = searchParams.get('workOrderId');

  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [workOrder, setWorkOrder] = useState<any>(null);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 19, // IVA Colombia por defecto
      subtotal: 0,
      taxAmount: 0,
      total: 0,
    },
  ]);

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
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [workOrderId, toast]);

  // Calcular totales de un item
  const calculateItemTotals = (
    quantity: number,
    unitPrice: number,
    taxRate: number
  ) => {
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  // Actualizar item
  const updateItem = (id: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        // Convertir valores numéricos, usando 0 como fallback para valores inválidos
        const numericValue =
          ['quantity', 'unitPrice', 'taxRate'].includes(field)
            ? parseFloat(value) || 0
            : value;

        const updated = { ...item, [field]: numericValue };

        // Recalcular totales si cambian quantity, unitPrice o taxRate
        if (['quantity', 'unitPrice', 'taxRate'].includes(field)) {
          const totals = calculateItemTotals(
            field === 'quantity' ? numericValue : updated.quantity,
            field === 'unitPrice' ? numericValue : updated.unitPrice,
            field === 'taxRate' ? numericValue : updated.taxRate
          );
          return { ...updated, ...totals };
        }

        return updated;
      })
    );
  };

  // Agregar item
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 19,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      },
    ]);
  };

  // Eliminar item
  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast({
        title: 'Error',
        description: 'Debe haber al menos un item',
        variant: 'destructive',
      });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calcular totales generales
  const totals = items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + item.subtotal,
      taxAmount: acc.taxAmount + item.taxAmount,
      total: acc.total + item.total,
    }),
    { subtotal: 0, taxAmount: 0, total: 0 }
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

    const emptyItems = items.filter((item) => !item.description.trim());
    if (emptyItems.length > 0) {
      toast({
        title: 'Error',
        description: 'Todos los items deben tener descripción',
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
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        currency: 'COP',
        notes,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          total: item.total,
        })),
      };

      await axios.post('/api/invoices', payload);

      toast({
        title: 'Éxito',
        description: 'Factura creada correctamente',
      });

      // Redirect
      if (workOrderId) {
        router.push(`/dashboard/maintenance/work-orders/${workOrderId}`);
      } else {
        router.push('/dashboard/maintenance/work-orders');
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description:
          error.response?.data?.error || 'No se pudo crear la factura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl">
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
        <h1 className="text-3xl font-bold">Nueva Factura</h1>
        {workOrder && (
          <p className="text-muted-foreground mt-2">
            Orden de Trabajo: {workOrder.title} (
            {workOrder.vehicle.licensePlate})
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WorkOrder (si existe) */}
            {workOrder && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium">Orden de Trabajo Vinculada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {workOrder.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  Costo estimado: $
                  {workOrder.estimatedCost?.toLocaleString('es-CO') || '0'}
                </p>
              </div>
            )}

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

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="dueDate">Fecha Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
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

            {/* Notas */}
            <div>
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items de la Factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 space-y-3 relative"
              >
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">Item {index + 1}</p>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <Label>
                    Descripción <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, 'description', e.target.value)
                    }
                    placeholder="Ej: Aceite Shell Helix 20W50"
                    required
                  />
                </div>

                {/* Cantidad, Precio, IVA */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>
                      Cantidad <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, 'quantity', parseFloat(e.target.value))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>
                      Precio Unit. <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(item.id, 'unitPrice', parseFloat(e.target.value))
                      }
                      placeholder="30000"
                      required
                    />
                  </div>
                  <div>
                    <Label>IVA %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.taxRate}
                      onChange={(e) =>
                        updateItem(item.id, 'taxRate', parseFloat(e.target.value))
                      }
                    />
                  </div>
                </div>

                {/* Totales calculados */}
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">
                      ${item.subtotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA:</span>
                    <span className="font-medium">
                      ${item.taxAmount.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>Total:</span>
                    <span>${item.total.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Item
            </Button>
          </CardContent>
        </Card>

        {/* Totales Generales */}
        <Card>
          <CardHeader>
            <CardTitle>Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-lg">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">
                  ${totals.subtotal.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>IVA:</span>
                <span className="font-medium">
                  ${totals.taxAmount.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between text-2xl font-bold">
                <span>TOTAL:</span>
                <span>${totals.total.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Factura'}
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
