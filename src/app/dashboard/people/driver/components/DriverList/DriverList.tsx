"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormAddDriver } from "../FormAddDriver";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";
import { DriverListProps } from "./DriverList.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function DriverList() {
  const [data, setData] = useState<DriverListProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { toast } = useToast();

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/people/drivers`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching Drivers: ", error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para ver los conductores",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Error",
        description: "No se pudieron cargar los conductores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleAddDriver = useCallback((newDriver: DriverListProps) => {
    setData((prevData) => [...prevData, newDriver]);
  }, []);

  const handleDeleteDriver = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este conductor?")) {
      return;
    }

    try {
      await axios.delete(`/api/people/drivers/${id}`);
      setData((prevData) => prevData.filter((driver) => driver.id !== id));
      
      toast({
        title: "Conductor eliminado",
        description: "El conductor fue eliminado exitosamente.",
      });
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el conductor",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<DriverListProps>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.getValue("email") as string | null;
        return email || "-";
      },
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string | null;
        return phone || "-";
      },
    },
    {
      accessorKey: "licenseNumber",
      header: "Núm. Licencia",
      cell: ({ row }) => {
        const license = row.getValue("licenseNumber") as string | null;
        return license || "-";
      },
    },
    {
      accessorKey: "licenseExpiry",
      header: "Vencimiento",
      cell: ({ row }) => {
        const expiry = row.getValue("licenseExpiry") as string | null;
        if (!expiry) return "-";
        
        const date = new Date(expiry);
        const now = new Date();
        const isExpired = date < now;
        const isExpiringSoon = date > now && date < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        return (
          <div className="flex flex-col">
            <span className={`text-sm ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : ''}`}>
              {format(date, "dd/MM/yyyy", { locale: es })}
            </span>
            {isExpired && <Badge variant="destructive" className="text-xs">Vencida</Badge>}
            {isExpiringSoon && <Badge variant="secondary" className="text-xs">Por vencer</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {status === "ACTIVE" ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de Creación",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt") as string);
        return format(date, "dd/MM/yyyy", { locale: es });
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const driver = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteDriver(driver.id)}
            >
              Eliminar
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
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Conductores</h2>
          <p className="text-muted-foreground">
            Gestiona los conductores de tu empresa
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Agregar Conductor
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
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
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
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
                  No hay conductores registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormAddDriver
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddDriver={handleAddDriver}
      />
    </div>
  );
}