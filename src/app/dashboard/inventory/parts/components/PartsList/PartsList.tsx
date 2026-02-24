'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FormAddPart } from '../FormAddPart';
import { FormEditPart } from '../FormEditPart';
import { MasterPart } from '@prisma/client';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { PartsListProps, MasterPartRow } from './PartsList.types';
import { PART_CATEGORIES } from '../constants';

export function PartsList({
  initialParts,
  userIsSuperAdmin,
  userCanManage,
}: PartsListProps) {
  const [data, setData] = useState<MasterPartRow[]>(initialParts);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<MasterPartRow | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const fetchParts = useCallback(
    async (searchTerm?: string, category?: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (category && category !== 'all') params.set('category', category);

        const response = await axios.get<MasterPartRow[]>(
          `/api/inventory/parts?${params.toString()}`
        );
        setData(response.data);
      } catch (error) {
        console.error('Error fetching parts:', error);
        toast({
          title: 'Error al cargar partes',
          description: 'Por favor intentá de nuevo más tarde',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      void fetchParts(search, categoryFilter);
    }, 350);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search, categoryFilter, fetchParts]);

  const handleEdit = (part: MasterPartRow) => {
    setEditingPart(part);
    setIsEditDialogOpen(true);
  };

  const handleToggleActive = async (part: MasterPartRow) => {
    const action = part.isActive ? 'desactivar' : 'activar';
    try {
      const response = await axios.patch<MasterPart>(
        `/api/inventory/parts/${part.id}`,
        { isActive: !part.isActive }
      );
      setData(prev =>
        prev.map(p => (p.id === part.id ? { ...p, ...response.data } : p))
      );
      toast({
        title: part.isActive ? 'Autoparte desactivada' : 'Autoparte activada',
        description: `La autoparte fue ${part.isActive ? 'desactivada' : 'activada'} exitosamente`,
      });
    } catch (error) {
      console.error(`Error al ${action} autoparte:`, error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast({
          title: 'Sin permisos',
          description:
            error.response.data?.error ?? `No podés ${action} esta autoparte`,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: `Error al ${action} autoparte`,
        description: 'Por favor intentá de nuevo más tarde',
        variant: 'destructive',
      });
    }
  };

  const canMutate = (part: MasterPartRow) =>
    part.tenantId !== null || userIsSuperAdmin;

  const formatPrice = (price: unknown) => {
    if (!price) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const getTotalStock = (part: MasterPartRow) => {
    if (!part.inventoryItems || part.inventoryItems.length === 0) return 0;
    return part.inventoryItems.reduce(
      (sum, item) => sum + Number(item.quantity ?? 0),
      0
    );
  };

  const columns: ColumnDef<MasterPartRow>[] = [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      cell: ({ row }) => (
        <div>
          <span>{row.original.category}</span>
          {row.original.subcategory && (
            <p className="text-xs text-muted-foreground">
              {row.original.subcategory}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'unit',
      header: 'Unidad',
    },
    {
      accessorKey: 'referencePrice',
      header: 'Precio Ref.',
      cell: ({ row }) => formatPrice(row.original.referencePrice),
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = getTotalStock(row.original);
        return (
          <span className={stock === 0 ? 'text-muted-foreground' : ''}>
            {stock}
          </span>
        );
      },
    },
    {
      id: 'origen',
      header: 'Origen',
      cell: ({ row }) =>
        row.original.tenantId ? (
          <Badge variant="default">Local</Badge>
        ) : (
          <Badge variant="secondary">Global</Badge>
        ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Activo
          </Badge>
        ) : (
          <Badge variant="outline" className="border-red-400 text-red-600">
            Inactivo
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (!userCanManage || !canMutate(row.original)) return null;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(row.original)}
            >
              Editar
            </Button>
            <Button
              variant={row.original.isActive ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => void handleToggleActive(row.original)}
            >
              {row.original.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Header: filters + add button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Buscar por código o descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {PART_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {userCanManage && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            + Nueva Autoparte
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : (
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
                    className="h-24 text-center text-muted-foreground"
                  >
                    No se encontraron autopartes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialogs */}
      <FormAddPart
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddPart={newPart =>
          setData(prev => [{ ...newPart, inventoryItems: [] }, ...prev])
        }
      />

      {editingPart && (
        <FormEditPart
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          part={editingPart}
          onEditPart={updated =>
            setData(prev =>
              prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p))
            )
          }
        />
      )}
    </div>
  );
}
