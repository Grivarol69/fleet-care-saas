import { useState } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardCheck,
} from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { canViewCosts } from '@/lib/permissions';

export function CierreTab({ workOrder, currentUser, onRefresh }: any) {
  const { toast } = useToast();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [kmCierre, setKmCierre] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const items = workOrder.workOrderItems || [];
  const expenses = workOrder.workOrderExpenses || [];

  const totalLabor = items
    .filter(
      (i: any) =>
        i.itemSource === 'INTERNAL_STOCK' && i.mantItem.type === 'SERVICE'
    )
    .reduce((a: number, i: any) => a + (i.totalCost || 0), 0);

  const totalRepInt = items
    .filter(
      (i: any) =>
        i.itemSource === 'INTERNAL_STOCK' && i.mantItem.type === 'PART'
    )
    .reduce((a: number, i: any) => a + (i.totalCost || 0), 0);

  const totalServExt = items
    .filter(
      (i: any) => i.itemSource === 'EXTERNAL' && i.mantItem.type === 'SERVICE'
    )
    .reduce((a: number, i: any) => a + (i.totalCost || 0), 0);

  const totalRepExt = items
    .filter(
      (i: any) => i.itemSource === 'EXTERNAL' && i.mantItem.type === 'PART'
    )
    .reduce((a: number, i: any) => a + (i.totalCost || 0), 0);

  const totalGastos = expenses.reduce(
    (a: number, e: any) => a + (e.amount || 0),
    0
  );

  const costoTotal =
    totalLabor + totalRepInt + totalServExt + totalRepExt + totalGastos;
  const estimado = workOrder.estimatedCost || 0;
  const variacion =
    estimado > 0 ? ((costoTotal - estimado) / estimado) * 100 : 0;

  const blockers = [
    ...items
      .filter((i: any) => !['COMPLETED', 'CANCELLED'].includes(i.status))
      .map((i: any) => `Ítem "${i.mantItem.name}" está sin completar`),
    ...(workOrder.purchaseOrders || [])
      .filter((po: any) => !['INVOICED', 'CANCELLED'].includes(po.status))
      .map((po: any) => `OC ${po.orderNumber} no tiene factura vinculada`),
  ];
  const canClose = blockers.length === 0;
  const canUserClose =
    ['OWNER', 'MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'].includes(
      currentUser?.role
    ) || currentUser?.isSuperAdmin;

  async function handleClose() {
    setIsClosing(true);
    try {
      await axios.patch(`/api/maintenance/work-orders/${workOrder.id}`, {
        status: 'COMPLETED',
        completionMileage: Number(kmCierre),
      });
      toast({
        title: 'OT cerrada',
        description: 'La orden de trabajo fue cerrada correctamente.',
      });
      setShowCloseDialog(false);
      onRefresh();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la OT',
        variant: 'destructive',
      });
    } finally {
      setIsClosing(false);
    }
  }

  let statusBadgeVariant: 'default' | 'secondary' | 'outline' = 'outline';
  let statusBadgeClass = '';
  if (workOrder.status === 'OPEN') {
    statusBadgeVariant = 'secondary';
  } else if (workOrder.status === 'IN_PROGRESS') {
    statusBadgeVariant = 'default';
  } else if (workOrder.status === 'COMPLETED') {
    statusBadgeVariant = 'secondary';
    statusBadgeClass = 'bg-green-100 text-green-800 hover:bg-green-100';
  } else if (workOrder.status === 'CANCELLED') {
    statusBadgeVariant = 'outline';
    statusBadgeClass = 'text-red-600 border-red-600';
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <ClipboardCheck className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Resumen Ejecutivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground mr-2">Vehículo:</span>
              <span className="font-medium">
                {workOrder.vehicle?.plate} {workOrder.vehicle?.brand?.name}/
                {workOrder.vehicle?.model?.name}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2">Técnico:</span>
              <span className="font-medium">
                {workOrder.assignedTechnician?.name || '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2">
                Centro de costos:
              </span>
              <span className="font-medium">{workOrder.costCenter || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant={statusBadgeVariant} className={statusBadgeClass}>
                {workOrder.status}
              </Badge>
            </div>
            {workOrder.initialMileage && (
              <div className="col-span-2">
                <span className="text-muted-foreground mr-2">
                  KM al inicio:
                </span>
                <span className="font-medium">
                  {workOrder.initialMileage} km
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {canViewCosts(currentUser as any) && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CardTitle className="text-lg">Desglose de Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Mano de obra interna</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totalLabor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Repuestos internos</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totalRepInt)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Servicios externos</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totalServExt)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Repuestos externos</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totalRepExt)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Gastos adicionales</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totalGastos)}
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-bold text-base">Total</TableCell>
                  <TableCell className="text-right font-bold font-mono text-base">
                    {formatCurrency(costoTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center gap-2 text-sm justify-end">
              {estimado === 0 ? (
                <span className="text-muted-foreground">
                  Sin estimado registrado
                </span>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    Estimado{' '}
                    <strong className="text-foreground">
                      {formatCurrency(estimado)}
                    </strong>
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">
                    Real{' '}
                    <strong className="text-foreground">
                      {formatCurrency(costoTotal)}
                    </strong>
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      Math.abs(variacion) > 15 ? 'text-red-600' : ''
                    }`}
                  >
                    {Math.abs(variacion) > 15 && (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    Variación {variacion > 0 ? '+' : ''}
                    {variacion.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <CardTitle className="text-lg">Checklist de Cierre</CardTitle>
        </CardHeader>
        <CardContent>
          {canClose ? (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-700 font-medium">
                La OT está lista para cerrar. Todos los ítems completados y OCs
                facturadas.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="font-semibold mb-2">
                  Hay {blockers.length} bloqueo(s) pendiente(s):
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {blockers.map((b, i) => (
                    <li key={i} className="text-sm">
                      {b}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {canUserClose && (
            <Button
              variant="destructive"
              disabled={!canClose || isClosing}
              className="w-full mt-4"
              onClick={() => setShowCloseDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cerrar OT
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cierre de OT</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Ingresá el kilometraje al cierre:
              <Input
                type="number"
                placeholder="Ej: 125000"
                value={kmCierre}
                onChange={e => setKmCierre(e.target.value)}
                className="mt-4"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!kmCierre || Number(kmCierre) <= 0 || isClosing}
              onClick={handleClose}
            >
              Cerrar OT definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
