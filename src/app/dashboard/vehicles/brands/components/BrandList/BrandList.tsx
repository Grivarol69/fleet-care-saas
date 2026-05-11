'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FormAddBrand } from '../FormAddBrand';
import { FormEditBrand } from '../FormEditBrand';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { BrandListProps } from './BrandList.types';

export function BrandList() {
  const [data, setData] = useState<BrandListProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandListProps | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [search, setSearch] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.isSuperAdmin) setIsSuperAdmin(true);
      })
      .catch(() => {});
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/vehicles/brands`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching Brands: ', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description: 'Debes iniciar sesión para ver las marcas',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Error al cargar marcas',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleEdit = (brand: BrandListProps) => {
    setEditingBrand(brand);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/vehicles/brands/${id}`);
      setData(data.filter(brand => brand.id !== id));
      toast({
        title: 'Marca eliminada',
        description: 'La marca ha sido eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error deleting brand:', error);

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description: 'La marca tiene vehículos o líneas asociadas',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Error al eliminar marca',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    }
  };

  const canMutate = (item: BrandListProps) => !item.isGlobal || isSuperAdmin;

  const columns: ColumnDef<BrandListProps>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
    },
    {
      id: 'origen',
      header: 'Origen',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            row.original.isGlobal
              ? 'bg-purple-100 text-purple-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {row.original.isGlobal ? 'Global' : 'Empresa'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        canMutate(row.original) ? (
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
        ) : null,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    globalFilterFn: 'includesString',
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
      <div className="flex items-center gap-4 mb-4">
        <Button onClick={() => setIsAddDialogOpen(true)}>Agregar Marca</Button>
        <Input
          placeholder="Buscar marca..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

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
                No hay marcas registradas
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <FormAddBrand
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddBrand={newBrand => setData([...data, newBrand])}
      />

      {editingBrand && (
        <FormEditBrand
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          brand={editingBrand}
          onEditBrand={editedBrand => {
            setData(
              data.map(brand =>
                brand.id === editedBrand.id ? editedBrand : brand
              )
            );
          }}
        />
      )}
    </div>
  );
}
