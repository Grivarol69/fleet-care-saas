'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  status: string;
  currency: string;
  notes: string | null;
  supplier: {
    id: string;
    name: string;
    nit: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  workOrder: {
    id: string;
    title: string;
    vehicle: {
      licensePlate: string;
      brand: { name: string };
      line: { name: string };
    };
  } | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  }>;
};

export default function InvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const invoiceId = params.id as string;

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/invoices/${invoiceId}`);
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Factura no encontrada</p>
      </div>
    );
  }

  return (
    <>
      {/* Botones de acción (no se imprimen) */}
      <div className="print:hidden p-4 flex gap-2 border-b bg-background sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button variant="default" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Contenido imprimible */}
      <div className="max-w-4xl mx-auto p-8 bg-white print:p-0">
        {/* Header */}
        <div className="mb-8 border-b pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">FACTURA</h1>
              <p className="text-xl font-semibold">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Fecha de emisión</p>
              <p className="font-semibold">
                {format(
                  new Date(invoice.invoiceDate),
                  "dd 'de' MMMM 'de' yyyy",
                  {
                    locale: es,
                  }
                )}
              </p>
              {invoice.dueDate && (
                <>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vencimiento
                  </p>
                  <p className="font-semibold">
                    {format(
                      new Date(invoice.dueDate),
                      "dd 'de' MMMM 'de' yyyy",
                      {
                        locale: es,
                      }
                    )}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Información de Proveedor y Cliente */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Proveedor */}
          {invoice.supplier && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                PROVEEDOR
              </h3>
              <div className="space-y-1">
                <p className="font-bold">{invoice.supplier.name}</p>
                {invoice.supplier.nit && (
                  <p className="text-sm">NIT: {invoice.supplier.nit}</p>
                )}
                {invoice.supplier.address && (
                  <p className="text-sm">{invoice.supplier.address}</p>
                )}
                {invoice.supplier.phone && (
                  <p className="text-sm">Tel: {invoice.supplier.phone}</p>
                )}
                {invoice.supplier.email && (
                  <p className="text-sm">{invoice.supplier.email}</p>
                )}
              </div>
            </div>
          )}

          {/* Orden de Trabajo */}
          {invoice.workOrder && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                ORDEN DE TRABAJO
              </h3>
              <div className="space-y-1">
                <p className="font-bold">
                  {invoice.workOrder.vehicle.licensePlate}
                </p>
                <p className="text-sm">
                  {invoice.workOrder.vehicle.brand.name}{' '}
                  {invoice.workOrder.vehicle.line.name}
                </p>
                <p className="text-sm">{invoice.workOrder.title}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de Items */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-2 text-sm font-semibold">#</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">
                  Descripción
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold">
                  Cant.
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold">
                  Precio Unit.
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold">
                  Subtotal
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold">
                  IVA
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-3 px-2 text-sm">{index + 1}</td>
                  <td className="py-3 px-2">
                    <p className="font-medium text-sm">{item.description}</p>
                  </td>
                  <td className="py-3 px-2 text-right text-sm">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-2 text-right text-sm">
                    ${item.unitPrice.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 px-2 text-right text-sm">
                    ${item.subtotal.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 px-2 text-right text-sm">
                    ${item.taxAmount.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 px-2 text-right font-semibold text-sm">
                    ${item.total.toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Subtotal:</span>
              <span className="font-semibold">
                ${invoice.subtotal.toLocaleString('es-CO')} {invoice.currency}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">IVA:</span>
              <span className="font-semibold">
                ${invoice.taxAmount.toLocaleString('es-CO')} {invoice.currency}
              </span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-gray-300">
              <span className="font-bold text-lg">TOTAL:</span>
              <span className="font-bold text-xl">
                ${invoice.totalAmount.toLocaleString('es-CO')}{' '}
                {invoice.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Notas */}
        {invoice.notes && (
          <div className="border-t pt-6">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
              NOTAS
            </h3>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground border-t pt-4">
          <p>Fleet Care SaaS - Sistema de Gestión de Mantenimiento</p>
          <p className="mt-1">
            Documento generado el{' '}
            {format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", {
              locale: es,
            })}
          </p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            margin: 1cm;
            size: letter;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
