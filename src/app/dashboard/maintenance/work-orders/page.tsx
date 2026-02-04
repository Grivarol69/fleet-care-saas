'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { WorkOrdersList } from './components/WorkOrdersList/WorkOrdersList';
import { WorkOrdersFilters } from './components/WorkOrdersList/WorkOrdersFilters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';

type WorkOrder = {
  id: number;
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
    id: number;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  technician: {
    id: number;
    name: string;
  } | null;
  provider: {
    id: number;
    name: string;
  } | null;
  workOrderItems: Array<{
    id: number;
    description: string;
    totalCost: number;
    status: string;
  }>;
};

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    mantType: 'all',
    priority: 'all',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/maintenance/work-orders');
      setWorkOrders(response.data);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las órdenes de trabajo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      mantType: 'all',
      priority: 'all',
    });
  };

  const handleViewDetail = (id: number) => {
    router.push(`/dashboard/maintenance/work-orders/${id}`);
  };

  const handleStartWork = async (id: number) => {
    try {
      await axios.patch(`/api/maintenance/work-orders/${id}`, {
        status: 'IN_PROGRESS',
      });
      toast({
        title: 'Trabajo iniciado',
        description: 'La orden de trabajo se ha marcado como En Progreso',
      });
      fetchWorkOrders();
    } catch (error) {
      console.error('Error starting work order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el trabajo',
        variant: 'destructive',
      });
    }
  };

  // Filtrado en cliente
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      // Búsqueda por título o placa
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = wo.title.toLowerCase().includes(searchLower);
        const matchesPlate = wo.vehicle.licensePlate
          .toLowerCase()
          .includes(searchLower);
        if (!matchesTitle && !matchesPlate) return false;
      }

      // Filtro por estado
      if (filters.status !== 'all' && wo.status !== filters.status) {
        return false;
      }

      // Filtro por tipo
      if (filters.mantType !== 'all' && wo.mantType !== filters.mantType) {
        return false;
      }

      // Filtro por prioridad
      if (filters.priority !== 'all' && wo.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [workOrders, filters]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de mantenimientos programados y correctivos
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden
        </Button>
      </div>

      <WorkOrdersFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <WorkOrdersList
        workOrders={filteredWorkOrders}
        isLoading={isLoading}
        onViewDetail={handleViewDetail}
        onStartWork={handleStartWork}
      />
    </div>
  );
}
