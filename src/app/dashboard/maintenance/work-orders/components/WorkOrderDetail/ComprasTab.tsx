import { ShoppingCart, Receipt } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import { canViewCosts } from '@/lib/permissions';
import { ExpensesTab } from './ExpensesTab';

export function ComprasTab({ workOrder, currentUser, onRefresh }: any) {
  const showCosts = canViewCosts(currentUser as any);

  const pos = workOrder.purchaseOrders || [];
  const totalOCs = pos.reduce(
    (a: number, p: any) => a + (p.totalAmount || 0),
    0
  );

  const invoices = workOrder.invoices || [];

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
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po: any) => {
                  let badgeVariant: 'default' | 'secondary' | 'outline' =
                    'outline';
                  let badgeClass = '';
                  let badgeLabel = po.status;

                  if (po.status === 'PENDING') {
                    badgeVariant = 'secondary';
                    badgeClass =
                      'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
                    badgeLabel = 'Pendiente';
                  } else if (po.status === 'SENT') {
                    badgeVariant = 'secondary';
                    badgeClass = 'bg-blue-100 text-blue-800 hover:bg-blue-100';
                    badgeLabel = 'Enviada';
                  } else if (po.status === 'RECEIVED') {
                    badgeVariant = 'secondary';
                    badgeClass =
                      'bg-green-100 text-green-800 hover:bg-green-100';
                    badgeLabel = 'Recibida';
                  } else if (po.status === 'INVOICED') {
                    badgeVariant = 'default';
                    badgeLabel = 'Facturada';
                  } else if (po.status === 'CANCELLED') {
                    badgeVariant = 'outline';
                    badgeLabel = 'Cancelada';
                  }

                  return (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium text-xs font-mono">
                        {po.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={badgeVariant} className={badgeClass}>
                            {badgeLabel}
                          </Badge>
                          {po.status !== 'INVOICED' &&
                            po.status !== 'CANCELLED' && (
                              <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">
                                Sin factura
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {showCosts ? formatCurrency(po.totalAmount) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {po.notes || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-semibold">
                    Total comprometido
                  </TableCell>
                  <TableCell colSpan={2} className="font-bold font-mono">
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
