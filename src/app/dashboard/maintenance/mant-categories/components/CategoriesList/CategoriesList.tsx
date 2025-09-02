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
import { FormAddCategory } from '../FormAddCategory';
import { FormEditCategory } from '../FormEditCategory';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { CategoriesListProps } from './CategoriesList.types';

export function CategoriesList() {
  const [data, setData] = useState<CategoriesListProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoriesListProps | null>(null);

  const { toast } = useToast();

  const fetchCategorys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/maintenance/mant-categories`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching Categories: ', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description: 'Debes iniciar sesión para ver las categorias',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Error al cargar categorias',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategorys();
  }, [fetchCategorys]);

  const handleEdit = (category: CategoriesListProps) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/maintenance/mant-categories/${id}`);
      setData(data.filter(category => category.id !== id));
      toast({
        title: 'categoria eliminada',
        description: 'La categoria ha sido eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error deleting Category:', error);

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description: 'La categoria tiene vehículos o líneas asociadas',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Error al eliminar categoria',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    }
  };

  const columns: ColumnDef<CategoriesListProps>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div>
          <Button
            variant="outline"
            className="mr-2"
            onClick={() => handleEdit(row.original)}
          >
            Editar
          </Button>
          <Button
            variant="destructive"
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
      <Button onClick={() => setIsAddDialogOpen(true)} className="mb-4">
        Agregar categoria
      </Button>

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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No hay categorias registradas
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <FormAddCategory
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddCategory={newCategory => setData([...data, newCategory])}
      />

      {editingCategory && (
        <FormEditCategory
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          category={editingCategory}
          onEditCategory={editedCategory => {
            setData(
              data.map(Category =>
                Category.id === editedCategory.id ? editedCategory : Category
              )
            );
          }}
        />
      )}
    </div>
  );
}
