'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';

type MaintenanceAlerts = {
  id: number;
  vehiclePlate: string;
  photo: string;
  brandName?: string;
  lineName?: string;
  mantItemDescription: string;
  currentKm: number;
  executionKm: number;
  kmToMaintenance: number;
  state: 'YELLOW' | 'RED';
  status: 'ACTIVE' | 'INACTIVE'; // Agregado status ya que viene en los datos
};

export function MaintenanceStats() {
  const [data, setData] = useState<MaintenanceAlerts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMaintenanceAlerts = useCallback(async () => {
    try {
      const response = await axios.get(`/api/maintenance/alerts`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching Maintenance Alerts: ', error);
      toast({
        title: 'Error fetching Maintenance Alerts',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMaintenanceAlerts();
  }, [fetchMaintenanceAlerts]);

  const columns: ColumnDef<MaintenanceAlerts>[] = [
    {
      accessorKey: 'photo',
      header: 'Imagen',
      cell: ({ row }) => {
        const state = row.original.state;
        const bgColor = state === 'RED' ? 'bg-red-400' : 'bg-green-400';
        return (
          <div
            className={`relative h-12 w-12 ${bgColor} rounded-full flex items-center justify-center text-white font-bold text-sm`}
          >
            H2
          </div>
        );
      },
    },
    {
      accessorKey: 'state',
      header: 'Estado',
      cell: ({ row }) => {
        const state = row.original.state;
        return (
          <div className="flex items-center justify-center">
            <div
              className={`h-6 w-6 rounded-full ${state === 'YELLOW' ? 'bg-yellow-400' : 'bg-red-500'}`}
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'vehiclePlate',
      header: 'Placa',
      cell: ({ row }) => (
        <span className="text-xl font-bold">{row.original.vehiclePlate}</span>
      ),
    },
    {
      accessorKey: 'brandName',
      header: 'Marca',
      cell: ({ row }) => row.original.brandName || 'N/A',
    },
    {
      accessorKey: 'lineName',
      header: 'Linea',
      cell: ({ row }) => row.original.lineName || 'N/A',
    },
    {
      accessorKey: 'mantItemDescription',
      header: 'Item Mantenimiento',
    },
    {
      accessorKey: 'currentKm',
      header: 'KM Actuales',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.currentKm.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'executionKm',
      header: 'KM Ejecución',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.executionKm.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'kmToMaintenance',
      header: 'KM Restantes',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.kmToMaintenance.toLocaleString()}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: data, // Usar datos reales de la API
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return <div>Cargando alertas de mantenimiento...</div>;
  }

  const getRowColor = (state: 'YELLOW' | 'RED') => {
    switch (state) {
      case 'YELLOW':
        return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400';
      case 'RED':
        return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500';
      default:
        return 'bg-white hover:bg-gray-50';
    }
  };

  // Si no hay datos después de cargar, mostramos un mensaje
  if (!isLoading && data.length === 0) {
    return (
      <div className="space-y-4 rounded-md border p-8">
        <h3 className="text-lg font-semibold">Alertas de Mantenimiento</h3>
        <div className="flex items-center justify-center p-8 text-gray-500">
          <div className="text-center">
            <p className="text-lg font-medium">¡Todo al día!</p>
            <p className="text-sm">
              No hay alertas de mantenimiento pendientes
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Alertas de Mantenimiento</h3>
      </div>
      <div className="rounded-md">
        <div className="h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="text-center">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className={`${getRowColor(
                    row.original.state
                  )} transition-colors`}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="text-center">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
