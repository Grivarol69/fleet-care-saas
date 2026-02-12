"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Loader2,
  Search,
  Eye,
  MoreHorizontal,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  type: "SERVICES" | "PARTS";
  status: string;
  provider: { id: number; name: string };
  workOrder: {
    id: number;
    title: string;
    vehicle: {
      licensePlate: string;
      brand: { name: string } | null;
    };
  };
  subtotal: number;
  total: number;
  items: Array<{ id: string }>;
  invoices: Array<{ id: string; invoiceNumber: string; totalAmount: number }>;
  createdAt: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "Borrador", variant: "outline" },
  PENDING_APPROVAL: { label: "Pend. Aprobación", variant: "secondary" },
  APPROVED: { label: "Aprobada", variant: "default" },
  SENT: { label: "Enviada", variant: "default" },
  PARTIAL: { label: "Parcial", variant: "secondary" },
  COMPLETED: { label: "Completada", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
};

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    search: "",
  });
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    poId: string;
    action: string;
    title: string;
    description: string;
  }>({ open: false, poId: "", action: "", title: "", description: "" });

  const { data: purchaseOrders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.type) params.append("type", filters.type);

      const res = await fetch(`/api/purchase-orders?${params}`);
      if (!res.ok) throw new Error("Error al cargar");
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Éxito", description: "Orden de compra actualizada" });
      setActionDialog({ ...actionDialog, open: false });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAction = (poId: string, action: string) => {
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
      send: "La orden se marcará como enviada al proveedor.",
      cancel: "La orden será cancelada permanentemente.",
    };

    setActionDialog({
      open: true,
      poId,
      action,
      title: titles[action] || "Confirmar",
      description: descriptions[action] || "¿Está seguro?",
    });
  };

  const confirmAction = () => {
    statusMutation.mutate({ id: actionDialog.poId, action: actionDialog.action });
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

  // Filtrar por búsqueda local
  const filteredOrders = purchaseOrders?.filter((po) => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      po.orderNumber.toLowerCase().includes(search) ||
      po.provider.name.toLowerCase().includes(search) ||
      po.workOrder.title.toLowerCase().includes(search) ||
      po.workOrder.vehicle.licensePlate.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
          <p className="text-muted-foreground">
            Gestiona las órdenes de compra de mantenimiento
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, proveedor, OT o placa..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pend. Aprobación</SelectItem>
                <SelectItem value="APPROVED">Aprobada</SelectItem>
                <SelectItem value="SENT">Enviada</SelectItem>
                <SelectItem value="COMPLETED">Completada</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="SERVICES">Servicios</SelectItem>
                <SelectItem value="PARTS">Repuestos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !filteredOrders?.length ? (
            <div className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay órdenes de compra</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. OC</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>OT / Vehículo</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.orderNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {po.type === "SERVICES" ? "Servicios" : "Repuestos"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/maintenance/work-orders/${po.workOrder.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {po.workOrder.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {po.workOrder.vehicle.licensePlate}
                        {po.workOrder.vehicle.brand && ` - ${po.workOrder.vehicle.brand.name}`}
                      </div>
                    </TableCell>
                    <TableCell>{po.provider.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(po.total))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[po.status]?.variant || "outline"}>
                        {statusConfig[po.status]?.label || po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(po.createdAt), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/purchase-orders/${po.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalle
                            </Link>
                          </DropdownMenuItem>
                          {getAvailableActions(po.status).includes("submit") && (
                            <DropdownMenuItem onClick={() => handleAction(po.id, "submit")}>
                              <Send className="h-4 w-4 mr-2" />
                              Enviar a Aprobación
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes("approve") && (
                            <DropdownMenuItem onClick={() => handleAction(po.id, "approve")}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aprobar
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes("reject") && (
                            <DropdownMenuItem onClick={() => handleAction(po.id, "reject")}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Rechazar
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes("send") && (
                            <DropdownMenuItem onClick={() => handleAction(po.id, "send")}>
                              <FileText className="h-4 w-4 mr-2" />
                              Marcar Enviada
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes("cancel") && (
                            <DropdownMenuItem
                              onClick={() => handleAction(po.id, "cancel")}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
