"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/hooks/use-toast";
import axios from "axios";
import {
  Truck,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Filter,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickOdometerModal } from "./QuickOdometerModal";
import { useRouter } from "next/navigation";
import Image from "next/image";

type FleetVehicleStatus = {
  id: number;
  licensePlate: string;
  photo: string | null;
  brandName: string;
  lineName: string;
  typeName: string;
  currentMileage: number;
  maintenanceAlerts: {
    total: number;
    critical: number;
    warning: number;
  };
  odometer: {
    lastUpdate: Date | null;
    daysSinceUpdate: number;
    status: "OK" | "WARNING" | "CRITICAL";
  };
  overallStatus: "OK" | "WARNING" | "CRITICAL";
  driverName: string | null;
};

type FleetStatusData = {
  vehicles: FleetVehicleStatus[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    ok: number;
  };
  thresholds: {
    warningDays: number;
    criticalDays: number;
  };
};

const statusConfig = {
  CRITICAL: {
    label: "Crítico",
    color: "bg-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-l-red-500",
    textColor: "text-red-700",
    icon: AlertTriangle,
  },
  WARNING: {
    label: "Atención",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    borderColor: "border-l-yellow-500",
    textColor: "text-yellow-700",
    icon: Clock,
  },
  OK: {
    label: "Al día",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-l-green-500",
    textColor: "text-green-700",
    icon: CheckCircle2,
  },
};

export function FleetStatusBoard() {
  const { toast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<FleetStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "OK">("ALL");
  const [odometerModalOpen, setOdometerModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<{
    id: number;
    licensePlate: string;
    currentMileage: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/dashboard/fleet-status");
      setData(response.data);
    } catch (error) {
      console.error("Error fetching fleet status:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el estado de la flota",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenOdometer = (vehicle?: FleetVehicleStatus) => {
    if (vehicle) {
      setSelectedVehicle({
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        currentMileage: vehicle.currentMileage,
      });
    } else {
      setSelectedVehicle(null);
    }
    setOdometerModalOpen(true);
  };

  const handleOdometerSuccess = () => {
    fetchData(); // Refrescar datos
  };

  const goToAlerts = (vehicleId: number) => {
    router.push(`/dashboard/maintenance/alerts?vehicleId=${vehicleId}`);
  };

  const filteredVehicles = data?.vehicles.filter((v) => {
    if (filter === "ALL") return true;
    return v.overallStatus === filter;
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header azul suave */}
        <CardHeader className="bg-blue-500 text-white pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Estado de la Flota</CardTitle>
                <p className="text-blue-100 text-sm mt-0.5">
                  Monitoreo en tiempo real de {data.summary.total} vehículos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchData()}
                className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
              <Button
                onClick={() => handleOpenOdometer()}
                className="gap-2 bg-white text-blue-600 hover:bg-blue-50"
              >
                <Zap className="h-4 w-4" />
                Registrar Odómetro
              </Button>
            </div>
          </div>

          {/* Summary Pills */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter("ALL")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filter === "ALL"
                  ? "bg-white text-blue-600"
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              Todos ({data.summary.total})
            </button>
            <button
              onClick={() => setFilter("CRITICAL")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                filter === "CRITICAL"
                  ? "bg-red-500 text-white"
                  : "bg-red-400/30 text-white hover:bg-red-400/50"
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Críticos ({data.summary.critical})
            </button>
            <button
              onClick={() => setFilter("WARNING")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filter === "WARNING"
                  ? "bg-yellow-500 text-white"
                  : "bg-yellow-400/30 text-white hover:bg-yellow-400/50"
              )}
            >
              Atención ({data.summary.warning})
            </button>
            <button
              onClick={() => setFilter("OK")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filter === "OK"
                  ? "bg-green-500 text-white"
                  : "bg-green-400/30 text-white hover:bg-green-400/50"
              )}
            >
              Al día ({data.summary.ok})
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-280px)] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-blue-50 z-10">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-center">Mantenimiento</TableHead>
                  <TableHead className="text-center">Odómetro</TableHead>
                  <TableHead className="text-center">Km Actual</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right w-[100px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles?.map((vehicle) => {
                  const config = statusConfig[vehicle.overallStatus];
                  const StatusIcon = config.icon;

                  return (
                    <TableRow
                      key={vehicle.id}
                      className={cn(
                        "transition-all hover:shadow-md border-l-4",
                        config.borderColor,
                        config.bgColor,
                        "hover:scale-[1.01] cursor-pointer"
                      )}
                      onClick={() => handleOpenOdometer(vehicle)}
                    >
                      {/* Indicador visual */}
                      <TableCell className="pr-0">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            config.color,
                            vehicle.overallStatus === "CRITICAL" && "animate-pulse"
                          )}
                        />
                      </TableCell>

                      {/* Vehículo */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden">
                            {vehicle.photo ? (
                              <Image
                                src={vehicle.photo}
                                alt={vehicle.licensePlate}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Truck className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-base font-mono">
                              {vehicle.licensePlate}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {vehicle.brandName} {vehicle.lineName}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Mantenimiento */}
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="inline-flex items-center gap-2 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (vehicle.maintenanceAlerts.total > 0) {
                                    goToAlerts(vehicle.id);
                                  }
                                }}
                              >
                                {vehicle.maintenanceAlerts.total === 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 bg-green-50 text-green-700 border-green-200"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    OK
                                  </Badge>
                                ) : (
                                  <div className="flex gap-1">
                                    {vehicle.maintenanceAlerts.critical > 0 && (
                                      <Badge
                                        variant="destructive"
                                        className="gap-1"
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                        {vehicle.maintenanceAlerts.critical}
                                      </Badge>
                                    )}
                                    {vehicle.maintenanceAlerts.warning > 0 && (
                                      <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                                        <Clock className="h-3 w-3" />
                                        {vehicle.maintenanceAlerts.warning}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {vehicle.maintenanceAlerts.total === 0 ? (
                                "Sin alertas de mantenimiento"
                              ) : (
                                <div>
                                  <p>
                                    {vehicle.maintenanceAlerts.critical} críticas,{" "}
                                    {vehicle.maintenanceAlerts.warning} en atención
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Click para ver detalles
                                  </p>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* Odómetro */}
                      <TableCell className="text-center">
                        {vehicle.odometer.status === "OK" ? (
                          <Badge
                            variant="outline"
                            className="gap-1 bg-green-50 text-green-700 border-green-200"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {vehicle.odometer.daysSinceUpdate === 0
                              ? "Hoy"
                              : `Hace ${vehicle.odometer.daysSinceUpdate}d`}
                          </Badge>
                        ) : vehicle.odometer.status === "WARNING" ? (
                          <Badge className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                            <Clock className="h-3 w-3" />
                            {vehicle.odometer.daysSinceUpdate}d sin reporte
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="gap-1 animate-pulse"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {vehicle.odometer.daysSinceUpdate === 999
                              ? "Sin registro"
                              : `${vehicle.odometer.daysSinceUpdate}d sin reporte`}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Km Actual */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Gauge className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {vehicle.currentMileage.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground text-sm">km</span>
                        </div>
                      </TableCell>

                      {/* Estado */}
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "gap-1 font-medium",
                            vehicle.overallStatus === "CRITICAL" &&
                              "bg-red-500 hover:bg-red-600",
                            vehicle.overallStatus === "WARNING" &&
                              "bg-yellow-500 hover:bg-yellow-600",
                            vehicle.overallStatus === "OK" &&
                              "bg-green-500 hover:bg-green-600"
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>

                      {/* Acción */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOdometer(vehicle);
                          }}
                          className="gap-1 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Zap className="h-4 w-4" />
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredVehicles?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Filter className="h-8 w-8" />
                        <p>No hay vehículos con este estado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de registro rápido */}
      <QuickOdometerModal
        open={odometerModalOpen}
        onOpenChange={setOdometerModalOpen}
        preselectedVehicle={selectedVehicle}
        onSuccess={handleOdometerSuccess}
      />
    </>
  );
}
