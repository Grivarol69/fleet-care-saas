"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  Building2,
  Truck,
  Calendar,
  Receipt,
} from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  receivedQty: number;
  mantItem?: { name: string; type: string } | null;
  masterPart?: { code: string; description: string } | null;
  workOrderItem?: { id: number; description: string } | null;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  type: "SERVICES" | "PARTS";
  status: string;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
  workOrder: {
    id: number;
    title: string;
    status: string;
    vehicle: {
      id: number;
      licensePlate: string;
      brand: { name: string } | null;
      line: { name: string } | null;
    };
  };
  items: PurchaseOrderItem[];
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
  }>;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "Borrador", variant: "outline" },
  PENDING_APPROVAL: { label: "Pendiente Aprobación", variant: "secondary" },
  APPROVED: { label: "Aprobada", variant: "default" },
  SENT: { label: "Enviada", variant: "default" },
  PARTIAL: { label: "Parcialmente Facturada", variant: "secondary" },
  COMPLETED: { label: "Completada", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
};

const itemStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const poId = params.id as string;

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
  }>({ open: false, action: "", title: "", description: "" });

  const { data: purchaseOrder, isLoading, error } = useQuery<PurchaseOrder>({
    queryKey: ["purchase-order", poId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cargar");
      }
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", poId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Éxito", description: "Orden de compra actualizada" });
      setActionDialog({ ...actionDialog, open: false });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleAction = (action: string) => {
    const titles: Record<string, string> = {
      submit: "Enviar a Aprobación",
      approve: "Aprobar Orden",
      reject: "Rechazar Orden",
      send: "Marcar como Enviada",
      cancel: "Cancelar Orden",
    };

    const descriptions: Record<string, string> = {
      submit: "La orden será enviada para aprobación de un supervisor.",
      approve: "La orden quedará aprobada y lista para enviar al proveedor.",
      reject: "La orden volverá a estado borrador para corrección.",
      send: "La orden se marcará como enviada al proveedor. Podrá ser facturada.",
      cancel: "La orden será cancelada permanentemente.",
    };

    setActionDialog({
      open: true,
      action,
      title: titles[action] || "Confirmar",
      description: descriptions[action] || "¿Está seguro?",
    });
  };

  const confirmAction = () => {
    statusMutation.mutate({ action: actionDialog.action });
  };

  const getAvailableActions = (status: string) => {
    const actions: Record<string, string[]> = {
      DRAFT: ["submit", "cancel"],
      PENDING_APPROVAL: ["approve", "reject"],
      APPROVED: ["send", "cancel"],
      SENT: [],
      PARTIAL: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    return actions[status] || [];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {error instanceof Error ? error.message : "Orden de compra no encontrada"}
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/purchase-orders")}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const availableActions = getAvailableActions(purchaseOrder.status);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/purchase-orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{purchaseOrder.orderNumber}</h1>
              <Badge variant={statusConfig[purchaseOrder.status]?.variant || "outline"}>
                {statusConfig[purchaseOrder.status]?.label || purchaseOrder.status}
              </Badge>
              <Badge variant="outline">
                {purchaseOrder.type === "SERVICES" ? "Servicios" : "Repuestos"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Creada el {format(new Date(purchaseOrder.createdAt), "PPP", { locale: es })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {availableActions.length > 0 && (
          <div className="flex gap-2">
            {availableActions.includes("submit") && (
              <Button onClick={() => handleAction("submit")}>
                <Send className="h-4 w-4 mr-2" />
                Enviar a Aprobación
              </Button>
            )}
            {availableActions.includes("approve") && (
              <Button onClick={() => handleAction("approve")}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            )}
            {availableActions.includes("reject") && (
              <Button variant="outline" onClick={() => handleAction("reject")}>
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
            )}
            {availableActions.includes("send") && (
              <Button onClick={() => handleAction("send")}>
                <FileText className="h-4 w-4 mr-2" />
                Marcar Enviada
              </Button>
            )}
            {availableActions.includes("cancel") && (
              <Button variant="destructive" onClick={() => handleAction("cancel")}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Proveedor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{purchaseOrder.provider.name}</p>
            {purchaseOrder.provider.email && (
              <p className="text-sm text-muted-foreground">{purchaseOrder.provider.email}</p>
            )}
            {purchaseOrder.provider.phone && (
              <p className="text-sm text-muted-foreground">{purchaseOrder.provider.phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Orden de Trabajo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Orden de Trabajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/dashboard/maintenance/work-orders/${purchaseOrder.workOrder.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {purchaseOrder.workOrder.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              {purchaseOrder.workOrder.vehicle.licensePlate}
              {purchaseOrder.workOrder.vehicle.brand &&
                ` - ${purchaseOrder.workOrder.vehicle.brand.name}`}
              {purchaseOrder.workOrder.vehicle.line &&
                ` ${purchaseOrder.workOrder.vehicle.line.name}`}
            </p>
          </CardContent>
        </Card>

        {/* Fechas y Aprobación */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Historial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {purchaseOrder.approvedAt && (
              <p>
                <span className="text-muted-foreground">Aprobada:</span>{" "}
                {format(new Date(purchaseOrder.approvedAt), "Pp", { locale: es })}
              </p>
            )}
            {purchaseOrder.sentAt && (
              <p>
                <span className="text-muted-foreground">Enviada:</span>{" "}
                {format(new Date(purchaseOrder.sentAt), "Pp", { locale: es })}
              </p>
            )}
            {!purchaseOrder.approvedAt && !purchaseOrder.sentAt && (
              <p className="text-muted-foreground">Sin eventos de aprobación</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items ({purchaseOrder.items.length})</CardTitle>
          <CardDescription>Detalle de servicios o repuestos solicitados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">P. Unitario</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrder.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.masterPart?.code || item.mantItem?.name || "-"}
                  </TableCell>
                  <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.total))}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {itemStatusLabels[item.status] || item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totales */}
          <div className="flex justify-end mt-6 pt-4 border-t">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(purchaseOrder.subtotal))}</span>
              </div>
              {Number(purchaseOrder.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    IVA ({Number(purchaseOrder.taxRate)}%)
                  </span>
                  <span>{formatCurrency(Number(purchaseOrder.taxAmount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(Number(purchaseOrder.total))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facturas Vinculadas */}
      {purchaseOrder.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Facturas Vinculadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>
                      {format(new Date(inv.invoiceDate), "PP", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(inv.totalAmount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notas */}
      {purchaseOrder.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {purchaseOrder.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <AlertDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{actionDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={statusMutation.isPending}>
              {statusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
