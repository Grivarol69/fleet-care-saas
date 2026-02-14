'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Plus, Search } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

type WorkOrder = {
  id: number;
  vehicle: {
    id: number;
    brand: { name: string };
    line: { name: string };
  };
  workOrderExpenses: Array<{
    id: string; // CUID
    description: string;
    amount: number;
    expenseDate: string;
    expenseType: string;
    status: string;
    vendor: string | null;
    invoiceNumber: string | null;
  }>;
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
    supplier: {
      id: number;
      name: string;
    } | null;
  }>;
};

type ExpensesTabProps = {
  workOrder: WorkOrder;
  onRefresh: () => void;
};

const expenseTypeConfig: Record<string, string> = {
  PARTS: 'Repuestos',
  LABOR: 'Mano de Obra',
  TRANSPORT: 'Transporte',
  TOOLS: 'Herramientas',
  MATERIALS: 'Materiales',
  SERVICE: 'Servicio',
  OTHER: 'Otros',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-50' },
  APPROVED: { label: 'Aprobado', color: 'text-green-600 bg-green-50' },
  REJECTED: { label: 'Rechazado', color: 'text-red-600 bg-red-50' },
  EXPIRED: { label: 'Expirado', color: 'text-gray-600 bg-gray-50' },
};

type MasterPart = {
  id: string;
  code: string;
  description: string;
  referencePrice: string | null;
  compatibilities: any[];
};

export function ExpensesTab({ workOrder, onRefresh }: ExpensesTabProps) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expense Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('OTHER');
  const [vendor, setVendor] = useState('');
  const [masterPartId, setMasterPartId] = useState<string | null>(null);

  // Recommendation State
  const [recommendations, setRecommendations] = useState<MasterPart[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showRecs, setShowRecs] = useState(false);

  const handleUpdateStatus = async (
    expenseId: string,
    newStatus: 'APPROVED' | 'REJECTED'
  ) => {
    try {
      await axios.patch(`/api/maintenance/expenses/${expenseId}`, {
        status: newStatus,
      });
      toast({
        title: 'Estado actualizado',
        description: `El gasto ha sido ${newStatus === 'APPROVED' ? 'aprobado' : 'rechazado'}.`,
        variant: 'default',
      });
      onRefresh();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No tienes permisos para realizar esta acción.',
        variant: 'destructive',
      });
    }
  };

  const loadRecommendations = async () => {
    setLoadingRecs(true);
    setShowRecs(true);
    try {
      const res = await axios.get(
        `/api/inventory/parts/recommendations?vehicleId=${workOrder.vehicle.id}`
      );
      setRecommendations(res.data);
    } catch (error) {
      console.error('Failed to load recommendations', error);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleSelectPart = (part: MasterPart) => {
    setDescription(part.description); // Auto-fill description
    setMasterPartId(part.id);
    setType('PARTS');
    if (part.referencePrice) {
      setAmount(part.referencePrice); // Suggest price
    }
    setShowRecs(false); // Close suggestions
  };

  const handleCreateExpense = async () => {
    if (!description || !amount) {
      toast({
        title: 'Faltan datos',
        description: 'Descripción y Monto son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        `/api/maintenance/work-orders/${workOrder.id}/expenses`,
        {
          description,
          amount: parseFloat(amount),
          expenseType: type,
          vendor,
          masterPartId, // Pass linked part ID for Watchdog
        }
      );

      toast({
        title: 'Gasto Registrado',
        description: 'El gasto se ha guardado correctamente',
      });
      setIsAddOpen(false);
      // Reset Form
      setDescription('');
      setAmount('');
      setVendor('');
      setMasterPartId(null);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el gasto',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExpenses = workOrder.workOrderExpenses.reduce(
    (sum, exp) => sum + Number(exp.amount),
    0
  );

  const totalInvoices = workOrder.invoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0
  );

  const grandTotal = totalExpenses + totalInvoices;

  return (
    <div className="space-y-6">
      {/* ADD EXPENSE DIALOG */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>Descripción</Label>
                <Input
                  placeholder="Ej: Filtro de Aceite"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={loadRecommendations}
                title="Buscar Compatible"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* RECOMMENDATIONS PANEL */}
            {showRecs && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="py-2 px-4 pb-0">
                  <div className="flex justify-between items-center text-xs text-blue-800 font-semibold mb-2">
                    <span>
                      Repuestos Compatibles ({workOrder.vehicle.brand.name}{' '}
                      {workOrder.vehicle.line.name})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => setShowRecs(false)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <ScrollArea className="h-[200px] px-4 pb-2">
                  {loadingRecs ? (
                    <div className="text-center py-4 text-xs">Buscando...</div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      No se encontraron repuestos específicos.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recommendations.map(part => (
                        <div
                          key={part.id}
                          className="flex justify-between items-center bg-white p-2 rounded border text-sm cursor-pointer hover:border-blue-400"
                          onClick={() => handleSelectPart(part)}
                        >
                          <div>
                            <div className="font-medium">
                              {part.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {part.code}
                            </div>
                          </div>
                          <div className="text-right">
                            {part.referencePrice && (
                              <div className="font-bold">
                                ${Number(part.referencePrice).toLocaleString()}
                              </div>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              Compatible
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(expenseTypeConfig).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Proveedor (Opcional)</Label>
              <Input
                placeholder="Nombre del taller o tienda"
                value={vendor}
                onChange={e => setVendor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateExpense} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Registrar Gasto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resumen de Gastos */}
      <div className="grid grid-cols-3 gap-4">
        {/* ... (Existing Cards - kept same but simplified in this replacement for brevity, wait, tool replaces FILE content, so I must include everything or use multi-replace. I should probably use multi-replace to minimize disruption. But I almost rewrote the whole file to add the dialog states. I'll use WRITE to replace the whole file properly to ensure structure is clean.) */}
        {/* Actually, let's use the provided code as complete replacement since it's cleaner than complex multi-replace for state injection. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos Registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totalExpenses.toLocaleString('es-CO')}
            </p>
            <p className="text-sm text-muted-foreground">
              {workOrder.workOrderExpenses.length} gastos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Facturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totalInvoices.toLocaleString('es-CO')}
            </p>
            <p className="text-sm text-muted-foreground">
              {workOrder.invoices.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${grandTotal.toLocaleString('es-CO')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gastos Detallados + HEADER button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gastos Registrados</CardTitle>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Gasto
          </Button>
        </CardHeader>
        <CardContent>
          {workOrder.workOrderExpenses.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay gastos registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrder.workOrderExpenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.description}
                      {expense.vendor && (
                        <div className="text-xs text-muted-foreground">
                          Prov: {expense.vendor}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {expenseTypeConfig[expense.expenseType] ||
                        expense.expenseType}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(expense.expenseDate), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${Number(expense.amount).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusConfig[expense.status]?.color || ''}
                      >
                        {statusConfig[expense.status]?.label || expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {expense.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() =>
                              handleUpdateStatus(expense.id, 'APPROVED')
                            }
                            title="Aprobar"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() =>
                              handleUpdateStatus(expense.id, 'REJECTED')
                            }
                            title="Rechazar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Facturas */}
      {workOrder.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Facturas Vinculadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Factura</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrder.invoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {invoice.supplier?.name || (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoiceDate).toLocaleDateString(
                        'es-CO'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${invoice.totalAmount.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell>{invoice.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
