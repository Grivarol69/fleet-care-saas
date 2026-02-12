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
import { FormAddMantItem } from '../FormAddMantItem';
import { FormEditMantItem } from '../FormEditMantItem';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { MantItemsListProps } from './MantItemsList.types';

export function MantItemsList() {
  const [data, setData] = useState<MantItemsListProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMantItem, setEditingMantItem] =
    useState<MantItemsListProps | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.isSuperAdmin) setIsSuperAdmin(true);
      })
      .catch(() => {});
  }, []);

  const fetchMantItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/maintenance/mant-items`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching MantItems: ', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description:
            'Debes iniciar sesión para ver los items de mantenimiento',
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
  }, [toast]);

  useEffect(() => {
    fetchMantItems();
  }, [fetchMantItems]);

  const handleEdit = (mantItem: MantItemsListProps) => {
    setEditingMantItem(mantItem);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/maintenance/mant-items/${id}`);
      setData(prevData => prevData.filter(mantItem => mantItem.id !== id));
      toast({
        title: 'Item eliminado',
        description: 'El item de mantenimiento ha sido eliminado exitosamente.',
      });
    } catch (error) {
      console.error('Error deleting MantItem:', error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description: 'El item tiene órdenes de trabajo asociadas',
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

  // Función para formatear el tipo de mantenimiento
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

  const canMutate = (item: MantItemsListProps) => !item.isGlobal || isSuperAdmin;

  const columns: ColumnDef<MantItemsListProps>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <div className="font-medium">#{row.getValue('id')}</div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre del Item',
      cell: ({ row }) => (
        <div className="font-semibold">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      cell: ({ row }) => {
        const category = row.original.category;
        return (
          <div className="text-sm">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {category.name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'mantType',
      header: 'Tipo',
      cell: ({ row }) => {
        const mantType = row.getValue('mantType') as string;
        const colorClass =
          {
            PREVENTIVE: 'bg-green-100 text-green-800',
            PREDICTIVE: 'bg-blue-100 text-blue-800',
            CORRECTIVE: 'bg-yellow-100 text-yellow-800',
            EMERGENCY: 'bg-red-100 text-red-800',
          }[mantType] || 'bg-gray-100 text-gray-800';

        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
            {formatMantType(mantType)}
          </span>
        );
      },
    },
    {
      accessorKey: 'estimatedTime',
      header: 'Tiempo Est. (h)',
      cell: ({ row }) => (
        <div className="text-center font-mono">
          {Number(row.getValue('estimatedTime')).toFixed(1)}h
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const isActive = status === 'ACTIVE';
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        );
      },
    },
    {
      id: 'origen',
      header: 'Origen',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.original.isGlobal
            ? 'bg-purple-100 text-purple-800'
            : 'bg-slate-100 text-slate-700'
        }`}>
          {row.original.isGlobal ? 'Global' : 'Empresa'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => canMutate(row.original) ? (
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
      ) : null,
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
        {/* <h2 className="text-2xl font-bold">Items de Mantenimiento</h2> */}
        <Button onClick={() => setIsAddDialogOpen(true)}>Agregar Item</Button>
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
                  No hay items de mantenimiento registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormAddMantItem
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddMantItem={(newMantItem: MantItemsListProps) =>
          setData([...data, newMantItem])
        }
      />

      {editingMantItem && (
        <FormEditMantItem
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          mantItem={editingMantItem}
          onEditMantItem={(editedMantItem: MantItemsListProps) => {
            setData(
              data.map(item =>
                item.id === editedMantItem.id ? editedMantItem : item
              )
            );
          }}
        />
      )}
    </div>
  );
}
