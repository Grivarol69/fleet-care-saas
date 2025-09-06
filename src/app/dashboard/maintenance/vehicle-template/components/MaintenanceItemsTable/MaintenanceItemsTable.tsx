"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Edit, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";

import { MaintenanceItemsTableProps, MaintenanceItemCalculated } from "./types";
import {
  calculateMaintenanceItemData,
  getStatusColor,
  getMantTypeIcon,
  getMantTypeText,
  getStatusText,
  formatKilometers,
  formatDate,
} from "./utils";

export function MaintenanceItemsTable({ vehicleId, mantPlanId }: MaintenanceItemsTableProps) {
  const [data, setData] = useState<MaintenanceItemCalculated[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { toast } = useToast();

  const fetchMaintenanceItems = async () => {
    try {
      setIsLoading(true);
      
      // Construir URL con filtros opcionales
      let url = "/api/maintenance/items/all";
      const params = new URLSearchParams();
      
      if (vehicleId) params.append("vehicleId", vehicleId.toString());
      if (mantPlanId) params.append("mantPlanId", mantPlanId.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      
      // Procesar datos con cálculos
      const processedData = response.data.map(calculateMaintenanceItemData);
      setData(processedData);
    } catch (error) {
      console.error("Error fetching maintenance items:");
      toast({
        title: "Error al cargar items",
        description: "No se pudieron cargar los items de mantenimiento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceItems();
  }, [vehicleId, mantPlanId]);

  // Filtrar datos por estado
  const filteredData = useMemo(() => {
    if (statusFilter === "all") return data;
    return data.filter(item => {
      if (statusFilter === "pending") return item.status === "PENDING";
      if (statusFilter === "in-progress") return item.status === "IN_PROGRESS";
      if (statusFilter === "completed") return item.status === "COMPLETED";
      if (statusFilter === "critical") return item.alertLevel === "CRITICAL";
      if (statusFilter === "upcoming") return item.alertLevel === "HIGH" || item.alertLevel === "MEDIUM";
      return true;
    });
  }, [data, statusFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const pending = data.filter(item => item.status === "PENDING").length;
    const inProgress = data.filter(item => item.status === "IN_PROGRESS").length;
    const completed = data.filter(item => item.status === "COMPLETED").length;
    const critical = data.filter(item => item.alertLevel === "CRITICAL").length;
    const upcoming = data.filter(item => item.alertLevel === "HIGH" || item.alertLevel === "MEDIUM").length;
    
    return { pending, inProgress, completed, critical, upcoming };
  }, [data]);

  const columns: ColumnDef<MaintenanceItemCalculated>[] = [
    {
      accessorFn: (row) => row.vehicleMantPlan.vehicle.licensePlate,
      id: "vehicle",
      header: "Vehículo",
      cell: ({ row }) => {
        const vehicle = row.original.vehicleMantPlan.vehicle;
        return (
          <div className="font-medium">
            <div>{vehicle.licensePlate}</div>
            <div className="text-sm text-muted-foreground">
              {vehicle.brand?.name} {vehicle.line?.name}
            </div>
          </div>
        );
      },
    },
    {
      accessorFn: (row) => row.mantItem.name,
      id: "mantItem",
      header: "Item de Mantenimiento",
      cell: ({ row }) => {
        const item = row.original.mantItem;
        return (
          <div>
            <div className="font-medium flex items-center gap-2">
              <span>{getMantTypeIcon(item.mantType)}</span>
              {item.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {getMantTypeText(item.mantType)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "executionMileage",
      header: "KM Programado",
      cell: ({ getValue }) => formatKilometers(getValue() as number),
    },
    {
      accessorKey: "currentVehicleKm",
      header: "KM Actual",
      cell: ({ getValue }) => formatKilometers(getValue() as number),
    },
    {
      accessorKey: "kmUntilDue",
      header: "KM Restantes",
      cell: ({ getValue, row }) => {
        const kmRemaining = getValue() as number;
        const isOverdue = row.original.isOverdue;
        
        return (
          <div className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
            {isOverdue ? 'VENCIDO' : formatKilometers(kmRemaining)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ getValue, row }) => {
        const status = getValue() as string;
        const alertLevel = row.original.alertLevel;
        
        return (
          <div className="space-y-1">
            <Badge variant={getStatusColor(status)}>
              {getStatusText(status)}
            </Badge>
            {alertLevel === 'CRITICAL' && (
              <Badge variant="destructive" className="ml-1">
                🚨 CRÍTICO
              </Badge>
            )}
            {alertLevel === 'HIGH' && status === 'PENDING' && (
              <Badge variant="destructive" className="ml-1">
                ⚠️ PRÓXIMO
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "estimatedDate",
      header: "Fecha Estimada",
      cell: ({ getValue, row }) => {
        const date = getValue() as Date;
        const isOverdue = row.original.isOverdue;
        
        return (
          <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {isOverdue ? 'VENCIDO' : formatDate(date)}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleView(row.original.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original.id)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {row.original.status === 'PENDING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleComplete(row.original.id)}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleView = (itemId: number) => {
    // TODO: Implementar vista detallada
    console.log("View item:", itemId);
  };

  const handleEdit = (itemId: number) => {
    // TODO: Implementar edición
    console.log("Edit item:", itemId);
  };

  const handleComplete = async (itemId: number) => {
    try {
      await axios.patch(`/api/maintenance/items/${itemId}/complete`);
      await fetchMaintenanceItems(); // Refrescar datos
      toast({
        title: "Item completado",
        description: "El item de mantenimiento ha sido marcado como completado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar el item de mantenimiento",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p>Cargando items de mantenimiento...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Críticos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.upcoming}</div>
            <div className="text-sm text-muted-foreground">Próximos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">En Progreso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pendientes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completados</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de filtrado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Items de Mantenimiento ({filteredData.length})</span>
            <div className="flex space-x-2">
              <Input
                placeholder="Buscar por vehículo o item..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="critical">🚨 Críticos</SelectItem>
                  <SelectItem value="upcoming">⚠️ Próximos</SelectItem>
                  <SelectItem value="in-progress">🔄 En Progreso</SelectItem>
                  <SelectItem value="pending">⏳ Pendientes</SelectItem>
                  <SelectItem value="completed">✅ Completados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <TableRow key={row.id}>
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
                      <div className="flex flex-col items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p>No se encontraron items de mantenimiento.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}