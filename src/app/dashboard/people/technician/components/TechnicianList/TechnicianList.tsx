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
import { FormAddTechnician } from "../FormAddTechnician";
import { FormEditTechnician } from "../FormEditTechnician";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";
import { TechnicianListProps } from "./TechnicianList.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function TechnicianList() {
  const [data, setData] = useState<TechnicianListProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<TechnicianListProps | null>(null);

  const { toast } = useToast();

  const fetchTechnicians = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/people/technicians`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching Technicians: ", error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para ver los técnicos",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Error",
        description: "No se pudieron cargar los técnicos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const handleAddTechnician = useCallback((newTechnician: TechnicianListProps) => {
    setData((prevData) => [...prevData, newTechnician]);
  }, []);

  const handleEditTechnician = useCallback((updatedTechnician: TechnicianListProps) => {
    setData((prevData) =>
      prevData.map((technician) =>
        technician.id === updatedTechnician.id ? updatedTechnician : technician
      )
    );
  }, []);

  const handleDeleteTechnician = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este técnico?")) {
      return;
    }

    try {
      await axios.delete(`/api/people/technicians/${id}`);
      setData((prevData) => prevData.filter((technician) => technician.id !== id));
      
      toast({
        title: "Técnico eliminado",
        description: "El técnico fue eliminado exitosamente.",
      });
    } catch (error) {
      console.error("Error deleting technician:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el técnico",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (technician: TechnicianListProps) => {
    setEditingTechnician(technician);
    setIsEditDialogOpen(true);
  };

  const columns: ColumnDef<TechnicianListProps>[] = [
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
        const technician = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(technician)}
            >
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteTechnician(technician.id)}
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
          <h2 className="text-2xl font-bold">Técnicos</h2>
          <p className="text-muted-foreground">
            Gestiona los técnicos de tu empresa
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Agregar Técnico
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
                  No hay técnicos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormAddTechnician
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddTechnician={handleAddTechnician}
      />

      {editingTechnician && (
        <FormEditTechnician
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          onEditTechnician={handleEditTechnician}
          defaultValues={editingTechnician}
        />
      )}
    </div>
  );
}