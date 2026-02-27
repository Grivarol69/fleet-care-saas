'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface PurchaseOrdersTabProps {
  workOrderId: string;
}

interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  mantItem?: { name: string } | null;
  masterPart?: { code: string; description: string } | null;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  type: 'SERVICES' | 'PARTS';
  status: string;
  provider: { id: string; name: string; email?: string | null };
  subtotal: number;
  total: number;
  items: PurchaseOrderItem[];
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  }>;
  createdAt: string;
  approvedAt?: string;
  sentAt?: string;
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  DRAFT: { label: 'Borrador', variant: 'outline' },
  PENDING_APPROVAL: { label: 'Pend. Aprobación', variant: 'secondary' },
  APPROVED: { label: 'Aprobada', variant: 'default' },
  SENT: { label: 'Enviada', variant: 'default' },
  PARTIAL: { label: 'Parcial', variant: 'secondary' },
  COMPLETED: { label: 'Completada', variant: 'default' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  SERVICES: { label: 'Servicios', color: 'bg-blue-100 text-blue-800' },
  PARTS: { label: 'Repuestos', color: 'bg-green-100 text-green-800' },
};

export function PurchaseOrdersTab({ workOrderId }: PurchaseOrdersTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    poId: string;
    action: string;
    title: string;
    description: string;
  }>({ open: false, poId: '', action: '', title: '', description: '' });

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', workOrderId],
    queryFn: async () => {
      const res = await fetch(
        `/api/purchase-orders?workOrderId=${workOrderId}`
      );
      if (!res.ok) throw new Error('Error al cargar órdenes de compra');
      return res.json();
    },
  });

  // Mutation para cambiar estado
  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al actualizar');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders', workOrderId],
      });
      if (variables.action === 'send') {
        const po = purchaseOrders?.find(p => p.id === variables.id);
        toast({
          title: 'OC enviada',
          description: `Orden enviada por email a ${po?.provider.email || 'el proveedor'}`,
        });
      } else {
        toast({ title: 'Éxito', description: 'Orden de compra actualizada' });
      }
      setActionDialog({ ...actionDialog, open: false });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAction = (poId: string, action: string) => {
    const titles: Record<string, string> = {
      submit: 'Enviar a Aprobación',
      approve: 'Aprobar Orden',
      reject: 'Rechazar Orden',
      send: 'Enviar al Proveedor por Email',
      cancel: 'Cancelar Orden',
    };

    // Para "send", buscar el email del proveedor de la OC
    let sendDescription =
      'La orden se enviará por email al proveedor con el PDF adjunto.';
    if (action === 'send') {
      const po = purchaseOrders?.find(p => p.id === poId);
      if (po?.provider.email) {
        sendDescription = `Se enviará la orden de compra por email a ${po.provider.name} (${po.provider.email}) con el PDF adjunto.`;
      } else {
        toast({
          title: 'Proveedor sin email',
          description:
            'El proveedor no tiene email configurado. Actualice los datos del proveedor antes de enviar la OC.',
          variant: 'destructive',
        });
        return;
      }
    }

    const descriptions: Record<string, string> = {
      submit: 'La orden será enviada para aprobación de un supervisor.',
      approve: 'La orden quedará aprobada y lista para enviar al proveedor.',
      reject: 'La orden volverá a estado borrador para corrección.',
      send: sendDescription,
      cancel: 'La orden será cancelada permanentemente.',
    };

    setActionDialog({
      open: true,
      poId,
      action,
      title: titles[action] || 'Confirmar',
      description: descriptions[action] || '¿Está seguro?',
    });
  };

  const confirmAction = () => {
    statusMutation.mutate({
      id: actionDialog.poId,
      action: actionDialog.action,
    });
  };

  const getAvailableActions = (status: string) => {
    const actions: Record<string, string[]> = {
      DRAFT: ['submit', 'cancel'],
      PENDING_APPROVAL: ['approve', 'reject'],
      APPROVED: ['send', 'cancel'],
      SENT: [],
      PARTIAL: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    return actions[status] || [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Órdenes de Compra</h3>
        {/* TODO: Botón para crear nueva OC - Fase futura */}
      </div>

      {!purchaseOrders?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay órdenes de compra para esta OT
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Las órdenes de compra se crean al asignar items externos a
              proveedores
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchaseOrders.map(po => (
            <Card key={po.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {po.orderNumber}
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${typeConfig[po.type]?.color || 'bg-gray-100'}`}
                      >
                        {typeConfig[po.type]?.label || po.type}
                      </span>
                    </CardTitle>
                    <CardDescription>{po.provider.name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusConfig[po.status]?.variant || 'outline'}
                    >
                      {statusConfig[po.status]?.label || po.status}
                    </Badge>
                    {getAvailableActions(po.status).length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {getAvailableActions(po.status).includes(
                            'submit'
                          ) && (
                            <DropdownMenuItem
                              onClick={() => handleAction(po.id, 'submit')}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar a Aprobación
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes(
                            'approve'
                          ) && (
                            <DropdownMenuItem
                              onClick={() => handleAction(po.id, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aprobar
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes(
                            'reject'
                          ) && (
                            <DropdownMenuItem
                              onClick={() => handleAction(po.id, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rechazar
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes('send') && (
                            <DropdownMenuItem
                              onClick={() => handleAction(po.id, 'send')}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar al Proveedor
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes(
                            'cancel'
                          ) && (
                            <DropdownMenuItem
                              onClick={() => handleAction(po.id, 'cancel')}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">N° Parte</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.masterPart?.code ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">
                          {Number(item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.unitPrice))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.total))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.status === 'PENDING'
                              ? 'Pendiente'
                              : item.status === 'COMPLETED'
                                ? 'Completado'
                                : item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Total OC
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(Number(po.total))}
                    </div>
                  </div>
                </div>
                {po.invoices.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">
                      Facturas Vinculadas
                    </div>
                    {po.invoices.map(inv => (
                      <div
                        key={inv.id}
                        className="flex justify-between text-sm"
                      >
                        <span>{inv.invoiceNumber}</span>
                        <span>{formatCurrency(Number(inv.totalAmount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={actionDialog.open}
        onOpenChange={open => setActionDialog({ ...actionDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={statusMutation.isPending}
            >
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
