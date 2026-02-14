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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Settings,
  Clock,
  DollarSign,
  Wrench,
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';

import { PackageListProps, MaintenancePackage } from './PackageList.types';
import { FormAddPackage } from '../FormAddPackage';
import { FormEditPackage } from '../FormEditPackage';

export function PackageList({ templateId }: PackageListProps) {
  const [data, setData] = useState<MaintenancePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<MaintenancePackage | null>(null);

  const { toast } = useToast();

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/maintenance/packages?templateId=${templateId}`
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description: 'Debes iniciar sesión para ver los paquetes',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los paquetes',
          variant: 'destructive',
        });
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [templateId, toast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleEdit = (pkg: MaintenancePackage) => {
    setEditingPackage(pkg);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este paquete?')) return;

    try {
      await axios.delete(`/api/maintenance/packages/${id}`);
      toast({
        title: 'Paquete eliminado',
        description: 'El paquete ha sido eliminado exitosamente.',
      });
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description: 'El paquete tiene items activos asociados',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error',
        description: 'Error al eliminar el paquete.',
        variant: 'destructive',
      });
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

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const columns: ColumnDef<MaintenancePackage>[] = [
    {
      accessorKey: 'triggerKm',
      header: 'Kilometraje',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-500" />
          <span className="font-semibold">
            {(row.getValue('triggerKm') as number).toLocaleString()} km
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre del Paquete',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('name')}</div>
          <div className="text-sm text-muted-foreground">
            {row.original._count?.packageItems || 0} items
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'estimatedCost',
      header: 'Costo Estimado',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-500" />
          <span>{formatCurrency(row.getValue('estimatedCost'))}</span>
        </div>
      ),
    },
    {
      accessorKey: 'estimatedTime',
      header: 'Tiempo Est.',
      cell: ({ row }) => {
        const time = row.getValue('estimatedTime') as number;
        return time ? (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span>{time}h</span>
          </div>
        ) : (
          '-'
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as string;
        return <Badge className={getPriorityColor(priority)}>{priority}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Cargando paquetes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold">Paquetes de Mantenimiento</h3>
            <p className="text-sm text-muted-foreground">
              Agrupa tareas por kilometraje para mantenimientos eficientes
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Paquete
        </Button>
      </div>

      {/* Packages Table */}
      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="text-lg font-semibold mb-2">
                No hay paquetes configurados
              </h4>
              <p className="text-muted-foreground mb-4">
                Crea paquetes de mantenimiento agrupados por kilometraje para
                optimizar el proceso.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Paquete
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {data.length} Paquete{data.length !== 1 ? 's' : ''} Configurado
              {data.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map(row => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                      >
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
                        No hay paquetes configurados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <FormAddPackage
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        templateId={templateId}
        onAddPackage={() => fetchPackages()}
      />

      {editingPackage && (
        <FormEditPackage
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          packageData={editingPackage}
          onEditPackage={() => fetchPackages()}
        />
      )}
    </div>
  );
}
