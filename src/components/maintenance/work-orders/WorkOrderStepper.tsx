import { Check, Clock, FileText, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkOrderStatus } from '@prisma/client';

export const WORK_ORDER_STATUS_FLOW = [
  { id: 'PENDING', label: 'Planificación', icon: FileText },
  { id: 'PENDING_APPROVAL', label: 'Esperando Aprobación', icon: Clock },
  { id: 'IN_PROGRESS', label: 'En Progreso', icon: Wrench },
  { id: 'PENDING_INVOICE', label: 'Esperando Facturas', icon: Clock },
  { id: 'COMPLETED', label: 'Completada', icon: Check },
];

export function WorkOrderStepper({
  currentStatus,
}: {
  currentStatus: WorkOrderStatus;
}) {
  const currentIndex = WORK_ORDER_STATUS_FLOW.findIndex(
    s => s.id === currentStatus
  );

  if (currentStatus === 'CANCELLED' || currentStatus === 'REJECTED') {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg font-semibold flex items-center justify-center">
        {currentStatus === 'CANCELLED'
          ? '🔴 Orden Cancelada'
          : '🚫 Orden Rechazada'}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full relative pt-2 pb-6">
      <div className="absolute top-[22px] left-0 w-full h-[2px] bg-muted -z-10" />

      {WORK_ORDER_STATUS_FLOW.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div
            key={step.id}
            className="flex flex-col items-center gap-2 bg-background px-3 relative z-10 w-1/5"
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors bg-background',
                isCompleted
                  ? 'bg-primary border-primary text-primary-foreground'
                  : isCurrent
                    ? 'border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'border-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <step.icon className="w-4 h-4" />
              )}
            </div>
            <span
              className={cn(
                'text-xs font-semibold text-center mt-1 leading-tight',
                isCurrent ? 'text-primary' : 'text-muted-foreground',
                isCompleted && 'text-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
