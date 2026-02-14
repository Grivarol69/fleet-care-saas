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
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { FormAddDocumentType } from './FormAddDocumentType';
import { FormEditDocumentType } from './FormEditDocumentType';

interface DocumentTypeConfig {
  id: number;
  tenantId: string | null;
  isGlobal: boolean;
  countryCode: string;
  code: string;
  name: string;
  description: string | null;
  requiresExpiry: boolean;
  isMandatory: boolean;
  expiryWarningDays: number;
  expiryCriticalDays: number;
  sortOrder: number;
  status: string;
}

export function DocumentTypeList() {
  const [data, setData] = useState<DocumentTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentTypeConfig | null>(
    null
  );

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/vehicles/document-types');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching document types:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los tipos de documento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (item: DocumentTypeConfig) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Desea desactivar este tipo de documento?')) return;

    try {
      await axios.delete(`/api/vehicles/document-types/${id}`);
      setData(prev => prev.filter(item => item.id !== id));
      toast({
        title: 'Tipo desactivado',
        description: 'El tipo de documento ha sido desactivado',
      });
    } catch (error) {
      console.error('Error deleting document type:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desactivar el tipo de documento',
        variant: 'destructive',
      });
    }
  };

  const columns: ColumnDef<DocumentTypeConfig>[] = [
    {
      accessorKey: 'code',
      header: 'Codigo',
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
    },
    {
      accessorKey: 'countryCode',
      header: 'Pais',
    },
    {
      accessorKey: 'isGlobal',
      header: 'Alcance',
      cell: ({ row }) =>
        row.original.isGlobal ? (
          <Badge variant="secondary">Global</Badge>
        ) : (
          <Badge variant="outline">Custom</Badge>
        ),
    },
    {
      accessorKey: 'requiresExpiry',
      header: 'Vencimiento',
      cell: ({ row }) =>
        row.original.requiresExpiry ? (
          <span className="text-green-600 font-medium">Si</span>
        ) : (
          <span className="text-gray-400">No</span>
        ),
    },
    {
      accessorKey: 'isMandatory',
      header: 'Obligatorio',
      cell: ({ row }) =>
        row.original.isMandatory ? (
          <Badge variant="destructive">Obligatorio</Badge>
        ) : (
          <span className="text-gray-400">Opcional</span>
        ),
    },
    {
      accessorKey: 'expiryWarningDays',
      header: 'Warning (dias)',
    },
    {
      accessorKey: 'expiryCriticalDays',
      header: 'Critical (dias)',
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
          {!row.original.isGlobal && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(row.original.id)}
            >
              Desactivar
            </Button>
          )}
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Agregar Tipo de Documento
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
            {table.getRowModel().rows?.length ? (
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
                  No hay tipos de documento configurados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormAddDocumentType
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAdd={newItem => {
          setData([...data, newItem]);
        }}
      />

      {editingItem && (
        <FormEditDocumentType
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          documentType={editingItem}
          onEdit={updated => {
            setData(
              data.map(item => (item.id === updated.id ? updated : item))
            );
          }}
        />
      )}
    </div>
  );
}
