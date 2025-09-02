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
import { FormAddTemplateItem } from '../FormAddTemplateItem';
import { FormEditTemplateItem } from '../FormEditTemplateItem';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { TemplateItemsListProps, TemplateItem } from './TemplateItemsList.types';

export function TemplateItemsList({ templateId }: TemplateItemsListProps) {
  const [data, setData] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);

  const { toast } = useToast();

  const fetchTemplateItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/maintenance/template-items?planId=${templateId}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching Template Items: ', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description: 'Debes iniciar sesión para ver los items del template',
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
  }, [templateId, toast]);

  useEffect(() => {
    fetchTemplateItems();
  }, [fetchTemplateItems]);

  const handleEdit = (item: TemplateItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/maintenance/template-items/${id}`);
      setData(prevData => prevData.filter(item => item.id !== id));
      toast({
        title: 'Item eliminado',
        description: 'El item del template ha sido eliminado exitosamente.',
      });
    } catch (error) {
      console.error('Error deleting Template Item:', error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description: 'El item tiene planes de vehículos activos asociados',
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

  const columns: ColumnDef<TemplateItem>[] = [
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
      accessorKey: 'triggerKm',
      header: 'Cada (Km)',
      cell: ({ row }) => (
        <div className="text-center font-mono font-semibold">
          {Number(row.getValue('triggerKm')).toLocaleString()} km
        </div>
      ),
    },
    {
      accessorKey: 'mantItem.estimatedTime',
      header: 'Tiempo Est.',
      cell: ({ row }) => (
        <div className="text-center font-mono">
          {Number(row.original.mantItem.estimatedTime).toFixed(1)}h
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
          >
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            Eliminar
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
          <h3 className="text-lg font-semibold">Tareas del Template</h3>
          <p className="text-sm text-gray-600">
            Gestiona los items de mantenimiento y su frecuencia en kilómetros
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Agregar Tarea
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
                    <p className="text-gray-500">No hay tareas configuradas en este template</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsAddDialogOpen(true)}
                    >
                      Agregar primera tarea
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormAddTemplateItem
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        templateId={templateId}
        onAddItem={(newItem: TemplateItem) => setData([...data, newItem])}
      />

      {editingItem && (
        <FormEditTemplateItem
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          item={editingItem}
          onEditItem={(editedItem: TemplateItem) => {
            setData(
              data.map(item =>
                item.id === editedItem.id ? editedItem : item
              )
            );
          }}
        />
      )}
    </div>
  );
}