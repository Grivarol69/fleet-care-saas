'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { GeneralInfoTab } from '../components/WorkOrderDetail/GeneralInfoTab';
import { ServicesTab } from '../components/WorkOrderDetail/ServicesTab';
import { PartsTab } from '../components/WorkOrderDetail/PartsTab';
import { PurchaseOrdersTab } from '../components/WorkOrderDetail/PurchaseOrdersTab';
import { ExpensesTab } from '../components/WorkOrderDetail/ExpensesTab';
import { HistoryTab } from '../components/WorkOrderDetail/HistoryTab';
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

type WorkOrder = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  mantType: string;
  priority: string;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  creationMileage: number;
  completionMileage: number | null;
  isPackageWork: boolean;
  packageName: string | null;
  vehicle: {
    id: number;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
    mileage: number;
  };
  technician: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  provider: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  maintenanceAlerts: Array<{
    id: number;
    itemName: string;
    status: string;
    priority: string;
    scheduledKm?: number | null;
    estimatedCost?: number | null;
  }>;
  workOrderItems: Array<{
    id: number;
    description: string;
    supplier: string | null;
    unitPrice: number;
    quantity: number;
    totalCost: number;
    status: string;
    mantItem: {
      id: number;
      name: string;
      type: string;
    };
  }>;
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
    supplier: {
      id: number;
      name: string;
    } | null;
  }>;
  workOrderExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    expenseDate: string;
    expenseType: string;
    status: string;
    vendor: string | null;
    invoiceNumber: string | null;
  }>;
  approvals: Array<{
    id: number;
    status: string;
    approvedBy: number | null;
    approvedAt: string | null;
    comments: string | null;
  }>;
};

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const workOrderId = params.id as string;

  useEffect(() => {
    fetchWorkOrder();
  }, [workOrderId]);

  const fetchWorkOrder = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `/api/maintenance/work-orders/${workOrderId}`
      );
      setWorkOrder(response.data);
    } catch (error) {
      console.error('Error fetching work order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la orden de trabajo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(`/api/maintenance/work-orders/${workOrderId}`);
      toast({
        title: 'Orden cancelada',
        description: 'La orden de trabajo ha sido cancelada exitosamente',
      });
      router.push('/dashboard/maintenance/work-orders');
    } catch (error) {
      console.error('Error deleting work order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la orden de trabajo',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleUpdate = async (updates: Partial<WorkOrder>) => {
    try {
      await axios.patch(`/api/maintenance/work-orders/${workOrderId}`, updates);
      toast({
        title: 'Actualizado',
        description: 'La orden de trabajo ha sido actualizada',
      });
      fetchWorkOrder();
    } catch (error) {
      console.error('Error updating work order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la orden de trabajo',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            Orden de trabajo no encontrada
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/maintenance/work-orders')}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const canDelete = workOrder.status !== 'COMPLETED';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/maintenance/work-orders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{workOrder.title}</h1>
            <p className="text-muted-foreground mt-1">
              {workOrder.vehicle.licensePlate} - {workOrder.vehicle.brand.name}{' '}
              {workOrder.vehicle.line.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Cancelar Orden
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">Info General</TabsTrigger>
          <TabsTrigger value="services">
            Servicios (
            {
              workOrder.workOrderItems.filter(
                i =>
                  i.mantItem.type === 'ACTION' || i.mantItem.type === 'SERVICE'
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="parts">
            Repuestos (
            {
              workOrder.workOrderItems.filter(i => i.mantItem.type === 'PART')
                .length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="purchase-orders">Órdenes Compra</TabsTrigger>
          <TabsTrigger value="expenses">
            Gastos ({workOrder.workOrderExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralInfoTab workOrder={workOrder} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <ServicesTab workOrderId={workOrder.id} onRefresh={fetchWorkOrder} />
        </TabsContent>

        <TabsContent value="parts" className="mt-6">
          <PartsTab
            workOrderId={workOrder.id}
            vehicleId={workOrder.vehicle.id}
            onRefresh={fetchWorkOrder}
          />
        </TabsContent>

        <TabsContent value="purchase-orders" className="mt-6">
          <PurchaseOrdersTab workOrderId={workOrder.id} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <ExpensesTab workOrder={workOrder} onRefresh={fetchWorkOrder} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab workOrder={workOrder} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar orden de trabajo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará la orden de trabajo y revertirá las alertas
              de mantenimiento a estado pendiente. Los items y gastos
              registrados no se eliminarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              No, mantener
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Cancelando...' : 'Sí, cancelar orden'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
