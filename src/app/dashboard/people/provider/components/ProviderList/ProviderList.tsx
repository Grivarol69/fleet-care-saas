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
import { FormAddProvider } from "../FormAddProvider";
import { FormEditProvider } from "../FormEditProvider";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";
import { ProviderListProps } from "./ProviderList.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ProviderList() {
  const [data, setData] = useState<ProviderListProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderListProps | null>(null);

  const { toast } = useToast();

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/people/providers`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching Providers: ", error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para ver los proveedores",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Error",
        description: "No se pudieron cargar los proveedores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAddProvider = useCallback((newProvider: ProviderListProps) => {
    setData((prevData) => [...prevData, newProvider]);
  }, []);

  const handleEditProvider = useCallback((updatedProvider: ProviderListProps) => {
    setData((prevData) =>
      prevData.map((provider) =>
        provider.id === updatedProvider.id ? updatedProvider : provider
      )
    );
  }, []);

  const handleDeleteProvider = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este proveedor?")) {
      return;
    }

    try {
      await axios.delete(`/api/people/providers/${id}`);
      setData((prevData) => prevData.filter((provider) => provider.id !== id));
      
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor fue eliminado exitosamente.",
      });
    } catch (error) {
      console.error("Error deleting provider:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proveedor",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (provider: ProviderListProps) => {
    setEditingProvider(provider);
    setIsEditDialogOpen(true);
  };

  const columns: ColumnDef<ProviderListProps>[] = [
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
      accessorKey: "address",
      header: "Dirección",
      cell: ({ row }) => {
        const address = row.getValue("address") as string | null;
        return address ? (
          <div className="max-w-[200px] truncate" title={address}>
            {address}
          </div>
        ) : "-";
      },
    },
    {
      accessorKey: "specialty",
      header: "Especialidad",
      cell: ({ row }) => {
        const specialty = row.getValue("specialty") as string | null;
        return specialty || "-";
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
        const provider = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(provider)}
            >
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteProvider(provider.id)}
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
          <h2 className="text-2xl font-bold">Proveedores</h2>
          <p className="text-muted-foreground">
            Gestiona los proveedores de tu empresa
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Agregar Proveedor
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
                  No hay proveedores registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormAddProvider
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddProvider={handleAddProvider}
      />

      {editingProvider && (
        <FormEditProvider
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          onEditProvider={handleEditProvider}
          defaultValues={editingProvider}
        />
      )}
    </div>
  );
}