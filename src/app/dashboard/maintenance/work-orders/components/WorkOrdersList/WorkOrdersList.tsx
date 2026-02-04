"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Play, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type WorkOrder = {
  id: number;
  title: string;
  status: string;
  mantType: string;
  priority: string;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  vehicle: {
    id: number;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  technician: {
    id: number;
    name: string;
  } | null;
  provider: {
    id: number;
    name: string;
  } | null;
  workOrderItems: Array<{
    id: number;
    description: string;
    totalCost: number;
    status: string;
  }>;
};

type WorkOrdersListProps = {
  workOrders: WorkOrder[];
  isLoading: boolean;
  onViewDetail?: (id: number) => void;
  onStartWork?: (id: number) => void;
};

const statusConfig = {
  PENDING: { label: "Abierta", variant: "secondary" as const, color: "bg-blue-100 text-blue-700 border-blue-200" },
  IN_PROGRESS: { label: "En Trabajo", variant: "default" as const, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  PENDING_INVOICE: { label: "Por Cerrar", variant: "outline" as const, color: "bg-orange-100 text-orange-700 border-orange-200" },
  COMPLETED: { label: "Cerrada", variant: "default" as const, color: "bg-green-100 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelada", variant: "outline" as const, color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const mantTypeConfig = {
  PREVENTIVE: { label: "Preventivo", color: "text-blue-600" },
  CORRECTIVE: { label: "Correctivo", color: "text-orange-600" },
  PREDICTIVE: { label: "Predictivo", color: "text-purple-600" },
};

const priorityConfig = {
  LOW: { label: "Baja", color: "text-gray-600" },
  MEDIUM: { label: "Media", color: "text-yellow-600" },
  HIGH: { label: "Alta", color: "text-red-600" },
  CRITICAL: { label: "Crítica", color: "text-red-700 font-bold" },
};

export function WorkOrdersList({
  workOrders,
  isLoading,
  onViewDetail,
  onStartWork,
}: WorkOrdersListProps) {
  const router = useRouter();
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (workOrders.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground text-lg">
          No hay órdenes de trabajo registradas
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Crea órdenes desde las alertas de mantenimiento
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehículo</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead className="text-right">Costo Est.</TableHead>
            <TableHead className="text-right">Costo Real</TableHead>
            <TableHead>Fecha Creación</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders.map((wo) => {
            const statusInfo = statusConfig[wo.status as keyof typeof statusConfig];
            const mantTypeInfo = mantTypeConfig[wo.mantType as keyof typeof mantTypeConfig];
            const priorityInfo = priorityConfig[wo.priority as keyof typeof priorityConfig];

            return (
              <TableRow key={wo.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{wo.vehicle.licensePlate}</div>
                    <div className="text-xs text-muted-foreground">
                      {wo.vehicle.brand.name} {wo.vehicle.line.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <div className="font-medium truncate">{wo.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {wo.workOrderItems.length} items
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={mantTypeInfo.color}>
                    {mantTypeInfo.label}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={priorityInfo.color}>
                    {priorityInfo.label}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo?.color || 'bg-gray-100 text-gray-700'}`}>
                    {statusInfo?.label || wo.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {wo.technician ? (
                      <div>
                        <div className="font-medium">{wo.technician.name}</div>
                        <div className="text-xs text-muted-foreground">Técnico</div>
                      </div>
                    ) : wo.provider ? (
                      <div>
                        <div className="font-medium">{wo.provider.name}</div>
                        <div className="text-xs text-muted-foreground">Proveedor</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No asignado</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {wo.estimatedCost
                    ? `$${wo.estimatedCost.toLocaleString("es-CO")}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {wo.actualCost
                    ? `$${wo.actualCost.toLocaleString("es-CO")}`
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDistanceToNow(new Date(wo.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetail?.(wo.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalle
                      </DropdownMenuItem>
                      {wo.status === "PENDING" && onStartWork && (
                        <DropdownMenuItem onClick={() => onStartWork(wo.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Iniciar Trabajo
                        </DropdownMenuItem>
                      )}
                      {(wo.status === "IN_PROGRESS" || wo.status === "PENDING_INVOICE") && (
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/invoices/new?workOrderId=${wo.id}`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Cargar Factura
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
