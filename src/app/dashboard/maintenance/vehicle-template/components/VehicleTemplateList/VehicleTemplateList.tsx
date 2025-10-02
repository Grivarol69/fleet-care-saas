"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  getFilteredRowModel,
  getSortedRowModel,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, Plus } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";

import { VehicleMantPlan } from "../types";
import { FormAddVehicleTemplate } from "../FormAddVehicleTemplate";
import { FormEditVehicleTemplate } from "../FormEditVehicleTemplate";
import { MaintenanceItemsTable } from "../MaintenanceItemsTable";

export function VehicleTemplateList() {
  const [data, setData] = useState<VehicleMantPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicleMantPlan, setEditingVehicleMantPlan] = useState<VehicleMantPlan | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleMantPlan | null>(null);

  const { toast } = useToast();

  const fetchVehicleMantPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/maintenance/vehicle-template`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching vehicle maintenance plans:", error);
      toast({
        title: "Error al cargar los datos",
        description: "No se pudieron cargar los planes de mantenimiento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVehicleMantPlans();
  }, [fetchVehicleMantPlans]);

  const handleEdit = (item: VehicleMantPlan) => {
    setEditingVehicleMantPlan(item);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este plan de mantenimiento?")) {
      return;
    }

    try {
      await axios.delete(`/api/maintenance/vehicle-template/${id}`);
      setData(data.filter((item) => item.id !== id));
      toast({
        title: "Plan eliminado",
        description: "El plan de mantenimiento ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error("Error deleting vehicle maintenance plan:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el plan de mantenimiento",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<VehicleMantPlan>[] = [
    {
      accessorFn: (row) => row.vehicle?.licensePlate || "N/A",
      id: "vehiclePlate",
      header: "Placa Vehículo",
    },
    {
      accessorFn: (row) => row.vehicle?.brand?.name || "N/A",
      id: "vehicleBrand",
      header: "Marca",
    },
    {
      accessorFn: (row) => row.vehicle?.line?.name || "N/A",
      id: "vehicleLine", 
      header: "Línea",
    },
    {
      accessorFn: (row) => row.mantPlan?.name || "N/A",
      id: "planName",
      header: "Plan",
    },
    {
      accessorKey: "assignedAt",
      header: "Fecha Asignación",
      cell: ({ getValue }) => {
        const date = getValue() as Date;
        return new Date(date).toLocaleDateString('es-ES');
      },
    },
    {
      accessorKey: "lastKmCheck",
      header: "Último KM",
      cell: ({ getValue }) => {
        const value = getValue() as number | null;
        return value?.toLocaleString() || "Sin registros";
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return (
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {status === "ACTIVE" ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleRowClick = (vehicle: VehicleMantPlan) => {
    setSelectedVehicle(vehicle);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Cargando planes de mantenimiento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">
            Plantillas Asignadas ({data.length})
          </TabsTrigger>
          <TabsTrigger value="maintenance-items">
            Items de Mantenimiento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Planes de Mantenimiento Asignados</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Asignar Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <Input
              placeholder="Buscar por placa, marca, plan..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
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
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedVehicle?.id === row.original.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                      }`}
                      onClick={() => handleRowClick(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No se encontraron planes de mantenimiento asignados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FormAddVehicleTemplate
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddVehicleTemplate={(newPlan) => {
          setData([...data, newPlan]);
          fetchVehicleMantPlans(); // Refrescar datos
        }}
      />

      {editingVehicleMantPlan && (
        <FormEditVehicleTemplate
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          item={editingVehicleMantPlan}
          onEditVehicleTemplate={(editedPlan) => {
            setData(
              data.map((item) =>
                item.id === editedPlan.id ? editedPlan : item
              )
            );
            fetchVehicleMantPlans(); // Refrescar datos
          }}
        />
      )}
        </TabsContent>

        <TabsContent value="maintenance-items" className="space-y-4">
          {selectedVehicle ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="px-3 py-1">
                        📋 Vehículo Seleccionado
                      </Badge>
                      <div>
                        <div className="font-semibold">{selectedVehicle.vehicle?.licensePlate}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedVehicle.vehicle?.brand?.name} {selectedVehicle.vehicle?.line?.name} - Plan: {selectedVehicle.mantPlan?.name}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedVehicle(null)}
                    >
                      Limpiar Selección
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <MaintenanceItemsTable 
                vehicleId={selectedVehicle.vehicle?.id} 
              />
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <div className="text-4xl">🚗</div>
                  <div>
                    <h3 className="text-lg font-semibold">Selecciona un Vehículo</h3>
                    <p className="text-muted-foreground">
                      Haz clic en un vehículo del tab &quot;Plantillas Asignadas&quot; para ver sus items de mantenimiento
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}