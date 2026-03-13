'use client';

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { canViewCosts } from '@/lib/permissions';
import {
  CircleDollarSign,
  Clock,
  Package,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

type CostSummaryCardProps = {
  workOrder: any;
  currentUser: any;
};

export function CostSummaryCard({
  workOrder,
  currentUser,
}: CostSummaryCardProps) {
  const showCosts = canViewCosts(currentUser as any);

  // Totals calculation (assuming API returns these or we calculate them)
  const items = workOrder.workOrderItems || [];

  // Filter items by source/type for details
  const internalLaborItems = items.filter(
    (i: any) =>
      i.itemSource === 'INTERNAL_STOCK' && i.mantItem.type === 'SERVICE'
  );
  const internalPartItems = items.filter(
    (i: any) => i.itemSource === 'INTERNAL_STOCK' && i.mantItem.type === 'PART'
  );
  const externalItems = items.filter((i: any) => i.itemSource === 'EXTERNAL');

  // Simple totals
  const totalInternalLabor = internalLaborItems.reduce(
    (acc: number, i: any) => acc + Number(i.totalCost || 0),
    0
  );
  const totalInternalParts = internalPartItems.reduce(
    (acc: number, i: any) => acc + Number(i.totalCost || 0),
    0
  );
  const totalExternal = externalItems.reduce(
    (acc: number, i: any) => acc + Number(i.totalCost || 0),
    0
  );
  const totalExpenses = (workOrder.workOrderExpenses || []).reduce(
    (acc: number, e: any) => acc + Number(e.amount || 0),
    0
  );

  const grandTotal =
    totalInternalLabor + totalInternalParts + totalExternal + totalExpenses;

  if (!showCosts) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            Los costos monetarios están ocultos para tu rol de usuario.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* TOTAL GENERAL */}
      <Card className="lg:col-span-1 bg-primary text-primary-foreground shadow-md border-none">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold opacity-80">
              Costo Total
            </span>
            <CircleDollarSign className="h-4 w-4 opacity-70" />
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* DETALLES */}
      <Card className="lg:col-span-1 border-blue-100 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2 text-blue-600">
            <span className="text-[10px] uppercase font-bold">
              Mano de Obra
            </span>
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xl font-semibold text-blue-700">
              {formatCurrency(totalInternalLabor)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 border-emerald-100 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2 text-emerald-600">
            <span className="text-[10px] uppercase font-bold">
              Repuestos Int.
            </span>
            <Package className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xl font-semibold text-emerald-700">
              {formatCurrency(totalInternalParts)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 border-orange-100 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2 text-orange-600">
            <span className="text-[10px] uppercase font-bold">
              Servicios Ext.
            </span>
            <ExternalLink className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xl font-semibold text-orange-700">
              {formatCurrency(totalExternal)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 border-purple-100 shadow-sm">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2 text-purple-600">
            <span className="text-[10px] uppercase font-bold">
              Gastos Varios
            </span>
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xl font-semibold text-purple-700">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
