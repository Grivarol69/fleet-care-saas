'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  WorkOrdersList,
  statusConfig,
} from './components/WorkOrdersList/WorkOrdersList';
import { WorkOrdersFilters } from './components/WorkOrdersList/WorkOrdersFilters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
  technician: {
    id: string;
    name: string;
  } | null;
  provider: {
    id: string;
    name: string;
  } | null;
  workOrderItems: Array<{
    id: string;
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
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: string;
    isSuperAdmin: boolean;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data))
      .catch(() => {});
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

  const handleViewDetail = (id: string) => {
    router.push(`/dashboard/maintenance/work-orders/${id}`);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await axios.patch(`/api/maintenance/work-orders/${id}`, {
        status: newStatus,
      });
      toast({
        title: 'Estado actualizado',
        description: `La OT pasó a ${newStatus}`,
      });
      fetchWorkOrders();
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        'No tenés los permisos necesarios para esta acción.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
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

      // Filtro por tab (estado)
      if (activeTab !== 'all' && wo.status !== activeTab) {
        return false;
      }

      // Filtro por estado del select
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
  }, [workOrders, filters, activeTab]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de mantenimientos programados y correctivos
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/maintenance/work-orders/new')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden
        </Button>
      </div>

      {/* Tabs por estado */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => {
            setActiveTab('all');
            setFilters(prev => ({ ...prev, status: 'all' }));
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          Todas
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'all' ? 'bg-background/20' : 'bg-muted-foreground/10'}`}
          >
            {workOrders.length}
          </span>
        </button>
        {(
          [
            'PENDING',
            'IN_PROGRESS',
            'PENDING_INVOICE',
            'COMPLETED',
            'CANCELLED',
          ] as const
        ).map(key => {
          const config = statusConfig[key];
          const count = workOrders.filter(wo => wo.status === key).length;
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setFilters(prev => ({ ...prev, status: 'all' }));
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                isActive
                  ? config.color
                  : 'bg-background border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {config.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-background/50' : 'bg-muted-foreground/10'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <WorkOrdersFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <WorkOrdersList
        workOrders={filteredWorkOrders}
        isLoading={isLoading}
        currentUser={currentUser ?? { id: '', role: '', isSuperAdmin: false }}
        onViewDetail={handleViewDetail}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
