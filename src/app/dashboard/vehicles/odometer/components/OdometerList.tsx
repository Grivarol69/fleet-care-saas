'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { OdometerLog } from './types';

interface OdometerListProps {
  odometerLogs: OdometerLog[];
  onAdd: () => void;
  onEdit: (log: OdometerLog) => void;
  onDelete: (id: number) => void;
}

export function OdometerList({
  odometerLogs,
  onAdd,
  onEdit,
  onDelete,
}: OdometerListProps) {
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<OdometerLog>[]>(
    () => [
      {
        header: 'Fecha',
        accessorKey: 'recordedAt',
        cell: ({ getValue }) => {
          const value = getValue() as Date;
          return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: es });
        },
      },
      {
        header: 'Vehículo',
        accessorFn: row => row.vehicle.licensePlate,
        id: 'vehiclePlate',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.vehicle.licensePlate}
            </div>
            <div className="text-sm text-muted-foreground">
              {row.original.vehicle.brand.name} {row.original.vehicle.line.name}
            </div>
          </div>
        ),
      },
      {
        header: 'Conductor',
        accessorFn: row => row.driver?.name || 'Sin conductor',
        id: 'driverName',
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return value === 'Sin conductor' ? (
            <Badge variant="outline">{value}</Badge>
          ) : (
            <span>{value}</span>
          );
        },
      },
      {
        header: 'Tipo',
        accessorKey: 'measureType',
        cell: ({ getValue }) => {
          const value = getValue() as 'KILOMETERS' | 'HOURS';
          return (
            <Badge variant={value === 'KILOMETERS' ? 'default' : 'secondary'}>
              {value === 'KILOMETERS' ? 'Kilómetros' : 'Horas'}
            </Badge>
          );
        },
      },
      {
        header: 'Valor',
        accessorKey: 'measureValue',
        cell: ({ row }) => {
          const measureType = row.original.measureType;
          const kilometers = row.original.kilometers;
          const hours = row.original.hours;
          const value = measureType === 'KILOMETERS' ? kilometers : hours;

          return (
            <span className="font-medium">
              {value?.toLocaleString()}{' '}
              {measureType === 'KILOMETERS' ? 'km' : 'h'}
            </span>
          );
        },
      },
      {
        header: 'Registrado',
        accessorKey: 'createdAt',
        cell: ({ getValue }) => {
          const value = getValue() as Date;
          return format(new Date(value), 'dd/MM/yyyy', { locale: es });
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const log = row.original;

          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 px-2"
                    onClick={() => onEdit(log)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 px-2 text-destructive hover:text-destructive"
                    onClick={() => onDelete(log.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          );
        },
      },
    ],
    [onEdit, onDelete]
  );

  const table = useReactTable({
    data: odometerLogs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilter(e.target.value);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Registros de Odómetro
          </h2>
          <p className="text-muted-foreground">
            Gestiona los registros de kilometraje y horas de los vehículos
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Registro
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Buscar por vehículo, conductor o fecha..."
          value={globalFilter}
          onChange={handleSearch}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="whitespace-nowrap">
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
                    <TableCell key={cell.id} className="whitespace-nowrap">
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
                  No se encontraron registros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Mostrando {table.getFilteredRowModel().rows.length} de{' '}
          {odometerLogs.length} registros
        </div>
      </div>
    </div>
  );
}
