'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Loader2,
  FileText,
  Car,
  User,
  Wrench,
  Receipt,
} from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { canViewCosts } from '@/lib/permissions';
import { WorkOrderFullPDF, type TenantInfo } from './WorkOrderFullPDF';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Planificación',
  APPROVED: 'Aprobada',
  COMPLETED: 'Completada',
  CLOSED: 'Cerrada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

const MANT_LABELS: Record<string, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  PREDICTIVE: 'Predictivo',
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CierreTab({ workOrder, currentUser, onRefresh: _onRefresh }: any) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const items = workOrder.workOrderItems || [];
  const invoices = workOrder.invoices || [];

  const services = items.filter((i: any) => i.mantItem.type !== 'PART' && i.status !== 'CANCELLED');
  const parts = items.filter((i: any) => i.mantItem.type === 'PART' && i.status !== 'CANCELLED');

  const totalServices = services.reduce((a: number, i: any) => a + Number(i.totalCost || 0), 0);
  const totalParts = parts.reduce((a: number, i: any) => a + Number(i.totalCost || 0), 0);
  const totalExpenses = (workOrder.workOrderExpenses || []).reduce(
    (a: number, e: any) => a + Number(e.amount || 0),
    0
  );
  const grandTotal = totalServices + totalParts + totalExpenses;
  const estimated = Number(workOrder.estimatedCost || 0);
  const variation = estimated > 0 ? ((grandTotal - estimated) / estimated) * 100 : null;

  const currency: string = 'COP'; // will be replaced with tenant currency from PDF fetch

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      let tenant: TenantInfo;
      try {
        const res = await fetch('/api/tenants/current');
        if (!res.ok) throw new Error('no tenant');
        tenant = await res.json();
      } catch {
        tenant = { name: 'Mi Empresa', logo: null, address: null, phone: null, taxId: null, currency: 'COP' };
      }

      const blob = await pdf(
        <WorkOrderFullPDF
          tenant={tenant}
          workOrder={{
            id: workOrder.id,
            title: workOrder.title,
            description: workOrder.description ?? null,
            notes: workOrder.notes ?? null,
            status: workOrder.status,
            priority: workOrder.priority,
            mantType: workOrder.mantType,
            createdAt: workOrder.createdAt,
            startDate: workOrder.startDate ?? null,
            endDate: workOrder.endDate ?? null,
            creationMileage: workOrder.creationMileage,
            completionMileage: workOrder.completionMileage ?? null,
            estimatedCost: workOrder.estimatedCost ?? null,
            actualCost: workOrder.actualCost ?? null,
            vehicle: workOrder.vehicle,
            technician: workOrder.technician ?? null,
            provider: workOrder.provider ?? null,
            costCenterRef: workOrder.costCenterRef ?? null,
          }}
          items={items
            .filter((i: any) => i.status !== 'CANCELLED')
            .map((i: any) => ({
              id: i.id,
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              totalCost: Number(i.totalCost),
              provider: i.provider ?? null,
              itemSource: i.itemSource ?? null,
              mantItem: i.mantItem,
            }))}
          invoices={invoices.map((inv: any) => ({
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            totalAmount: Number(inv.totalAmount),
            supplier: inv.supplier ?? null,
          }))}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OT-${workOrder.title.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'PDF descargado' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al generar PDF', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + download button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Resumen de la Orden de Trabajo
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vista completa del trabajo realizado, costos y documentos vinculados
          </p>
        </div>
        <Button onClick={handleDownloadPDF} disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isGenerating ? 'Generando...' : 'Descargar PDF'}
        </Button>
      </div>

      {/* General info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            Información General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Vehículo</p>
              <p className="font-medium">
                {workOrder.vehicle?.licensePlate} —{' '}
                {workOrder.vehicle?.brand?.name} {workOrder.vehicle?.line?.name}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Técnico</p>
              <p className="font-medium">{workOrder.technician?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Estado</p>
              <p className="font-medium">{STATUS_LABELS[workOrder.status] ?? workOrder.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Tipo</p>
              <p className="font-medium">{MANT_LABELS[workOrder.mantType] ?? workOrder.mantType}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Fecha inicio</p>
              <p className="font-medium">{fmtDate(workOrder.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Fecha cierre</p>
              <p className="font-medium">{fmtDate(workOrder.endDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Km ingreso</p>
              <p className="font-medium">{workOrder.creationMileage?.toLocaleString() ?? '—'} km</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Km egreso</p>
              <p className="font-medium">
                {workOrder.completionMileage != null
                  ? `${workOrder.completionMileage.toLocaleString()} km`
                  : '—'}
              </p>
            </div>
            {workOrder.costCenterRef && (
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-0.5">Centro de costos</p>
                <p className="font-medium">{workOrder.costCenterRef.name}</p>
              </div>
            )}
          </div>

          {(workOrder.description || workOrder.notes) && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Observaciones</p>
                <p className="text-sm whitespace-pre-wrap">
                  {workOrder.description || workOrder.notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Services */}
      {services.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Servicios / Mano de Obra
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right w-16">Cant.</TableHead>
                  {canViewCosts(currentUser) && (
                    <>
                      <TableHead className="text-right w-28">P. Unit.</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.mantItem.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.provider?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    {canViewCosts(currentUser) && (
                      <>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(Number(item.unitPrice), currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(Number(item.totalCost), currency)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {canViewCosts(currentUser) && totalServices > 0 && (
              <div className="px-4 py-2 flex justify-end text-sm">
                <span className="text-muted-foreground mr-4">Subtotal servicios</span>
                <span className="font-semibold font-mono">{formatCurrency(totalServices, currency)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parts */}
      {parts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Repuestos / Materiales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repuesto</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right w-16">Cant.</TableHead>
                  {canViewCosts(currentUser) && (
                    <>
                      <TableHead className="text-right w-28">P. Unit.</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.mantItem.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.provider?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    {canViewCosts(currentUser) && (
                      <>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(Number(item.unitPrice), currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(Number(item.totalCost), currency)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {canViewCosts(currentUser) && totalParts > 0 && (
              <div className="px-4 py-2 flex justify-end text-sm">
                <span className="text-muted-foreground mr-4">Subtotal repuestos</span>
                <span className="font-semibold font-mono">{formatCurrency(totalParts, currency)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Financial totals */}
      {canViewCosts(currentUser) && grandTotal > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              {totalServices > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servicios</span>
                  <span className="font-mono">{formatCurrency(totalServices, currency)}</span>
                </div>
              )}
              {totalParts > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repuestos</span>
                  <span className="font-mono">{formatCurrency(totalParts, currency)}</span>
                </div>
              )}
              {totalExpenses > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gastos adicionales</span>
                  <span className="font-mono">{formatCurrency(totalExpenses, currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(grandTotal, currency)}</span>
              </div>
              {variation !== null && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Estimado: {formatCurrency(estimated, currency)}</span>
                  <span className={Math.abs(variation) > 15 ? 'text-destructive font-semibold' : ''}>
                    Variación: {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Facturas Vinculadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Factura</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  {canViewCosts(currentUser) && (
                    <TableHead className="text-right">Monto</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.supplier?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(inv.invoiceDate)}
                    </TableCell>
                    {canViewCosts(currentUser) && (
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(inv.totalAmount), currency)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
