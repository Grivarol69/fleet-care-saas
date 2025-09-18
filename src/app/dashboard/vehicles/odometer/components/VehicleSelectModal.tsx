"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Vehicle } from "./types";

interface VehicleSelectModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export function VehicleSelectModal({
  isOpen,
  setIsOpen,
  vehicles,
  onSelectVehicle,
}: VehicleSelectModalProps) {
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        header: "Placa",
        accessorKey: "licensePlate",
      },
      {
        header: "Marca",
        accessorFn: (row) => row.brand?.name || "N/A",
        id: "brandName",
      },
      {
        header: "Línea",
        accessorFn: (row) => row.line?.name || "N/A",
        id: "lineName",
      },
      {
        header: "Tipo",
        accessorFn: (row) => row.type?.name || "N/A",
        id: "typeName",
      },
      {
        header: "Año",
        accessorKey: "year",
      },
      {
        header: "Kilometraje",
        accessorKey: "mileage",
        cell: ({ getValue }) => {
          const value = getValue() as number;
          return `${value?.toLocaleString() || "0"} km`;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: vehicles,
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Seleccionar Vehículo</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar vehículo por placa, marca, línea..."
          value={globalFilter}
          onChange={handleSearch}
          className="mb-4"
        />
        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
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
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => onSelectVehicle(row.original)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No se encontraron vehículos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}