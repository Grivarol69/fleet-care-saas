"use client";

import useSWR from "swr";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { RecentInvoice } from "@/app/api/invoices/recent/route";

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

// Mapeo de estados a variantes de Badge
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "secondary",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

// Labels en español
const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  PAID: "Pagada",
  OVERDUE: "Vencida",
  CANCELLED: "Cancelada",
};

// Componente de Loading
function LoadingSkeleton() {
  return (
    <div className="h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-sm text-muted-foreground">Cargando facturas...</p>
      </div>
    </div>
  );
}

// Componente de Error
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div>
          <h3 className="font-semibold text-lg">Error al cargar facturas</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No se pudieron cargar las facturas recientes
          </p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          Reintentar
        </Button>
      </div>
    </div>
  );
}

// Componente de Estado Vacío
function EmptyState() {
  return (
    <div className="h-[400px] flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No hay facturas registradas</p>
        <p className="text-sm mt-1">Las facturas aparecerán aquí cuando las registres</p>
      </div>
    </div>
  );
}

export function RecentInvoicesTable() {
  const { data, error, isLoading, mutate } = useSWR<RecentInvoice[]>(
    "/api/invoices/recent",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const hasInvoices = data && data.length > 0;

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Facturas Recientes
        </CardTitle>
        <p className="text-purple-100 text-sm">
          Últimas 10 facturas registradas en el sistema
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => mutate()} />}
        {!isLoading && !error && !hasInvoices && <EmptyState />}
        {!isLoading && !error && hasInvoices && (
          <Table>
            <TableHeader>
              <TableRow className="bg-purple-50">
                <TableHead># Factura</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="hover:bg-purple-50/50 transition-colors"
                >
                  {/* Número de Factura */}
                  <TableCell className="font-mono font-semibold">
                    {invoice.invoiceNumber}
                  </TableCell>

                  {/* Proveedor */}
                  <TableCell>
                    {invoice.supplier?.name || (
                      <span className="text-muted-foreground italic">
                        Sin proveedor
                      </span>
                    )}
                  </TableCell>

                  {/* Vehículo */}
                  <TableCell>
                    {invoice.workOrder?.vehicle ? (
                      <span className="font-mono font-bold">
                        {invoice.workOrder.vehicle.licensePlate}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">N/A</span>
                    )}
                  </TableCell>

                  {/* Fecha */}
                  <TableCell>
                    {new Date(invoice.invoiceDate).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>

                  {/* Monto */}
                  <TableCell className="text-right font-semibold">
                    ${invoice.totalAmount.toLocaleString()}
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="text-center">
                    <Badge variant={statusVariants[invoice.status]}>
                      {statusLabels[invoice.status] || invoice.status}
                    </Badge>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-center">
                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
