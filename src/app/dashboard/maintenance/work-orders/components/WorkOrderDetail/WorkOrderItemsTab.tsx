'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type WorkOrder = {
  workOrderItems: Array<{
    id: number;
    description: string;
    supplier: string | null;
    unitPrice: number;
    quantity: number;
    totalCost: number;
    status: string;
    mantItem: {
      id: number;
      name: string;
      type: string;
    };
  }>;
};

type WorkOrderItemsTabProps = {
  workOrder: WorkOrder;
  onRefresh: () => void;
};

const itemStatusConfig = {
  PENDING: { label: 'Pendiente', variant: 'secondary' as const },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' as const },
  COMPLETED: { label: 'Completado', variant: 'default' as const },
  CANCELLED: { label: 'Cancelado', variant: 'outline' as const },
};

const mantItemTypeConfig = {
  INSPECTION: { label: 'Inspección', color: 'text-blue-600' },
  REPLACEMENT: { label: 'Reemplazo', color: 'text-orange-600' },
  ADJUSTMENT: { label: 'Ajuste', color: 'text-green-600' },
  CLEANING: { label: 'Limpieza', color: 'text-purple-600' },
  LUBRICATION: { label: 'Lubricación', color: 'text-yellow-600' },
  REPAIR: { label: 'Reparación', color: 'text-red-600' },
  OTHER: { label: 'Otro', color: 'text-gray-600' },
};

export function WorkOrderItemsTab({
  workOrder,
}: WorkOrderItemsTabProps) {
  if (workOrder.workOrderItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No hay items registrados en esta orden de trabajo
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCost = workOrder.workOrderItems.reduce(
    (sum, item) => sum + item.totalCost,
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Items de Trabajo ({workOrder.workOrderItems.length})
            </CardTitle>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">
                ${totalCost.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrder.workOrderItems.map((item) => {
                const statusInfo =
                  itemStatusConfig[
                    item.status as keyof typeof itemStatusConfig
                  ];
                const typeInfo =
                  mantItemTypeConfig[
                    item.mantItem.type as keyof typeof mantItemTypeConfig
                  ] || mantItemTypeConfig.OTHER;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.mantItem.name}
                    </TableCell>
                    <TableCell>
                      <span className={typeInfo.color}>{typeInfo.label}</span>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{item.description}</p>
                    </TableCell>
                    <TableCell>
                      {item.supplier || (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      ${item.unitPrice.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${item.totalCost.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
