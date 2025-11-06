'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type WorkOrder = {
  workOrderExpenses: Array<{
    id: number;
    description: string;
    amount: number;
    expenseDate: string;
    category: string;
    notes: string | null;
  }>;
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
    supplier: {
      id: number;
      name: string;
    } | null;
  }>;
};

type ExpensesTabProps = {
  workOrder: WorkOrder;
  onRefresh: () => void;
};

const expenseCategoryConfig: Record<string, string> = {
  PARTS: 'Repuestos',
  LABOR: 'Mano de Obra',
  TRANSPORT: 'Transporte',
  TOOLS: 'Herramientas',
  OTHER: 'Otros',
};

export function ExpensesTab({ workOrder }: ExpensesTabProps) {
  const totalExpenses = workOrder.workOrderExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );

  const totalInvoices = workOrder.invoices.reduce(
    (sum, inv) => sum + inv.totalAmount,
    0
  );

  const grandTotal = totalExpenses + totalInvoices;

  return (
    <div className="space-y-6">
      {/* Resumen de Gastos */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos Registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totalExpenses.toLocaleString('es-CO')}
            </p>
            <p className="text-sm text-muted-foreground">
              {workOrder.workOrderExpenses.length} gastos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Facturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totalInvoices.toLocaleString('es-CO')}
            </p>
            <p className="text-sm text-muted-foreground">
              {workOrder.invoices.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${grandTotal.toLocaleString('es-CO')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gastos Detallados */}
      {workOrder.workOrderExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gastos Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrder.workOrderExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      {expenseCategoryConfig[expense.category] ||
                        expense.category}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(expense.expenseDate), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${expense.amount.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {expense.notes || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Facturas */}
      {workOrder.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Facturas Vinculadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Factura</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrder.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {invoice.supplier?.name || (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoiceDate).toLocaleDateString(
                        'es-CO'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${invoice.totalAmount.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell>{invoice.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {workOrder.workOrderExpenses.length === 0 &&
        workOrder.invoices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay gastos ni facturas registradas en esta orden de trabajo
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
