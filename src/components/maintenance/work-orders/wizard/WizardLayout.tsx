'use client';

import { WizardStepper, WizardStep } from './WizardStepper';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface WizardLayoutProps {
  currentStep: WizardStep;
  completedSteps: number[];
  workOrderId?: string;
  children: React.ReactNode;
}

export function WizardLayout({
  currentStep,
  completedSteps,
  workOrderId,
  children,
}: WizardLayoutProps) {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/maintenance/work-orders')}
          className="gap-2 text-muted-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Órdenes de Trabajo
        </Button>
        <h1 className="text-2xl font-bold">Nueva Orden de Trabajo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Seguí los pasos para registrar el mantenimiento
        </p>
      </div>

      <div className="bg-card border rounded-xl shadow-sm mb-6 overflow-hidden">
        <WizardStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          workOrderId={workOrderId}
        />
      </div>

      {children}
    </div>
  );
}
