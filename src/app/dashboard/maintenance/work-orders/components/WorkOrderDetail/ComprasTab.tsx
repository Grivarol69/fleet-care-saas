'use client';

import { useState } from 'react';
import {
  ShoppingCart,
  Receipt,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { canViewCosts, canOverrideWorkOrderFreeze } from '@/lib/permissions';
import { useToast } from '@/components/hooks/use-toast';
import { ExpensesTab } from './ExpensesTab';
import { Checkbox } from '@/components/ui/checkbox';
import axios from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PO_STATUS_NO_INVOICE = new Set([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'PARTIAL',
]);

export function ComprasTab({ workOrder, currentUser, onRefresh }: any) {
  const showCosts = canViewCosts(currentUser as any);
  const isOverride = canOverrideWorkOrderFreeze(currentUser as any);
  const { toast } = useToast();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedExternalIds, setSelectedExternalIds] = useState<string[]>([]);
  const [isGeneratingOC, setIsGeneratingOC] = useState(false);
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [regenerateItem, setRegenerateItem] = useState<any | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const pendingExternalItems = (workOrder.workOrderItems || []).filter(
    (i: any) =>
      i.itemSource === 'EXTERNAL' &&
      i.status !== 'CANCELLED' &&
      (!i.purchaseOrderItems || i.purchaseOrderItems.length === 0)
  );

  const poLinkedExternalItems = (workOrder.workOrderItems || []).filter(
    (i: any) =>
      (i.itemSource === 'EXTERNAL' || i.itemSource === 'INTERNAL_PURCHASE') &&
      i.status !== 'CANCELLED' &&
      i.purchaseOrderItems?.length > 0
  );

  const pos = workOrder.purchaseOrders || [];
  const totalOCs = pos.reduce(
    (a: number, p: any) => a + Number(p.total || 0),
    0
  );

  const invoices = workOrder.invoices || [];

  const handlePoAction = async (poId: string, action: 'submit' | 'send') => {
    setActioningId(poId);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      await onRefresh();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'No se pudo actualizar la orden de compra',
        variant: 'destructive',
      });
    } finally {
      setActioningId(null);
    }
  };

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

  const handleRegenerateOC = async () => {
    if (!regenerateItem) return;
    setIsRegenerating(true);
    try {
      await axios.post(
        `/api/maintenance/work-orders/${workOrder.id}/purchase-orders`,
        { itemIds: [regenerateItem.id] }
      );
      toast({
        title: 'OC regenerada',
        description: 'Nueva orden de compra creada.',
      });
      setRegenerateItem(null);
      onRefresh();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo regenerar la OC',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // POs that will be cancelled on regeneration (DRAFT or PENDING_APPROVAL)
  const cancellablePOs = (workOrder.purchaseOrders || []).filter(
    (po: any) => po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL'
  );
  const nonCancellablePOs = (workOrder.purchaseOrders || []).filter(
    (po: any) => po.status === 'APPROVED' || po.status === 'SENT'
  );

  return (
    <div className="space-y-6">
      {/* Sección 0: Pendientes de OC */}
      {pendingExternalItems.length > 0 && (
        <Card className="border-orange-100">
          <CardHeader className="flex flex-row items-center justify-between bg-orange-50/50 pb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg text-orange-900">
                Ítems Pendientes de Compra
              </CardTitle>
            </div>
            <Button
              variant="default"
              disabled={
                selectedExternalIds.length === 0 ||
                isGeneratingOC ||
                selectedExternalIds.some(
                  id =>
                    pendingExternalItems.find((i: any) => i.id === id)
                      ?.providerId === null
                )
              }
              onClick={handleGenerateOC}
            >
              {isGeneratingOC && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generar Órdenes de Compra ({selectedExternalIds.length})
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Ítem / Descripción</TableHead>
                  <TableHead>Proveedor Asignado</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Precio Unit.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingExternalItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedExternalIds.includes(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        disabled={!item.providerId}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.mantItem.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.provider?.name ? (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700"
                        >
                          {item.provider.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-red-500 font-semibold">
                          Falta Proveedor
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sección 0b: Ítems con OC — Regenerar OC (solo OWNER) */}
      {isOverride && poLinkedExternalItems.length > 0 && (
        <Card className="border-yellow-100">
          <CardHeader className="flex flex-row items-center gap-2 bg-yellow-50/50 pb-4">
            <ShoppingCart className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg text-yellow-900">
              Ítems con OC Vinculada — Regenerar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem / Descripción</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>OC Vinculada</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Precio Unit.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poLinkedExternalItems.map((item: any) => {
                  const linkedPO = (workOrder.purchaseOrders || []).find(
                    (po: any) =>
                      po.items?.some(
                        (poi: any) => poi.workOrderItemId === item.id
                      )
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">
                          {item.mantItem?.name ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.provider?.name ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700"
                          >
                            {item.provider.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-red-500 font-semibold">
                            Falta Proveedor
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {linkedPO ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {linkedPO.orderNumber}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {showCosts ? formatCurrency(item.unitPrice) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                          disabled={!item.providerId}
                          onClick={() => setRegenerateItem(item)}
                        >
                          Regenerar OC
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sección 1: Órdenes de Compra Generadas */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <ShoppingCart className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">Órdenes de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          {pos.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed rounded-lg text-muted-foreground text-sm">
              No hay órdenes de compra generadas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Orden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po: any) => {
                  let badgeVariant: 'default' | 'secondary' | 'outline' =
                    'outline';
                  let badgeClass = '';
                  let badgeLabel = po.status;

                  if (po.status === 'DRAFT') {
                    badgeVariant = 'outline';
                    badgeLabel = 'Borrador';
                  } else if (po.status === 'PENDING_APPROVAL') {
                    badgeVariant = 'secondary';
                    badgeClass =
                      'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
                    badgeLabel = 'En Aprobación';
                  } else if (po.status === 'APPROVED') {
                    badgeVariant = 'secondary';
                    badgeClass = 'bg-blue-100 text-blue-800 hover:bg-blue-100';
                    badgeLabel = 'Aprobada';
                  } else if (po.status === 'SENT') {
                    badgeVariant = 'secondary';
                    badgeClass =
                      'bg-green-100 text-green-800 hover:bg-green-100';
                    badgeLabel = 'Enviada';
                  } else if (po.status === 'PARTIAL') {
                    badgeVariant = 'secondary';
                    badgeClass =
                      'bg-indigo-100 text-indigo-800 hover:bg-indigo-100';
                    badgeLabel = 'Parcial';
                  } else if (po.status === 'COMPLETED') {
                    badgeVariant = 'default';
                    badgeClass = 'bg-green-600 text-white hover:bg-green-700';
                    badgeLabel = 'Completada';
                  } else if (po.status === 'CANCELLED') {
                    badgeVariant = 'outline';
                    badgeClass = 'text-red-600 border-red-600';
                    badgeLabel = 'Cancelada';
                  }

                  const isActioning = actioningId === po.id;

                  const isExpanded = expandedPoId === po.id;
                  const poItems = po.items || [];

                  return (
                    <>
                      <TableRow
                        key={po.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() =>
                          setExpandedPoId(isExpanded ? null : po.id)
                        }
                      >
                        <TableCell className="font-medium text-xs font-mono">
                          <div className="flex items-center gap-1">
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                            {po.orderNumber}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {po.provider?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          {po.type === 'PARTS' ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              Repuestos
                            </Badge>
                          ) : po.type === 'SERVICES' ? (
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-700 border-purple-200"
                            >
                              Servicios
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={badgeVariant}
                              className={badgeClass}
                            >
                              {badgeLabel}
                            </Badge>
                            {PO_STATUS_NO_INVOICE.has(po.status) && (
                              <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">
                                Sin factura
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {showCosts ? formatCurrency(po.total) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {po.notes || '—'}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          {po.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActioning}
                              onClick={() => handlePoAction(po.id, 'submit')}
                            >
                              {isActioning ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Enviar a Aprobación
                            </Button>
                          )}
                          {po.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActioning}
                              onClick={() => handlePoAction(po.id, 'send')}
                            >
                              {isActioning ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Enviar OC
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${po.id}-detail`}>
                          <TableCell
                            colSpan={7}
                            className="bg-muted/20 px-8 py-3"
                          >
                            {poItems.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Sin ítems registrados.
                              </p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground border-b">
                                    <th className="text-left pb-1 font-medium">
                                      Descripción
                                    </th>
                                    <th className="text-right pb-1 font-medium w-16">
                                      Cant.
                                    </th>
                                    {showCosts && (
                                      <th className="text-right pb-1 font-medium w-24">
                                        Precio Unit.
                                      </th>
                                    )}
                                    {showCosts && (
                                      <th className="text-right pb-1 font-medium w-24">
                                        Subtotal
                                      </th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {poItems.map((item: any) => (
                                    <tr
                                      key={item.id}
                                      className="border-b last:border-0"
                                    >
                                      <td className="py-1">
                                        <span className="font-medium">
                                          {item.workOrderItem?.mantItem?.name ??
                                            '—'}
                                        </span>
                                        {item.workOrderItem?.description && (
                                          <span className="ml-1 text-muted-foreground">
                                            {item.workOrderItem.description}
                                          </span>
                                        )}
                                      </td>
                                      <td className="text-right py-1">
                                        {item.quantity}
                                      </td>
                                      {showCosts && (
                                        <td className="text-right py-1 font-mono">
                                          {formatCurrency(item.unitPrice)}
                                        </td>
                                      )}
                                      {showCosts && (
                                        <td className="text-right py-1 font-mono">
                                          {formatCurrency(
                                            Number(item.unitPrice) *
                                              Number(item.quantity)
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">
                    Total comprometido
                  </TableCell>
                  <TableCell colSpan={3} className="font-bold font-mono">
                    {showCosts ? formatCurrency(totalOCs) : '—'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sección 2: Facturas Vinculadas */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Receipt className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Facturas Vinculadas</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed rounded-lg text-muted-foreground text-sm">
              No hay facturas vinculadas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Factura</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => {
                  let badgeVariant: 'default' | 'secondary' | 'outline' =
                    'outline';
                  let badgeClass = '';
                  let badgeLabel = inv.status;

                  if (inv.status === 'DRAFT') {
                    badgeVariant = 'outline';
                    badgeLabel = 'Borrador';
                  } else if (inv.status === 'PENDING_PAYMENT') {
                    badgeVariant = 'secondary';
                    badgeClass =
                      'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
                    badgeLabel = 'Pdte Pago';
                  } else if (inv.status === 'PAID') {
                    badgeVariant = 'secondary';
                    badgeClass =
                      'bg-green-100 text-green-800 hover:bg-green-100';
                    badgeLabel = 'Pagada';
                  } else if (inv.status === 'CANCELLED') {
                    badgeVariant = 'outline';
                    badgeClass = 'text-red-600 border-red-600';
                    badgeLabel = 'Anulada';
                  }

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-xs font-mono">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.supplier?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {inv.invoiceDate
                          ? new Date(inv.invoiceDate).toLocaleDateString(
                              'es-CO'
                            )
                          : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {showCosts ? formatCurrency(inv.totalAmount) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant} className={badgeClass}>
                          {badgeLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sección 3: Gastos Adicionales */}
      <ExpensesTab workOrder={workOrder} onRefresh={onRefresh} />

      {/* Dialog: Confirmar Regeneración de OC */}
      <AlertDialog
        open={!!regenerateItem}
        onOpenChange={open => {
          if (!open) setRegenerateItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar Orden de Compra</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                {cancellablePOs.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground">
                      Se cancelarán las siguientes OC en estado Borrador o En
                      Aprobación:
                    </p>
                    <ul className="mt-1 list-disc list-inside text-muted-foreground">
                      {cancellablePOs.map((po: any) => (
                        <li key={po.id} className="font-mono text-xs">
                          {po.orderNumber}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {nonCancellablePOs.length > 0 && (
                  <div className="rounded border border-yellow-200 bg-yellow-50 p-2">
                    <p className="font-medium text-yellow-800">
                      Advertencia: Las siguientes OC no se cancelarán
                      automáticamente y quedarán activas:
                    </p>
                    <ul className="mt-1 list-disc list-inside text-yellow-700">
                      {nonCancellablePOs.map((po: any) => (
                        <li key={po.id} className="font-mono text-xs">
                          {po.orderNumber} ({po.status})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p>Se creará una nueva OC con los precios actuales del ítem.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRegenerating}
              onClick={handleRegenerateOC}
            >
              {isRegenerating ? 'Procesando...' : 'Confirmar Regeneración'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
