'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

type WorkOrderSummary = {
  id: string;
  title: string;
  status: string;
  priority: string;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  technician: { id: string; name: string } | null;
  workOrderItems: Array<{ id: string; status: string }>;
};

type TallerCardProps = {
  workOrder: WorkOrderSummary;
  isSelected: boolean;
  onClick: () => void;
};

const statusConfig: Record<
  string,
  { label: string; variant: 'secondary' | 'default' | 'outline' }
> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  IN_PROGRESS: { label: 'En Trabajo', variant: 'default' },
  APPROVED: { label: 'Aprobada', variant: 'outline' },
};

const priorityConfig: Record<
  string,
  { label: string; variant: 'destructive' | 'outline' | 'secondary' }
> = {
  HIGH: { label: 'Alta', variant: 'destructive' },
  MEDIUM: { label: 'Media', variant: 'outline' },
  LOW: { label: 'Baja', variant: 'secondary' },
};

export function TallerCard({
  workOrder,
  isSelected,
  onClick,
}: TallerCardProps) {
  const totalCount = workOrder.workOrderItems.length;
  const completedCount = workOrder.workOrderItems.filter(
    i => i.status === 'COMPLETED'
  ).length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-5 cursor-pointer transition-all hover:shadow-md border-2',
        isSelected
          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
          : 'border-transparent'
      )}
    >
      <div className="space-y-4">
        {/* Placa y Vehículo */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase">
              {workOrder.vehicle.licensePlate}
            </h2>
            <p className="text-sm text-muted-foreground">
              {workOrder.vehicle.brand.name} {workOrder.vehicle.line.name}
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge
              variant={statusConfig[workOrder.status]?.variant || 'outline'}
            >
              {statusConfig[workOrder.status]?.label || workOrder.status}
            </Badge>
            <Badge
              variant={priorityConfig[workOrder.priority]?.variant || 'outline'}
            >
              {priorityConfig[workOrder.priority]?.label || workOrder.priority}
            </Badge>
          </div>
        </div>

        {/* Título de la OT */}
        <div className="border-t border-b py-2">
          <p className="text-sm font-semibold truncate" title={workOrder.title}>
            {workOrder.title}
          </p>
        </div>

        {/* Progreso de Subtareas */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium">Progreso de tareas</span>
            <span className="text-muted-foreground">
              {totalCount > 0
                ? `${completedCount} / ${totalCount} completadas`
                : 'Sin subtareas'}
            </span>
          </div>
          {totalCount > 0 ? (
            <Progress value={progressPercent} className="h-2" />
          ) : (
            <p className="text-[10px] italic text-muted-foreground py-1">
              Sin subtareas registradas
            </p>
          )}
        </div>

        {/* Técnico */}
        <div className="flex items-center gap-2 pt-1">
          <div className="p-1 bg-muted rounded-full">
            <User className="h-3 w-3 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {workOrder.technician
              ? `Téc: ${workOrder.technician.name}`
              : 'Sin técnico asignado'}
          </span>
        </div>
      </div>
    </Card>
  );
}
