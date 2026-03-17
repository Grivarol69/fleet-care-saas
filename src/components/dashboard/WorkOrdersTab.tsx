'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { WorkOrdersList } from '@/app/dashboard/maintenance/work-orders/components/WorkOrdersList/WorkOrdersList';
import { useToast } from '@/components/hooks/use-toast';

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  mantType: string;
  priority: string;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  technician: { id: string; name: string } | null;
  provider: { id: string; name: string } | null;
  workOrderItems: Array<{
    id: string;
    description: string;
    totalCost: number;
    status: string;
  }>;
};

export function WorkOrdersTab() {
  const router = useRouter();
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: string;
    isSuperAdmin: boolean;
  } | null>(null);

  const fetchWorkOrders = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/maintenance/work-orders');
      setWorkOrders(res.data);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las órdenes de trabajo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data))
      .catch(() => {});
    fetchWorkOrders();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await axios.patch(`/api/maintenance/work-orders/${id}`, {
        status: newStatus,
      });
      toast({ title: 'Estado actualizado' });
      fetchWorkOrders();
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        'No tenés los permisos necesarios para esta acción.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <WorkOrdersList
      workOrders={workOrders}
      isLoading={isLoading}
      currentUser={currentUser ?? { id: '', role: '', isSuperAdmin: false }}
      onViewDetail={id =>
        router.push(`/dashboard/maintenance/work-orders/${id}`)
      }
      onStatusChange={handleStatusChange}
    />
  );
}
