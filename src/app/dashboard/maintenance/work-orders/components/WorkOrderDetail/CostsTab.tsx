'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CostSummaryCard } from './CostSummaryCard';
import { ExpensesTab } from './ExpensesTab';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Receipt } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CostsTabProps = {
  workOrder: any;
  currentUser: any;
  onRefresh: () => void;
};

export function CostsTab({ workOrder, currentUser, onRefresh }: CostsTabProps) {
  const purchaseOrders = workOrder.purchaseOrders || [];

  return (
    <div className="space-y-6">
      {/* 1. RESUMEN DE COSTOS */}
      <CostSummaryCard workOrder={workOrder} currentUser={currentUser} />

      {/* 2. ÓRDENES DE COMPRA */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
          </div>
          <CardTitle className="text-lg">Órdenes de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
              No hay órdenes de compra asociadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° OC</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((oc: any) => (
                  <TableRow key={oc.id}>
                    <TableCell className="font-medium">
                      {oc.orderNumber}
                    </TableCell>
                    <TableCell>{oc.provider?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(oc.createdAt).toLocaleDateString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{oc.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(oc.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 3. GASTOS VARIOS */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Receipt className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">
            Gastos y Comprobantes
          </h3>
        </div>
        <ExpensesTab workOrder={workOrder} onRefresh={onRefresh} />
      </div>
    </div>
  );
}
