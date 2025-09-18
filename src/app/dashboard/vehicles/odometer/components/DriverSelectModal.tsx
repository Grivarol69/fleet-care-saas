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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from "lucide-react";
import { Driver } from "./types";

interface DriverSelectModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  drivers: Driver[];
  onSelectDriver: (driver: Driver | null) => void;
}

export function DriverSelectModal({
  isOpen,
  setIsOpen,
  drivers,
  onSelectDriver,
}: DriverSelectModalProps) {
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Driver>[]>(
    () => [
      {
        header: "Nombre",
        accessorKey: "name",
      },
      {
        header: "Email",
        accessorKey: "email",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        header: "Teléfono",
        accessorKey: "phone",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        header: "N° Licencia",
        accessorKey: "licenseNumber",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        header: "Vence Licencia",
        accessorKey: "licenseExpiry",
        cell: ({ getValue }) => {
          const value = getValue() as Date | string | null;
          return value ? new Date(value).toLocaleDateString() : "-";
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: drivers,
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

  const handleClearSelection = () => {
    onSelectDriver(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Seleccionar Conductor</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Buscar conductor por nombre, email o licencia..."
            value={globalFilter}
            onChange={handleSearch}
          />

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClearSelection}>
              <User className="h-4 w-4 mr-2" />
              Sin conductor
            </Button>
          </div>

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
                      onClick={() => onSelectDriver(row.original)}
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
                      No se encontraron conductores.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}