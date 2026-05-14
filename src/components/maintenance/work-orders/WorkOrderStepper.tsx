import {
  Check,
  Wrench,
  Search,
  ClipboardList,
  ShoppingCart,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkOrderStatus } from '@prisma/client';

// Maps each status to its wizard step index (0-based)
const STATUS_TO_STEP_INDEX: Partial<Record<WorkOrderStatus, number>> = {
  OPENING: 0,
  INSPECTING: 1,
  DRAFTING: 2,
  PENDING: 2,
  APPROVED: 3,
  COMPLETED: 3,
  CLOSED: 3,
};

export const WIZARD_STEPS = [
  { id: 'OPENING', label: 'Apertura', icon: Wrench },
  { id: 'INSPECTING', label: 'Inspección', icon: Search },
  { id: 'DRAFTING', label: 'Confección', icon: ClipboardList },
  { id: 'APPROVED', label: 'Órdenes de Compra', icon: ShoppingCart },
];

// Legacy 4-step flow for non-wizard OTs
const LEGACY_STEPS = [
  { id: 'PENDING', label: 'Planificación', icon: ClipboardList },
  { id: 'APPROVED', label: 'Aprobada', icon: Check },
  { id: 'COMPLETED', label: 'Completada', icon: Check },
  { id: 'CLOSED', label: 'Cerrada', icon: Archive },
];

function isWizardStatus(status: WorkOrderStatus): boolean {
  return ['OPENING', 'INSPECTING', 'DRAFTING'].includes(status);
}

export function WorkOrderStepper({
  currentStatus,
}: {
  currentStatus: WorkOrderStatus;
}) {
  if (currentStatus === 'CANCELLED' || currentStatus === 'REJECTED') {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg font-semibold flex items-center justify-center">
        {currentStatus === 'CANCELLED' ? 'Orden Cancelada' : 'Orden Rechazada'}
      </div>
    );
  }

  // Use wizard flow for new-style OTs (OPENING/INSPECTING/DRAFTING) and
  // for APPROVED/COMPLETED/CLOSED that came through the wizard
  const useWizardFlow =
    isWizardStatus(currentStatus) ||
    ['APPROVED', 'COMPLETED', 'CLOSED', 'PENDING'].includes(currentStatus);

  const steps = useWizardFlow ? WIZARD_STEPS : LEGACY_STEPS;
  const currentIndex = STATUS_TO_STEP_INDEX[currentStatus] ?? 0;

  return (
    <div className="flex items-center justify-between w-full relative pt-2 pb-6 px-4">
      <div className="absolute top-[22px] left-4 right-4 h-[2px] bg-muted -z-10" />

      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const StepIcon = step.icon;

        return (
          <div
            key={step.id}
            className="flex flex-col items-center gap-2 bg-background px-3 relative z-10 flex-1"
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
                <StepIcon className="w-4 h-4" />
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
