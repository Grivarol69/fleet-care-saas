'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Truck,
  ExternalLink,
  Download,
  Upload
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UploadButton } from '@/lib/uploadthing';
import { useToast } from '@/components/hooks/use-toast';
import axios from 'axios';

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
    nit: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  workOrder: {
    id: number;
    title: string;
    status: string;
    vehicle: {
      id: number;
      licensePlate: string;
      brand: { name: string };
      line: { name: string };
      mileage: number;
    };
  } | null;
  items: Array<{
    id: number;
    total: number;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string | null;
    notes: string | null;
  }>;
};

type DetailsTabProps = {
  invoice: Invoice;
  onRefresh: () => void;
};

const statusConfig = {
  PENDING: { label: 'Pendiente', variant: 'secondary' as const },
  PAID: { label: 'Pagada', variant: 'default' as const },
  PARTIAL: { label: 'Pago Parcial', variant: 'outline' as const },
  OVERDUE: { label: 'Vencida', variant: 'destructive' as const },
  CANCELLED: { label: 'Cancelada', variant: 'outline' as const },
};

const workOrderStatusConfig = {
  PENDING: { label: 'Pendiente', variant: 'secondary' as const },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' as const },
  PENDING_APPROVAL: { label: 'Por Aprobar', variant: 'outline' as const },
  APPROVED: { label: 'Aprobada', variant: 'default' as const },
  REJECTED: { label: 'Rechazada', variant: 'destructive' as const },
  PENDING_INVOICE: { label: 'Pendiente Factura', variant: 'outline' as const },
  COMPLETED: { label: 'Completada', variant: 'default' as const },
  CANCELLED: { label: 'Cancelada', variant: 'outline' as const },
};

export function DetailsTab({ invoice, onRefresh }: DetailsTabProps) {
  const router = useRouter();
  const statusInfo = statusConfig[invoice.status as keyof typeof statusConfig] || {
    label: invoice.status,
    variant: 'outline' as const,
  };

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = invoice.totalAmount - totalPaid;

  return (
    <div className="space-y-6">
      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información de la Factura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Número de Factura</p>
              <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estado</p>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fecha de Factura</p>
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(new Date(invoice.invoiceDate), "dd 'de' MMMM 'de' yyyy", {
                  locale: es,
                })}
              </p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Fecha de Vencimiento</p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(invoice.dueDate), "dd 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
            )}
          </div>

          {invoice.notes && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}

          {invoice.attachmentUrl && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Archivo Adjunto</p>
              <Button variant="outline" size="sm" asChild>
                <a href={invoice.attachmentUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Factura
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proveedor */}
      {invoice.supplier && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-semibold">{invoice.supplier.name}</p>
              </div>
              {invoice.supplier.nit && (
                <div>
                  <p className="text-sm text-muted-foreground">NIT</p>
                  <p>{invoice.supplier.nit}</p>
                </div>
              )}
              {invoice.supplier.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{invoice.supplier.email}</p>
                </div>
              )}
              {invoice.supplier.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p>{invoice.supplier.phone}</p>
                </div>
              )}
              {invoice.supplier.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p>{invoice.supplier.address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orden de Trabajo Asociada */}
      {invoice.workOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Orden de Trabajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Vehículo</p>
                <p className="font-semibold">
                  {invoice.workOrder.vehicle.licensePlate} - {invoice.workOrder.vehicle.brand.name}{' '}
                  {invoice.workOrder.vehicle.line.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {invoice.workOrder.vehicle.mileage.toLocaleString('es-CO')} km
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Título</p>
                <p>{invoice.workOrder.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Estado</p>
                <Badge variant={workOrderStatusConfig[invoice.workOrder.status as keyof typeof workOrderStatusConfig]?.variant || 'outline'}>
                  {workOrderStatusConfig[invoice.workOrder.status as keyof typeof workOrderStatusConfig]?.label || invoice.workOrder.status}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/maintenance/work-orders/${invoice.workOrder?.id}`)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Orden de Trabajo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen Financiero */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumen Financiero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                ${invoice.subtotal.toLocaleString('es-CO')} {invoice.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span className="font-medium">
                ${invoice.taxAmount.toLocaleString('es-CO')} {invoice.currency}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">
                ${invoice.totalAmount.toLocaleString('es-CO')} {invoice.currency}
              </span>
            </div>

            {/* Pagos */}
            {invoice.payments.length > 0 && (
              <>
                <div className="flex justify-between pt-3 border-t text-green-600">
                  <span className="font-medium">Total Pagado</span>
                  <span className="font-semibold">
                    ${totalPaid.toLocaleString('es-CO')} {invoice.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    Saldo Pendiente
                  </span>
                  <span className={`font-semibold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    ${balance.toLocaleString('es-CO')} {invoice.currency}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Historial de Pagos */}
      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-start p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      ${payment.amount.toLocaleString('es-CO')} {invoice.currency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.paymentMethod}
                      {payment.referenceNumber && ` - Ref: ${payment.referenceNumber}`}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {format(new Date(payment.paymentDate), "dd MMM yyyy", {
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
