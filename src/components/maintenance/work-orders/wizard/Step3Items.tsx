'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { ShieldCheck, AlertTriangle, Clock, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnifiedWorkOrderForm } from '@/components/maintenance/work-orders/UnifiedWorkOrderForm';
import { useToast } from '@/components/hooks/use-toast';

type WorkOrderItem = {
  id: string;
  unitPrice: number;
  status: string;
};

type WorkOrder = {
  id: string;
  status: string;
  openingBy?: string | null;
  workOrderItems: WorkOrderItem[];
  [key: string]: unknown;
};

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

interface Step3ItemsProps {
  workOrder: WorkOrder;
  currentUser: CurrentUser | null;
  onRefresh: () => void;
}

function canAuthorize(user: CurrentUser | null): boolean {
  if (!user) return false;
  return (
    user.isSuperAdmin || ['OWNER', 'MANAGER', 'COORDINATOR'].includes(user.role)
  );
}

export function Step3Items({
  workOrder,
  currentUser,
  onRefresh,
}: Step3ItemsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRequestingAuth, setIsRequestingAuth] = useState(false);

  const items = workOrder.workOrderItems || [];
  const itemsWithoutPrice = items.filter(
    i => Number(i.unitPrice) <= 0 && i.status !== 'CANCELLED'
  );
  const hasItems = items.filter(i => i.status !== 'CANCELLED').length > 0;

  const userCanAuthorize = canAuthorize(currentUser);
  const isTechnician =
    currentUser?.role === 'TECHNICIAN' && !currentUser?.isSuperAdmin;

  // Self-authorization guard: technician who opened the WO cannot authorize
  const isSelfAuthBlocked =
    isTechnician && workOrder.openingBy === currentUser?.id;

  const authorizeBlocked =
    itemsWithoutPrice.length > 0 || !hasItems || isSelfAuthBlocked;

  const LOCKED_STATUSES = ['APPROVED', 'COMPLETED', 'CLOSED'];
  const canGoBack = !LOCKED_STATUSES.includes(workOrder.status);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      await axios.post(
        `/api/maintenance/work-orders/${workOrder.id}/authorize`
      );
      toast({
        title: 'OT autorizada',
        description: 'La orden fue aprobada. Pasando a Órdenes de Compra.',
      });
      router.push(
        `/dashboard/maintenance/work-orders/${workOrder.id}/wizard?step=4`
      );
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Error al autorizar',
        description:
          axiosError.response?.data?.error || 'No se pudo autorizar la OT.',
        variant: 'destructive',
      });
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleRequestAuth = async () => {
    setIsRequestingAuth(true);
    try {
      await axios.patch(`/api/maintenance/work-orders/${workOrder.id}`, {
        status: 'PENDING',
      });
      toast({
        title: 'Autorización solicitada',
        description: 'Se notificó al responsable para que autorice la OT.',
      });
      onRefresh();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Error',
        description:
          axiosError.response?.data?.error ||
          'No se pudo solicitar la autorización.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingAuth(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Authorization panel */}
      <Card>
        <CardHeader>
          <CardTitle>Paso 3: Confección y autorización</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning: items without price */}
          {itemsWithoutPrice.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ítems sin precio</AlertTitle>
              <AlertDescription>
                {itemsWithoutPrice.length} ítem(s) tienen precio $0. Todos los
                ítems deben tener un precio mayor a $0 para poder autorizar la
                OT.
              </AlertDescription>
            </Alert>
          )}

          {/* OWNER/MANAGER: authorize button */}
          {userCanAuthorize && workOrder.status === 'DRAFTING' && (
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleAuthorize}
                disabled={authorizeBlocked || isAuthorizing}
                className="gap-2"
              >
                {isAuthorizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Autorizar OT
              </Button>
              {!hasItems && (
                <span className="text-sm text-muted-foreground">
                  Agregá al menos un ítem para poder autorizar
                </span>
              )}
            </div>
          )}

          {/* TECHNICIAN: request authorization button */}
          {!userCanAuthorize && workOrder.status === 'DRAFTING' && (
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleRequestAuth}
                disabled={isRequestingAuth || !hasItems}
                className="gap-2"
              >
                {isRequestingAuth ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                Solicitar autorización
              </Button>
              {!hasItems && (
                <span className="text-sm text-muted-foreground">
                  Agregá al menos un ítem antes de solicitar autorización
                </span>
              )}
            </div>
          )}

          {/* Waiting for authorization */}
          {workOrder.status === 'PENDING' && !userCanAuthorize && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Pendiente de autorización</AlertTitle>
              <AlertDescription>
                La OT está esperando que un OWNER o MANAGER la autorice.
              </AlertDescription>
            </Alert>
          )}

          {/* OWNER/MANAGER can also authorize from PENDING */}
          {userCanAuthorize && workOrder.status === 'PENDING' && (
            <div className="flex items-center gap-3 flex-wrap">
              <Alert className="flex-1">
                <Clock className="h-4 w-4" />
                <AlertTitle>Pendiente de tu autorización</AlertTitle>
                <AlertDescription>
                  El técnico finalizó la confección. Revisá los ítems y autorizá
                  la OT.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleAuthorize}
                disabled={authorizeBlocked || isAuthorizing}
                className="gap-2 shrink-0"
              >
                {isAuthorizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Autorizar OT
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items editor — reuse the existing UnifiedWorkOrderForm */}
      <UnifiedWorkOrderForm
        initialData={workOrder}
        currentUser={currentUser}
        onRefresh={onRefresh}
        submitLabel="Aprobar OT"
        leftAction={
          canGoBack ? (
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/dashboard/maintenance/work-orders/${workOrder.id}/wizard?step=2`
                )
              }
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Regresar a Inspección
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
