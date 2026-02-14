'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { FormAddVehiclePart } from '../FormAddVehiclePart';
import { FormEditVehiclePart } from '../FormEditVehiclePart';
import type { VehiclePartEntry } from './VehiclePartsList.types';
import type {
  SelectOption,
  MantItemOption,
  LineOption,
  MasterPartOption,
} from '../FormAddVehiclePart/FormAddVehiclePart.types';

export function VehiclePartsList() {
  const [data, setData] = useState<VehiclePartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VehiclePartEntry | null>(
    null
  );
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Reference data for selects
  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [mantItems, setMantItems] = useState<MantItemOption[]>([]);
  const [masterParts, setMasterParts] = useState<MasterPartOption[]>([]);

  // Filters
  const [filterBrandId, setFilterBrandId] = useState<string>('all');
  const [filterLineId, setFilterLineId] = useState<string>('all');
  const [filterMantItemId, setFilterMantItemId] = useState<string>('all');

  const { toast } = useToast();

  // Fetch auth info once
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(d => {
        if (d.isSuperAdmin) setIsSuperAdmin(true);
      })
      .catch(() => {});
  }, []);

  // Fetch KB entries
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterBrandId !== 'all') params.set('vehicleBrandId', filterBrandId);
      if (filterLineId !== 'all') params.set('vehicleLineId', filterLineId);
      if (filterMantItemId !== 'all')
        params.set('mantItemId', filterMantItemId);

      const response = await axios.get(
        `/api/maintenance/vehicle-parts?${params.toString()}`
      );
      setData(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description: 'Debes iniciar sesion',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error al cargar datos',
        description: 'Por favor intenta de nuevo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filterBrandId, filterLineId, filterMantItemId, toast]);

  // Fetch reference data in parallel on mount
  useEffect(() => {
    Promise.all([
      axios.get('/api/vehicles/brands'),
      axios.get('/api/vehicles/lines'),
      axios.get('/api/maintenance/mant-items'),
      axios.get('/api/inventory/parts'),
    ])
      .then(([brandsRes, linesRes, itemsRes, partsRes]) => {
        setBrands(
          brandsRes.data.map((b: { id: number; name: string }) => ({
            id: b.id,
            name: b.name,
          }))
        );
        setLines(
          linesRes.data.map(
            (l: { id: number; name: string; brandId: number }) => ({
              id: l.id,
              name: l.name,
              brandId: l.brandId,
            })
          )
        );
        setMantItems(
          itemsRes.data.map(
            (i: { id: number; name: string; type: string }) => ({
              id: i.id,
              name: i.name,
              type: i.type,
            })
          )
        );
        setMasterParts(
          partsRes.data.map(
            (p: { id: string; code: string; description: string }) => ({
              id: p.id,
              code: p.code,
              description: p.description,
            })
          )
        );
      })
      .catch(() => {
        toast({
          title: 'Error cargando datos de referencia',
          variant: 'destructive',
        });
      });
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (entry: VehiclePartEntry) => {
    setEditingEntry(entry);
    setIsEditOpen(true);
  };

  const canMutate = (item: VehiclePartEntry) => !item.isGlobal || isSuperAdmin;

  // Filter lines by selected brand for the filter dropdown
  const filterLines = useMemo(() => {
    if (filterBrandId === 'all') return lines;
    return lines.filter(l => l.brandId === parseInt(filterBrandId));
  }, [filterBrandId, lines]);

  const columns: ColumnDef<VehiclePartEntry>[] = [
    {
      accessorKey: 'mantItem.name',
      header: 'Item Mantenimiento',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.mantItem.name}</div>
      ),
    },
    {
      accessorKey: 'vehicleBrand.name',
      header: 'Marca',
    },
    {
      accessorKey: 'vehicleLine.name',
      header: 'Linea',
    },
    {
      id: 'years',
      header: 'Anios',
      cell: ({ row }) => {
        const from = row.original.yearFrom;
        const to = row.original.yearTo;
        if (!from && !to) return <span className="text-slate-400">Todos</span>;
        return (
          <span className="text-sm">
            {from ?? '...'} - {to ?? 'actual'}
          </span>
        );
      },
    },
    {
      id: 'masterPart',
      header: 'Autoparte',
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-xs text-slate-600">
            {row.original.masterPart.code}
          </div>
          <div className="text-sm text-slate-500">
            {row.original.masterPart.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Cantidad',
      cell: ({ row }) => (
        <span className="font-medium">{parseFloat(row.original.quantity)}</span>
      ),
    },
    {
      id: 'origin',
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
      header: 'Acciones',
      cell: ({ row }) =>
        canMutate(row.original) ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            Editar
          </Button>
        ) : null,
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Marca</label>
          <Select
            value={filterBrandId}
            onValueChange={v => {
              setFilterBrandId(v);
              setFilterLineId('all');
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {brands.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Linea</label>
          <Select value={filterLineId} onValueChange={setFilterLineId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {filterLines.map(l => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">
            Item Mantenimiento
          </label>
          <Select value={filterMantItemId} onValueChange={setFilterMantItemId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {mantItems.map(i => (
                <SelectItem key={i.id} value={String(i.id)}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="ml-auto">
          Vincular Autoparte
        </Button>
      </div>

      {/* Table */}
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
                No hay vinculos de autopartes registrados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Dialogs */}
      <FormAddVehiclePart
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
        onAdd={entry => setData(prev => [...prev, entry])}
        brands={brands}
        lines={lines}
        mantItems={mantItems}
        masterParts={masterParts}
        isSuperAdmin={isSuperAdmin}
      />

      {editingEntry && (
        <FormEditVehiclePart
          isOpen={isEditOpen}
          setIsOpen={setIsEditOpen}
          entry={editingEntry}
          onEdit={updated =>
            setData(prev => prev.map(e => (e.id === updated.id ? updated : e)))
          }
          masterParts={masterParts}
        />
      )}
    </div>
  );
}
