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
    workOrderItems: Array<{
        id: string;
        itemSource: string;
        _count: { workOrderSubTasks: number };
        workOrderSubTasks: Array<{ id: string }>;
    }>;
};

type TallerCardProps = {
    workOrder: WorkOrderSummary;
    isSelected: boolean;
    onClick: () => void;
};

const statusConfig: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline' }> = {
    PENDING: { label: 'Pendiente', variant: 'secondary' },
    IN_PROGRESS: { label: 'En Trabajo', variant: 'default' },
    APPROVED: { label: 'Aprobada', variant: 'outline' },
};

const priorityConfig: Record<string, { label: string; variant: 'destructive' | 'outline' | 'secondary' }> = {
    HIGH: { label: 'Alta', variant: 'destructive' },
    MEDIUM: { label: 'Media', variant: 'outline' },
    LOW: { label: 'Baja', variant: 'secondary' },
};

export function TallerCard({ workOrder, isSelected, onClick }: TallerCardProps) {
    // Solo consideramos items internos para el taller
    const internalItems = workOrder.workOrderItems.filter(
        (i) => i.itemSource === 'INTERNAL_STOCK' || !i.itemSource
    );

    const totalCount = internalItems.reduce(
        (acc, item) => acc + item._count.workOrderSubTasks,
        0
    );
    const completedCount = internalItems.reduce(
        (acc, item) => acc + item.workOrderSubTasks.length,
        0
    );

    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <Card
            onClick={onClick}
            className={cn(
                'p-5 cursor-pointer transition-all hover:shadow-md border-2 h-full flex flex-col',
                isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-transparent'
            )}
        >
            <div className="space-y-4 flex-1">
                {/* Placa y Vehículo */}
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{workOrder.vehicle.licensePlate}</h2>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {workOrder.vehicle.brand.name} {workOrder.vehicle.line.name}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                        <Badge variant={statusConfig[workOrder.status]?.variant || 'outline'} className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-tight">
                            {statusConfig[workOrder.status]?.label || workOrder.status}
                        </Badge>
                        <Badge variant={priorityConfig[workOrder.priority]?.variant || 'outline'} className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-tight">
                            {priorityConfig[workOrder.priority]?.label || workOrder.priority}
                        </Badge>
                    </div>
                </div>

                {/* Título de la OT */}
                <div className="py-2.5 border-y border-dashed border-muted-foreground/20">
                    <p className="text-sm font-bold truncate leading-tight" title={workOrder.title}>
                        {workOrder.title}
                    </p>
                </div>

                {/* Progreso de Subtareas */}
                <div className="space-y-2 relative pt-2">
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="font-black text-muted-foreground uppercase tracking-widest text-[9px]">Progreso Taller</span>
                        <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">
                            {totalCount > 0 ? `${completedCount}/${totalCount}` : 'SIN TAREAS'}
                        </span>
                    </div>
                    {totalCount > 0 ? (
                        <Progress value={progressPercent} className="h-1.5" />
                    ) : (
                        <div className="h-1.5 w-full bg-muted rounded-full" />
                    )}
                </div>
            </div>

            {/* Footer: Técnico */}
            <div className="flex items-center gap-3 pt-4 mt-auto border-t">
                <div className="p-1.5 bg-secondary rounded-full shrink-0">
                    <User className="h-3.5 w-3.5 text-secondary-foreground" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter leading-none mb-0.5">Asignado a</span>
                    <span className="text-[11px] font-bold text-foreground truncate uppercase tracking-tight leading-none">
                        {workOrder.technician ? workOrder.technician.name : 'PENDIENTE'}
                    </span>
                </div>
            </div>
        </Card>
    );
}
