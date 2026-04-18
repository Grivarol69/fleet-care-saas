'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Receipt,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertCircle,
  Download,
  Mail,
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
import { canViewCosts } from '@/lib/permissions';
import { useToast } from '@/components/hooks/use-toast';
import { ExpensesTab } from './ExpensesTab';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer';
import { PurchaseOrderFullPDF } from '@/app/dashboard/purchase-orders/components/PurchaseOrderFullPDF';
import { SendPODialog } from '@/app/dashboard/purchase-orders/components/SendPODialog';

const PO_INVOICE_STATUSES = new Set(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIAL', 'COMPLETED']);

export function ComprasTab({ workOrder, currentUser, onRefresh }: any) {
  const showCosts = canViewCosts(currentUser as any);
  const { toast } = useToast();
  const router = useRouter();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isGeneratingOC, setIsGeneratingOC] = useState(false);
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [downloadingPoId, setDownloadingPoId] = useState<string | null>(null);
  const [sendPoDialogState, setSendPoDialogState] = useState<{isOpen: boolean, poId: string, poNumber: string}>({isOpen: false, poId: '', poNumber: ''});

  const pendingExternalItems = (workOrder.workOrderItems || []).filter(
    (i: any) =>
      (i.itemSource === 'EXTERNAL' || i.itemSource === 'INTERNAL_PURCHASE') &&
      i.status !== 'CANCELLED' &&
      (!i.purchaseOrderItems || i.purchaseOrderItems.length === 0)
  );

  const pendingWithProvider = pendingExternalItems.filter(
    (i: any) => i.providerId
  );

  const pos = workOrder.purchaseOrders || [];
  const totalOCs = pos.reduce(
    (a: number, p: any) => a + Number(p.total || 0),
    0
  );

  const invoices = workOrder.invoices || [];

  const handleDownloadPDF = async (po: any) => {
    try {
      setDownloadingPoId(po.id);
      
      const resTenant = await fetch('/api/tenants/current');
      const tenantData = await resTenant.json();
      const tenant = {
        name: tenantData.name || 'Fleet Care',
        logo: tenantData.logo || null,
        address: tenantData.address || null,
        phone: tenantData.phone || null,
        taxId: tenantData.taxId || null,
        currency: tenantData.currency || 'COP',
      };

      const items = (po.items || []).map((item: any) => ({
        id: item.id,
        description: item.workOrderItem?.mantItem?.name 
          ? `${item.workOrderItem.mantItem.name}${item.workOrderItem.description ? `\n${item.workOrderItem.description}` : ''}`
          : item.description || 'Ítem',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalCost: Number(item.quantity) * Number(item.unitPrice),
      }));

      const doc = (
        <PurchaseOrderFullPDF
          tenant={tenant}
          purchaseOrder={{
            orderNumber: po.orderNumber,
            type: po.type,
            status: po.status,
            notes: po.notes,
            total: po.total,
            createdAt: po.createdAt,
            provider: po.provider,
            workOrder: {
              title: workOrder.title,
              vehicle: workOrder.vehicle,
            }
          }}
          items={items}
        />
      );

      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Orden_Compra_${po.orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading custom PDF', error);
      toast({
        title: 'Error',
        description: 'Hubo un problema al generar el PDF.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPoId(null);
    }
  };

  const handleGenerateAllOC = async () => {
    if (pendingWithProvider.length === 0) return;
    setIsGeneratingOC(true);
    try {
      await axios.post(
        `/api/maintenance/work-orders/${workOrder.id}/purchase-orders`,
        { itemIds: pendingWithProvider.map((i: any) => i.id) }
      );
      toast({ title: 'OC generada', description: 'Órdenes de compra creadas correctamente.' });
      onRefresh();
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar la OC', variant: 'destructive' });
    } finally {
      setIsGeneratingOC(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Banner compacto: ítems pendientes de OC */}
      {pendingExternalItems.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-orange-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">{pendingExternalItems.length}</span>{' '}
              {pendingExternalItems.length === 1 ? 'ítem externo sin OC' : 'ítems externos sin OC'}.
              {pendingWithProvider.length < pendingExternalItems.length && (
                <span className="ml-1 text-orange-600">
                  ({pendingExternalItems.length - pendingWithProvider.length} sin proveedor asignado — asignar en tab Ítems)
                </span>
              )}
            </span>
          </div>
          {pendingWithProvider.length > 0 && (
            <Button
              size="sm"
              variant="default"
              disabled={isGeneratingOC}
              onClick={handleGenerateAllOC}
              className="ml-4 shrink-0"
            >
              {isGeneratingOC && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Generar OCs ({pendingWithProvider.length})
            </Button>
          )}
        </div>
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
                    <React.Fragment key={po.id}>
                      <TableRow
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
                          <Badge
                            variant={badgeVariant}
                            className={badgeClass}
                          >
                            {badgeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {showCosts ? formatCurrency(po.total) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {po.notes || '—'}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
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
                            {PO_INVOICE_STATUSES.has(po.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-700 border-blue-300 hover:bg-blue-50"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/invoices/new?purchaseOrderId=${po.id}`
                                  )
                                }
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Registrar Factura
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={downloadingPoId === po.id}
                              onClick={() => handleDownloadPDF(po)}
                            >
                              {downloadingPoId === po.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Download className="h-3 w-3 mr-1" />
                              )}
                              Descargar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSendPoDialogState({ isOpen: true, poId: po.id, poNumber: po.orderNumber })}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                          </div>
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
                    </React.Fragment>
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

      {sendPoDialogState.isOpen && (
        <SendPODialog
          isOpen={sendPoDialogState.isOpen}
          setIsOpen={(open) => setSendPoDialogState(s => ({ ...s, isOpen: open }))}
          purchaseOrderId={sendPoDialogState.poId}
          purchaseOrderNumber={sendPoDialogState.poNumber}
        />
      )}
    </div>
  );
}
