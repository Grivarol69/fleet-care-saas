'use client';

import { useState } from 'react';
import { ShoppingCart, Receipt, Loader2 } from 'lucide-react';
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

const PO_STATUS_NO_INVOICE = new Set([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'PARTIAL',
]);

export function ComprasTab({ workOrder, currentUser, onRefresh }: any) {
  const showCosts = canViewCosts(currentUser as any);
  const { toast } = useToast();
  const [actioningId, setActioningId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Sección 1: Órdenes de Compra */}
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

                  return (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium text-xs font-mono">
                        {po.orderNumber}
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
                          <Badge variant={badgeVariant} className={badgeClass}>
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
                      <TableCell>
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
    </div>
  );
}
