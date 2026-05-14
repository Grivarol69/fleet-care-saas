'use client';

import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComprasTab } from '@/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return dateStr;
  }
}

type WorkOrder = {
  id: string;
  status: string;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  openingDate?: string | null;
  authorizedAt?: string | null;
  inspection?: {
    date: string;
  } | null;
  [key: string]: unknown;
};

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

interface Step4PurchaseOrdersProps {
  workOrder: WorkOrder;
  currentUser: CurrentUser | null;
  onRefresh: () => void;
}

export function Step4PurchaseOrders({
  workOrder,
  currentUser,
  onRefresh,
}: Step4PurchaseOrdersProps) {
  return (
    <div className="space-y-4">
      {/* Summary panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Paso 4: Órdenes de Compra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Vehículo</p>
              <p className="font-semibold">{workOrder.vehicle.licensePlate}</p>
              <p className="text-xs text-muted-foreground">
                {workOrder.vehicle.brand.name} {workOrder.vehicle.line.name}
              </p>
            </div>
            {workOrder.openingDate && (
              <div>
                <p className="text-muted-foreground">Apertura</p>
                <p className="font-semibold">
                  {formatDate(workOrder.openingDate as string)}
                </p>
              </div>
            )}
            {workOrder.inspection && (
              <div>
                <p className="text-muted-foreground">Inspección</p>
                <p className="font-semibold">
                  {formatDate((workOrder.inspection as { date: string }).date)}
                </p>
              </div>
            )}
            {workOrder.authorizedAt && (
              <div>
                <p className="text-muted-foreground">Autorizada</p>
                <p className="font-semibold">
                  {formatDate(workOrder.authorizedAt as string)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchase orders — reuse existing ComprasTab */}
      <ComprasTab
        workOrder={workOrder}
        currentUser={currentUser}
        onRefresh={onRefresh}
      />
    </div>
  );
}
