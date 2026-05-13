'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

import { WizardLayout } from '@/components/maintenance/work-orders/wizard/WizardLayout';
import { Step2Inspection } from '@/components/maintenance/work-orders/wizard/Step2Inspection';
import { Step3Items } from '@/components/maintenance/work-orders/wizard/Step3Items';
import { Step4PurchaseOrders } from '@/components/maintenance/work-orders/wizard/Step4PurchaseOrders';
import { useToast } from '@/components/hooks/use-toast';
import type { WizardStep } from '@/components/maintenance/work-orders/wizard/WizardStepper';

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

type WorkOrderStatus = keyof typeof STATUS_TO_STEP;

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

type WorkOrder = {
  id: string;
  status: string;
  openingBy?: string | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  workOrderItems: Array<{
    id: string;
    unitPrice: number;
    status: string;
  }>;
  [key: string]: unknown;
};

function getCompletedSteps(status: string): number[] {
  const step = STATUS_TO_STEP[status as WorkOrderStatus] ?? 1;
  const completed: number[] = [];
  for (let i = 1; i < step; i++) {
    completed.push(i);
  }
  return completed;
}

export default function WorkOrderWizardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const workOrderId = params.id as string;
  const stepParam = Number(searchParams.get('step') ?? '2');

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkOrder = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/maintenance/work-orders/${workOrderId}`
      );
      setWorkOrder(response.data);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la orden de trabajo',
        variant: 'destructive',
      });
    }
  }, [workOrderId, toast]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.allSettled([
        fetchWorkOrder(),
        fetch('/api/auth/me')
          .then(r => r.json())
          .then((d: CurrentUser) => setCurrentUser(d))
          .catch(() => {}),
      ]);
      setIsLoading(false);
    };
    init();
  }, [fetchWorkOrder]);

  // Redirect to correct step if URL step doesn't match WO status
  useEffect(() => {
    if (!workOrder) return;
    const correctStep =
      STATUS_TO_STEP[workOrder.status as WorkOrderStatus] ?? 2;

    // Only redirect forward: don't redirect if user is clicking back to a completed step
    if (stepParam > correctStep) {
      router.replace(
        `/dashboard/maintenance/work-orders/${workOrderId}/wizard?step=${correctStep}`
      );
    }
  }, [workOrder, stepParam, workOrderId, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Orden de trabajo no encontrada
      </div>
    );
  }

  const woStatus = workOrder.status as WorkOrderStatus;
  const derivedStep = STATUS_TO_STEP[woStatus] ?? 2;
  const currentStep = Math.min(stepParam, derivedStep) as WizardStep;
  const completedSteps = getCompletedSteps(workOrder.status);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Step 1 in wizard context is read-only (WO already exists)
        // Redirect back to the new wizard page would not make sense; show a summary instead
        return (
          <div className="bg-muted/30 border rounded-lg p-6 text-sm space-y-2">
            <p className="font-semibold">Apertura completada</p>
            <p className="text-muted-foreground">
              Esta OT ya fue creada. Podés continuar desde el paso siguiente.
            </p>
          </div>
        );
      case 2:
        return (
          <Step2Inspection
            workOrderId={workOrderId}
            currentUserId={currentUser?.id ?? ''}
          />
        );
      case 3:
        return (
          <Step3Items
            workOrder={workOrder}
            currentUser={currentUser}
            onRefresh={fetchWorkOrder}
          />
        );
      case 4:
        return (
          <Step4PurchaseOrders
            workOrder={workOrder}
            currentUser={currentUser}
            onRefresh={fetchWorkOrder}
          />
        );
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      workOrderId={workOrderId}
    >
      {renderStep()}
    </WizardLayout>
  );
}
