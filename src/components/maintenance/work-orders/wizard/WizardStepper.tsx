'use client';

import {
  Check,
  Wrench,
  Search,
  ClipboardList,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const STATUS_TO_STEP = {
  OPENING: 1,
  INSPECTING: 2,
  DRAFTING: 3,
  PENDING: 3,
  APPROVED: 4,
  COMPLETED: 4,
  CLOSED: 4,
  REJECTED: 3,
  CANCELLED: 1,
} as const;

const WIZARD_STEPS = [
  { step: 1 as const, label: 'Apertura', icon: Wrench },
  { step: 2 as const, label: 'Inspección', icon: Search },
  { step: 3 as const, label: 'Confección', icon: ClipboardList },
  { step: 4 as const, label: 'Órdenes de Compra', icon: ShoppingCart },
];

export type WizardStep = 1 | 2 | 3 | 4;

interface WizardStepperProps {
  currentStep: WizardStep;
  completedSteps: number[];
  workOrderId?: string;
}

export function WizardStepper({
  currentStep,
  completedSteps,
  workOrderId,
}: WizardStepperProps) {
  const router = useRouter();

  const handleStepClick = (step: WizardStep) => {
    if (!workOrderId) return;
    if (!completedSteps.includes(step) && step !== currentStep) return;
    if (step === 1 && !workOrderId) return;
    if (step === currentStep) return;

    if (step === 1) {
      // Step 1 lives at the new-wizard page — completed steps are read-only
      // Only navigate back if WO already has an ID (wizard is in progress)
      router.push(
        `/dashboard/maintenance/work-orders/${workOrderId}/wizard?step=1`
      );
    } else {
      router.push(
        `/dashboard/maintenance/work-orders/${workOrderId}/wizard?step=${step}`
      );
    }
  };

  return (
    <div className="flex items-center justify-between w-full relative pt-2 pb-4 px-4">
      <div className="absolute top-[22px] left-4 right-4 h-[2px] bg-muted -z-10" />

      {WIZARD_STEPS.map(({ step, label, icon: StepIcon }) => {
        const isCompleted = completedSteps.includes(step);
        const isCurrent = step === currentStep;
        const isClickable = isCompleted && step !== currentStep && workOrderId;

        return (
          <div
            key={step}
            className={cn(
              'flex flex-col items-center gap-2 bg-background px-3 relative z-10 flex-1',
              isClickable && 'cursor-pointer'
            )}
            onClick={() => isClickable && handleStepClick(step)}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={e => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                handleStepClick(step);
              }
            }}
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
                isCompleted && !isCurrent && 'text-foreground'
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { STATUS_TO_STEP };
