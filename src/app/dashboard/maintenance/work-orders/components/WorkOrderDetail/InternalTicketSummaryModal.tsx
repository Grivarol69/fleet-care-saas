'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Printer, Wrench, Package, Clock } from 'lucide-react';
import { Prisma } from '@prisma/client';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TicketWithIncludes = Prisma.InternalWorkTicketGetPayload<{
  include: {
    technician: { select: { id: true; name: true; specialty: true } };
    laborEntries: {
      select: {
        id: true;
        description: true;
        hours: true;
        hourlyRate: true;
        laborCost: true;
      };
    };
    partEntries: {
      include: {
        inventoryItem: {
          include: {
            masterPart: { select: { id: true; code: true; description: true } };
          };
        };
      };
    };
    workOrder: {
      select: {
        id: true;
        title: true;
        vehicle: { select: { licensePlate: true; mileage: true } };
      };
    };
  };
}>;

interface Props {
  open: boolean;
  onClose: () => void;
  ticket: TicketWithIncludes | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number | Prisma.Decimal | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}

function statusLabel(status: string) {
  const map: Record<
    string,
    {
      label: string;
      variant: 'default' | 'secondary' | 'outline' | 'destructive';
    }
  > = {
    DRAFT: { label: 'Borrador', variant: 'secondary' },
    SUBMITTED: { label: 'Enviado', variant: 'default' },
    APPROVED: { label: 'Aprobado', variant: 'default' },
    REJECTED: { label: 'Rechazado', variant: 'destructive' },
    CANCELLED: { label: 'Cancelado', variant: 'outline' },
  };
  return map[status] ?? { label: status, variant: 'secondary' as const };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function InternalTicketSummaryModal({ open, onClose, ticket }: Props) {
  if (!ticket) return null;

  const { label, variant } = statusLabel(ticket.status);

  const totalLabor = Number(ticket.totalLaborCost);
  const totalParts = Number(ticket.totalPartsCost);
  const grandTotal = Number(ticket.totalCost);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none print:border-none">
        {/* ── Header ── */}
        <DialogHeader className="print:mb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Ticket Interno {ticket.ticketNumber}
            </DialogTitle>
            <div className="flex items-center gap-2 print:hidden">
              <Badge variant={variant}>{label}</Badge>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Info general ── */}
        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
          <div>
            <span className="text-muted-foreground">Vehículo</span>
            <p className="font-semibold">
              {ticket.workOrder?.vehicle?.licensePlate ?? '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">OT #</span>
            <p className="font-semibold">{ticket.workOrder?.id ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Fecha</span>
            <p className="font-semibold">
              {new Date(ticket.ticketDate).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Técnico</span>
            <p className="font-semibold">
              {ticket.technician?.name ?? '—'}
              {ticket.technician?.specialty && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({ticket.technician.specialty})
                </span>
              )}
            </p>
          </div>
          {ticket.description && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Descripción</span>
              <p className="font-medium">{ticket.description}</p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* ── Trabajo realizado ── */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4 text-blue-600" />
            Trabajo realizado
            <Badge variant="secondary" className="ml-auto">
              <Clock className="h-3 w-3 mr-1" />
              {Number(ticket.totalLaborHours).toFixed(1)} hs
            </Badge>
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-1 font-medium">Descripción</th>
                <th className="text-right py-1 font-medium w-16">Hs</th>
                <th className="text-right py-1 font-medium w-28">Tarifa/h</th>
                <th className="text-right py-1 font-medium w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {ticket.laborEntries.map(entry => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="py-1.5">{entry.description}</td>
                  <td className="text-right py-1.5">
                    {Number(entry.hours).toFixed(1)}
                  </td>
                  <td className="text-right py-1.5">
                    {formatCurrency(entry.hourlyRate)}
                  </td>
                  <td className="text-right py-1.5 font-medium">
                    {formatCurrency(entry.laborCost)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={3}
                  className="text-right pt-2 text-muted-foreground text-xs"
                >
                  Total mano de obra
                </td>
                <td className="text-right pt-2 font-semibold">
                  {formatCurrency(totalLabor)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Repuestos consumidos ── */}
        {ticket.partEntries.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-orange-600" />
                Repuestos consumidos
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1 font-medium">Código</th>
                    <th className="text-left py-1 font-medium">Descripción</th>
                    <th className="text-right py-1 font-medium w-16">Cant</th>
                    <th className="text-right py-1 font-medium w-28">
                      Costo unit
                    </th>
                    <th className="text-right py-1 font-medium w-28">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ticket.partEntries.map(entry => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-1.5 font-mono text-xs">
                        {entry.inventoryItem.masterPart?.code ?? '—'}
                      </td>
                      <td className="py-1.5">
                        {entry.inventoryItem.masterPart?.description ?? '—'}
                      </td>
                      <td className="text-right py-1.5">
                        {Number(entry.quantity).toFixed(2)}
                      </td>
                      <td className="text-right py-1.5">
                        {formatCurrency(entry.unitCost)}
                      </td>
                      <td className="text-right py-1.5 font-medium">
                        {formatCurrency(entry.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={4}
                      className="text-right pt-2 text-muted-foreground text-xs"
                    >
                      Total repuestos
                    </td>
                    <td className="text-right pt-2 font-semibold">
                      {formatCurrency(totalParts)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {/* ── Gran total ── */}
        <Separator className="my-4" />
        <div className="flex justify-end">
          <div className="text-right space-y-1">
            {totalParts > 0 && (
              <>
                <div className="flex justify-between gap-8 text-sm text-muted-foreground">
                  <span>Mano de obra</span>
                  <span>{formatCurrency(totalLabor)}</span>
                </div>
                <div className="flex justify-between gap-8 text-sm text-muted-foreground">
                  <span>Repuestos</span>
                  <span>{formatCurrency(totalParts)}</span>
                </div>
                <Separator className="my-1" />
              </>
            )}
            <div className="flex justify-between gap-8 text-base font-bold">
              <span>TOTAL</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Aprobación ── */}
        {ticket.approvedBy && ticket.approvedAt && (
          <>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground text-center">
              Aprobado por {ticket.approvedBy} el{' '}
              {new Date(ticket.approvedAt).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </>
        )}

        {/* ── Estado print-only badge ── */}
        <div className="hidden print:block mt-4 text-center">
          <span className="text-sm font-medium">Estado: {label}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
