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
import { FormAddMantTemplate } from '../FormAddMantTemplate';
import { FormEditMantTemplate } from '../FormEditMantTemplate';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { MantTemplatesListProps } from './MantTemplatesList.types';

export function MantTemplatesList() {
  const [data, setData] = useState<MantTemplatesListProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<MantTemplatesListProps | null>(null);

  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/maintenance/mant-template`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching Templates: ', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description:
            'Debes iniciar sesión para ver los templates de mantenimiento',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error al cargar templates',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEdit = (template: MantTemplatesListProps) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/maintenance/mant-template/${id}`);
      setData(prevData => prevData.filter(template => template.id !== id));
      toast({
        title: 'Template eliminado',
        description: 'El template de mantenimiento ha sido eliminado exitosamente.',
      });
    } catch (error) {
      console.error('Error deleting Template:', error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description: 'El template tiene vehículos asignados activos',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error al eliminar template',
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

  const columns: ColumnDef<MantTemplatesListProps>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <div className="font-medium">#{row.getValue('id')}</div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre del Template',
      cell: ({ row }) => (
        <div className="font-semibold">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'brand',
      header: 'Marca',
      cell: ({ row }) => {
        const brand = row.original.brand;
        return (
          <Badge variant="outline" className="bg-blue-50">
            {brand.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'line',
      header: 'Línea',
      cell: ({ row }) => {
        const line = row.original.line;
        return (
          <Badge variant="outline" className="bg-purple-50">
            {line.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'planTasks',
      header: 'Tareas',
      cell: ({ row }) => {
        const tasks = row.original.planTasks;
        if (!tasks || tasks.length === 0) {
          return (
            <span className="text-gray-500 text-sm">Sin tareas</span>
          );
        }
        
        // Mostrar algunos tipos de mantenimiento únicos
        const uniqueTypes = Array.from(new Set(tasks.map(task => task.mantItem.mantType)));
        
        return (
          <div className="flex flex-wrap gap-1">
            <span className="text-sm font-medium mr-1">{tasks.length}</span>
            {uniqueTypes.slice(0, 2).map((type, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className={`text-xs ${getMantTypeColor(type)}`}
              >
                {formatMantType(type)}
              </Badge>
            ))}
            {uniqueTypes.length > 2 && (
              <span className="text-xs text-gray-500">+{uniqueTypes.length - 2}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const isActive = status === 'ACTIVE';
        return (
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        );
      },
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
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Crear Template
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
                  No hay templates de mantenimiento registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormAddMantTemplate
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddTemplate={(newTemplate: MantTemplatesListProps) =>
          setData([...data, newTemplate])
        }
      />

      {editingTemplate && (
        <FormEditMantTemplate
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          template={editingTemplate}
          onEditTemplate={(editedTemplate: MantTemplatesListProps) => {
            setData(
              data.map(item =>
                item.id === editedTemplate.id ? editedTemplate : item
              )
            );
          }}
        />
      )}
    </div>
  );
}