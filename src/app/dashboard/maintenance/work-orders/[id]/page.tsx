'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { GeneralInfoTab } from '../components/WorkOrderDetail/GeneralInfoTab';
import { WorkTab } from '../components/WorkOrderDetail/WorkTab';
import { CostsTab } from '../components/WorkOrderDetail/CostsTab';
import { WorkOrderHeader } from '../components/WorkOrderDetail/WorkOrderHeader';
import { ActivityTab } from '../components/WorkOrderDetail/ActivityTab';
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

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

type WorkOrder = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null; // NUEVO
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
  costCenterId: string | null;
  costCenterRef: { id: string; name: string } | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
    mileage: number;
  };
  technician: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  provider: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  maintenanceAlerts: Array<{
    id: string;
    itemName: string;
    status: string;
    priority: string;
    scheduledKm?: number | null;
    estimatedCost?: number | null;
  }>;
  workOrderItems: Array<{
    id: string;
    description: string;
    supplier: string | null;
    unitPrice: number;
    quantity: number;
    totalCost: number;
    status: string;
    itemSource: string | null; // NUEVO
    closureType: string | null; // NUEVO
    notes: string | null; // NUEVO
    mantItem: {
      id: string;
      name: string;
      type: string;
    };
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
    supplier: { id: string; name: string } | null;
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
    id: string;
    status: string;
    approvedBy: string | null;
    approvedAt: string | null;
    notes: string | null;
  }>;
  internalWorkTickets: Array<{
    // NUEVO
    id: string;
    status: string;
    notes: string | null;
    laborEntries: Array<{
      id: string;
      workOrderItemId: string | null;
      hours: number;
      laborCost: number;
      notes: string | null;
    }>;
    partEntries: Array<{
      id: string;
      workOrderItemId: string | null;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
  }>;
  purchaseOrders: Array<{
    // NUEVO
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    notes: string | null;
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then((data: CurrentUser) => setCurrentUser(data))
      .catch(() => {});
  }, []);

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

  return (
    <div className="p-6">
      {/* Header */}
      <WorkOrderHeader
        workOrder={workOrder}
        currentUser={currentUser}
        onUpdate={handleUpdate}
        onDelete={() => setShowDeleteDialog(true)}
      />

      {/* Tabs */}
      <Tabs defaultValue="work" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="work">Trabajo (Interno/Ext)</TabsTrigger>
          <TabsTrigger value="costs">Costos y Gastos</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralInfoTab
            workOrder={workOrder}
            onUpdate={handleUpdate}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="work" className="mt-6">
          <WorkTab
            workOrder={workOrder}
            currentUser={currentUser}
            onRefresh={fetchWorkOrder}
          />
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <CostsTab
            workOrder={workOrder}
            currentUser={currentUser}
            onRefresh={fetchWorkOrder}
          />
        </TabsContent>

        <TabsContent value="actividad" className="mt-6">
          <ActivityTab workOrder={workOrder} onRefresh={fetchWorkOrder} />
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
