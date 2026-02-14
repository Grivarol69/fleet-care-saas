'use client';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, FileText, Printer, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

type Invoice = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  status: string;
  currency: string;
  notes: string | null;
  attachmentUrl: string | null;
  supplier: {
    id: number;
    name: string;
  } | null;
  workOrder: {
    id: number;
    title: string;
    vehicle: {
      licensePlate: string;
    };
  } | null;
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    paymentDate: string;
  }>;
};

type InvoicesListProps = {
  invoices: Invoice[];
  isLoading: boolean;
  onViewDetail?: (id: number) => void;
};

const statusConfig = {
  PENDING: { label: 'Pendiente', variant: 'secondary' as const },
  PAID: { label: 'Pagada', variant: 'default' as const },
  PARTIAL: { label: 'Pago Parcial', variant: 'outline' as const },
  OVERDUE: { label: 'Vencida', variant: 'destructive' as const },
  CANCELLED: { label: 'Cancelada', variant: 'outline' as const },
};

export function InvoicesList({
  invoices,
  isLoading,
  onViewDetail,
}: InvoicesListProps) {
  const router = useRouter();

  const handlePrint = (id: number) => {
    router.push(`/dashboard/invoices/${id}/print`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">
          No hay facturas registradas
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Crea facturas desde las órdenes de trabajo completadas
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Orden de Trabajo</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="text-right">IVA</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map(invoice => {
            const statusInfo = statusConfig[
              invoice.status as keyof typeof statusConfig
            ] || {
              label: invoice.status,
              variant: 'outline' as const,
            };

            const totalPaid = invoice.payments.reduce(
              (sum, p) => sum + p.amount,
              0
            );
            const balance = invoice.totalAmount - totalPaid;

            return (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{invoice.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {invoice.items.length} items
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {invoice.supplier ? (
                    <div className="font-medium">{invoice.supplier.name}</div>
                  ) : (
                    <span className="text-muted-foreground">Sin proveedor</span>
                  )}
                </TableCell>
                <TableCell>
                  {invoice.workOrder ? (
                    <div>
                      <div className="font-medium text-sm">
                        {invoice.workOrder.vehicle.licensePlate}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {invoice.workOrder.title}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Sin WO
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(invoice.invoiceDate), 'dd MMM yyyy', {
                      locale: es,
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(invoice.invoiceDate), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  {invoice.dueDate ? (
                    <div className="text-sm">
                      {format(new Date(invoice.dueDate), 'dd MMM yyyy', {
                        locale: es,
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  {balance > 0 && invoice.status === 'PARTIAL' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Saldo: ${balance.toLocaleString('es-CO')}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  ${invoice.subtotal.toLocaleString('es-CO')}
                </TableCell>
                <TableCell className="text-right">
                  ${invoice.taxAmount.toLocaleString('es-CO')}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${invoice.totalAmount.toLocaleString('es-CO')}
                  <div className="text-xs text-muted-foreground font-normal">
                    {invoice.currency}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onViewDetail?.(invoice.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </DropdownMenuItem>
                      {invoice.attachmentUrl && (
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(invoice.attachmentUrl!, '_blank')
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Ver Factura
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handlePrint(invoice.id)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
