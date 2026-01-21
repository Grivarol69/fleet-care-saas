'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import { ArrowLeft, Trash2, Printer } from 'lucide-react';
import { DetailsTab } from '../components/InvoiceDetail/DetailsTab';
import { ItemsTab } from '../components/InvoiceDetail/ItemsTab';
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
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    workOrderItem: {
      id: number;
      description: string;
      mantItem: {
        id: number;
        name: string;
        type: string;
      } | null;
    } | null;
    masterPart: {
      id: number;
      name: string;
      partNumber: string;
    } | null;
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      toast({
        title: 'Error',
        description: 'No se pudo cargar la factura',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(`/api/invoices/${invoiceId}`);
      toast({
        title: 'Factura eliminada',
        description: 'La factura ha sido eliminada exitosamente',
      });
      router.push('/dashboard/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'No se pudo eliminar la factura';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePrint = () => {
    router.push(`/dashboard/invoices/${invoiceId}/print`);
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
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            Factura no encontrada
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/invoices')}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const canDelete = invoice.payments.length === 0;
  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = invoice.totalAmount - totalPaid;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/invoices')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Factura {invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground mt-1">
              {invoice.supplier?.name || 'Sin proveedor'}
              {invoice.workOrder && (
                <> • {invoice.workOrder.vehicle.licensePlate}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Balance info */}
      {totalPaid > 0 && (
        <div className="mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Pagado</p>
              <p className="text-lg font-semibold">
                ${totalPaid.toLocaleString('es-CO')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`text-lg font-semibold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                ${balance.toLocaleString('es-CO')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">
                ${invoice.totalAmount.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="items">
            Items ({invoice.items.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <DetailsTab invoice={invoice} onRefresh={fetchInvoice} />
        </TabsContent>

        <TabsContent value="items" className="mt-6">
          <ItemsTab invoice={invoice} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la factura permanentemente y revertirá la orden de trabajo asociada a estado &quot;Pendiente Factura&quot;.
              {!canDelete && (
                <span className="block mt-2 text-destructive font-semibold">
                  No se puede eliminar una factura con pagos registrados.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || !canDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
