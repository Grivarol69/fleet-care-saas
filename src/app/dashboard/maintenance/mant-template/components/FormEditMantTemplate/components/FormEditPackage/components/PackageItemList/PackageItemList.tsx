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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormAddPackageItem } from '../FormAddPackageItem';
import { FormEditPackageItem } from '../FormEditPackageItem';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { PackageItemListProps, PackageItem } from './PackageItemList.types';
import { Wrench, Plus, Edit, Trash2 } from 'lucide-react';

export function PackageItemList({ packageId }: PackageItemListProps) {
  const [data, setData] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackageItem | null>(null);

  const { toast } = useToast();

  const fetchPackageItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/maintenance/package-items?packageId=${packageId}`
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching Package Items: ', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description: 'Debes iniciar sesión para ver los items del paquete',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error al cargar items',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [packageId, toast]);

  useEffect(() => {
    fetchPackageItems();
  }, [fetchPackageItems]);

  const handleEdit = (item: PackageItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/maintenance/package-items/${id}`);
      setData(prevData => prevData.filter(item => item.id !== id));
      toast({
        title: 'Item eliminado',
        description: 'El item del paquete ha sido eliminado exitosamente.',
      });
    } catch (error) {
      console.error('Error deleting Package Item:', error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description: 'El item tiene órdenes de trabajo activas asociadas',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error al eliminar item',
        description: 'Por favor intenta de nuevo más tarde.',
        variant: 'destructive',
      });
    }
  };

  const formatMantType = (mantType: string) => {
    switch (mantType) {
      case 'PREVENTIVE':
        return 'Preventivo';
      case 'PREDICTIVE':
        return 'Predictivo';
      case 'CORRECTIVE':
        return 'Correctivo';
      case 'EMERGENCY':
        return 'Emergencia';
      default:
        return mantType;
    }
  };

  const getMantTypeColor = (mantType: string) => {
    switch (mantType) {
      case 'PREVENTIVE':
        return 'bg-green-100 text-green-800';
      case 'PREDICTIVE':
        return 'bg-blue-100 text-blue-800';
      case 'CORRECTIVE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPriority = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'Baja';
      case 'MEDIUM':
        return 'Media';
      case 'HIGH':
        return 'Alta';
      case 'CRITICAL':
        return 'Crítica';
      default:
        return priority;
    }
  };

  const columns: ColumnDef<PackageItem>[] = [
    {
      accessorKey: 'mantItem.name',
      header: 'Item de Mantenimiento',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">{row.original.mantItem.name}</div>
          {row.original.mantItem.description && (
            <div className="text-sm text-gray-500 mt-1">
              {row.original.mantItem.description}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'mantItem.category',
      header: 'Categoría',
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-blue-50">
          {row.original.mantItem.category.name}
        </Badge>
      ),
    },
    {
      accessorKey: 'mantItem.mantType',
      header: 'Tipo',
      cell: ({ row }) => {
        const mantType = row.original.mantItem.mantType;
        return (
          <Badge
            variant="secondary"
            className={`${getMantTypeColor(mantType)}`}
          >
            {formatMantType(mantType)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      cell: ({ row }) => {
        const priority = row.original.priority;
        return (
          <Badge
            variant="secondary"
            className={`${getPriorityColor(priority)}`}
          >
            {formatPriority(priority)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'triggerKm',
      header: 'Cada (Km)',
      cell: ({ row }) => (
        <div className="text-center font-mono font-semibold">
          {Number(row.getValue('triggerKm')).toLocaleString()} km
        </div>
      ),
    },
    {
      accessorKey: 'estimatedTime',
      header: 'Tiempo Est.',
      cell: ({ row }) => (
        <div className="text-center font-mono">
          {row.original.estimatedTime
            ? `${Number(row.original.estimatedTime).toFixed(1)}h`
            : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'estimatedCost',
      header: 'Costo Est.',
      cell: ({ row }) => (
        <div className="text-center font-mono">
          {row.original.estimatedCost
            ? `$${Number(row.original.estimatedCost).toLocaleString()}`
            : '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            Items del Paquete
          </h3>
          <p className="text-sm text-gray-600">
            Gestiona los items de mantenimiento específicos de este paquete
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar Item
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Wrench className="h-8 w-8 text-gray-400" />
                    <p className="text-gray-500">
                      No hay items configurados en este paquete
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddDialogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar primer item
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormAddPackageItem
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        packageId={packageId}
        onAddItem={(newItem: PackageItem) => {
          setData([...data, newItem]);
          fetchPackageItems(); // Refrescar para obtener relaciones completas
        }}
      />

      {editingItem && (
        <FormEditPackageItem
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          item={editingItem}
          onEditItem={(editedItem: PackageItem) => {
            setData(
              data.map(item => (item.id === editedItem.id ? editedItem : item))
            );
            fetchPackageItems(); // Refrescar para obtener relaciones completas
          }}
        />
      )}
    </div>
  );
}
