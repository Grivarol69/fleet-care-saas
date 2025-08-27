"use client";

import { useState, useEffect } from "react";
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
import { FormAddType } from "../FormAddType";
import { FormEditType } from "../FormEditType";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { TypeListProps } from "./TypeList.types";

export function TypeList() {
  const [data, setData] = useState<TypeListProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<TypeListProps | null>(null);

  const { toast } = useToast();

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/vehicles/types`);
      setData(response.data);
    } catch (error: any) {
      console.error("Error fetching Types: ", error);

      // Manejo específico de errores de autenticación
      if (error.response?.status === 401) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para ver las marcas",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Error al cargar marcas",
        description: "Por favor intenta de nuevo más tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleEdit = (type: TypeListProps) => {
    setEditingType(type);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/vehicles/types/${id}`);
      setData(data.filter((type) => type.id !== id));
      toast({
        title: "Tipo eliminado",
        description: "El tipo ha sido eliminado exitosamente",
      });
    } catch (error: any) {
      console.error("Error deleting Type:", error);

      // Manejo específico de errores
      if (error.response?.status === 409) {
        toast({
          title: "No se puede eliminar",
          description: "La marca tiene vehículos o líneas asociadas",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Error al eliminar tipo",
        description: "Por favor intenta de nuevo más tarde",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<TypeListProps>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      id: "actions",
      cell: ({ row }) => (
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
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
      <Button onClick={() => setIsAddDialogOpen(true)} className="mb-4">
        Agregar Tipo
      </Button>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
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
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No hay tipos registrados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <FormAddType
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddType={(newType) => setData([...data, newType])}
      />

      {editingType && (
        <FormEditType
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          type={editingType}
          onEditType={(editedType) => {
            setData(
              data.map((type) =>
                type.id === editedType.id ? editedType : type
              )
            );
          }}
        />
      )}
    </div>
  );
}
