'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { InvoicesList } from './components/InvoicesList/InvoicesList';
import { InvoicesFilters } from './components/InvoicesList/InvoicesFilters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';

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
  } | null;
  workOrder: {
    id: number;
    title: string;
    vehicle: {
      licensePlate: string;
    };
  } | null;
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    paymentDate: string;
  }>;
};

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/invoices');
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las facturas',
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
    });
  };

  const handleViewDetail = (id: number) => {
    router.push(`/dashboard/invoices/${id}`);
  };

  // Filtrado en cliente
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Búsqueda por número de factura, proveedor o work order
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesNumber = inv.invoiceNumber.toLowerCase().includes(searchLower);
        const matchesSupplier = inv.supplier?.name.toLowerCase().includes(searchLower) || false;
        const matchesWorkOrder = inv.workOrder?.title.toLowerCase().includes(searchLower) || false;
        const matchesPlate = inv.workOrder?.vehicle.licensePlate.toLowerCase().includes(searchLower) || false;

        if (!matchesNumber && !matchesSupplier && !matchesWorkOrder && !matchesPlate) {
          return false;
        }
      }

      // Filtro por estado
      if (filters.status !== 'all' && inv.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [invoices, filters]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Facturas</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de facturas de mantenimiento y servicios
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/invoices/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      <InvoicesFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <InvoicesList
        invoices={filteredInvoices}
        isLoading={isLoading}
        onRefresh={fetchInvoices}
        onViewDetail={handleViewDetail}
      />
    </div>
  );
}
