'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wrench,
  Building2,
  FileText,
  ShoppingCart,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import axios from 'axios';

type ServiceItem = {
  workOrderItemId: number;
  mantItemId: number;
  mantItemName: string;
  mantItemType: 'ACTION' | 'SERVICE';
  categoryName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  supplier: string;
  closureType: string;
  status: string;
  itemSource?: string;
};

type Provider = {
  id: number;
  name: string;
};

type Technician = {
  id: number;
  name: string;
  hourlyRate?: number;
};

type ServicesTabProps = {
  workOrderId: number;
  onRefresh: () => void;
};

type ItemDestination = 'EXTERNAL' | 'INTERNAL';

const typeConfig = {
  ACTION: { label: 'Acción', className: 'bg-purple-100 text-purple-700' },
  SERVICE: { label: 'Servicio', className: 'bg-green-100 text-green-700' },
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' },
  COMPLETED: { label: 'Completado', variant: 'default' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
};

export function ServicesTab({ workOrderId, onRefresh }: ServicesTabProps) {
  const { toast } = useToast();

  // State
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [itemDestinations, setItemDestinations] = useState<Map<number, ItemDestination>>(new Map());

  // Dialog state
  const [showOCDialog, setShowOCDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch service items (ACTION + SERVICE types)
  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/maintenance/work-orders/${workOrderId}/items?type=SERVICE,ACTION`);
      const fetchedItems = (res.data.items || []) as ServiceItem[];
      setItems(fetchedItems);

      // Initialize destinations for pending items
      const initialDestinations = new Map<number, ItemDestination>();
      fetchedItems.forEach((item) => {
        if (item.closureType === 'PENDING') {
          initialDestinations.set(item.workOrderItemId, 'EXTERNAL');
        }
      });
      setItemDestinations(initialDestinations);
    } catch (error) {
      console.error('Error fetching service items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los servicios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId, toast]);

  // Fetch providers and technicians
  const fetchResources = useCallback(async () => {
    try {
      const [providersRes, techniciansRes] = await Promise.all([
        axios.get('/api/providers'),
        axios.get('/api/technicians'),
      ]);
      setProviders(providersRes.data || []);
      setTechnicians(techniciansRes.data || []);
    } catch {
      // Non-critical, continue
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchResources();
  }, [fetchItems, fetchResources]);

  // Toggle item selection
  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Toggle all items
  const toggleAllItems = () => {
    const pendingItems = items.filter((i) => i.closureType === 'PENDING');
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map((i) => i.workOrderItemId)));
    }
  };

  // Change item destination
  const setItemDestination = (itemId: number, destination: ItemDestination) => {
    const newDestinations = new Map(itemDestinations);
    newDestinations.set(itemId, destination);
    setItemDestinations(newDestinations);
  };

  // Get selected items by destination
  const getSelectedByDestination = (destination: ItemDestination) => {
    return items.filter(
      (item) =>
        selectedItems.has(item.workOrderItemId) &&
        itemDestinations.get(item.workOrderItemId) === destination
    );
  };

  // Generate Purchase Order for external services
  const handleGenerateServiceOC = async () => {
    const externalItems = getSelectedByDestination('EXTERNAL');
    if (externalItems.length === 0) {
      toast({
        title: 'Sin items',
        description: 'No hay items externos seleccionados',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedProviderId) {
      toast({
        title: 'Proveedor requerido',
        description: 'Selecciona un proveedor para la OC',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const ocItems = externalItems.map((item) => ({
        workOrderItemId: item.workOrderItemId,
        mantItemId: item.mantItemId,
        description: item.description || item.mantItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      await axios.post('/api/purchase-orders', {
        workOrderId,
        type: 'SERVICES',
        providerId: parseInt(selectedProviderId),
        items: ocItems,
        notes: `OC de Servicios generada desde OT #${workOrderId}`,
      });

      // Update itemSource for these items
      await Promise.all(
        externalItems.map((item) =>
          axios.patch(`/api/maintenance/work-orders/${workOrderId}/items/${item.workOrderItemId}`, {
            itemSource: 'EXTERNAL',
          })
        )
      );

      toast({
        title: 'OC Creada',
        description: `Orden de compra de servicios creada con ${externalItems.length} items`,
      });

      setShowOCDialog(false);
      setSelectedItems(new Set());
      setSelectedProviderId('');
      fetchItems();
      onRefresh();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : 'Error al crear OC';
      toast({
        title: 'Error',
        description: message || 'No se pudo crear la orden de compra',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Internal Work Ticket
  const handleGenerateInternalTicket = async () => {
    const internalItems = getSelectedByDestination('INTERNAL');
    if (internalItems.length === 0) {
      toast({
        title: 'Sin items',
        description: 'No hay items internos seleccionados',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTechnicianId) {
      toast({
        title: 'Técnico requerido',
        description: 'Selecciona un técnico para el ticket interno',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const technician = technicians.find((t) => t.id === parseInt(selectedTechnicianId));
      const hourlyRate = technician?.hourlyRate || 50000; // Default hourly rate

      const laborEntries = internalItems.map((item) => ({
        description: item.description || item.mantItemName,
        hours: 1, // Default 1 hour per service
        hourlyRate,
        workOrderItemId: item.workOrderItemId,
      }));

      await axios.post('/api/internal-tickets', {
        workOrderId,
        technicianId: parseInt(selectedTechnicianId),
        description: `Ticket interno para servicios OT #${workOrderId}`,
        laborEntries,
        partEntries: [], // Services don't have parts
      });

      // Update itemSource and closureType for these items
      await Promise.all(
        internalItems.map((item) =>
          axios.patch(`/api/maintenance/work-orders/${workOrderId}/items/${item.workOrderItemId}`, {
            itemSource: 'INTERNAL_STOCK',
            closureType: 'INTERNAL_TICKET',
          })
        )
      );

      toast({
        title: 'Ticket Creado',
        description: `Ticket interno creado con ${internalItems.length} servicios`,
      });

      setShowTicketDialog(false);
      setSelectedItems(new Set());
      setSelectedTechnicianId('');
      fetchItems();
      onRefresh();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : 'Error al crear ticket';
      toast({
        title: 'Error',
        description: message || 'No se pudo crear el ticket interno',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const pendingItems = items.filter((i) => i.closureType === 'PENDING');
  const externalSelected = getSelectedByDestination('EXTERNAL');
  const internalSelected = getSelectedByDestination('INTERNAL');
  const totalEstimated = items.reduce((sum, i) => sum + i.totalCost, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Servicios ({items.length})
            </CardTitle>
            <div className="flex gap-2">
              {externalSelected.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowOCDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Generar OC ({externalSelected.length})
                </Button>
              )}
              {internalSelected.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTicketDialog(true)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Ticket Interno ({internalSelected.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay servicios en esta OT</p>
              <p className="text-sm text-muted-foreground mt-1">
                Los servicios tipo ACTION y SERVICE aparecerán aquí
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      {pendingItems.length > 0 && (
                        <Checkbox
                          checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
                          onCheckedChange={toggleAllItems}
                        />
                      )}
                    </TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isPending = item.closureType === 'PENDING';
                    const destination = itemDestinations.get(item.workOrderItemId) || 'EXTERNAL';

                    return (
                      <TableRow key={item.workOrderItemId}>
                        <TableCell>
                          {isPending && (
                            <Checkbox
                              checked={selectedItems.has(item.workOrderItemId)}
                              onCheckedChange={() => toggleItemSelection(item.workOrderItemId)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.mantItemName}</TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              typeConfig[item.mantItemType]?.className || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {typeConfig[item.mantItemType]?.label || item.mantItemType}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                        <TableCell>
                          {isPending ? (
                            <Select
                              value={destination}
                              onValueChange={(val) =>
                                setItemDestination(item.workOrderItemId, val as ItemDestination)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EXTERNAL">
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    Externo
                                  </div>
                                </SelectItem>
                                <SelectItem value="INTERNAL">
                                  <div className="flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    Interno
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">
                              {item.itemSource === 'EXTERNAL' ? 'Externo' : 'Interno'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[item.status]?.variant || 'outline'}>
                            {statusConfig[item.status]?.label || item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Summary */}
              {totalEstimated > 0 && (
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Total Estimado: </span>
                    <span className="text-lg font-bold">{formatCurrency(totalEstimated)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* OC Dialog */}
      <Dialog open={showOCDialog} onOpenChange={setShowOCDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Orden de Compra de Servicios</DialogTitle>
            <DialogDescription>
              Se creará una OC para {externalSelected.length} servicio(s) externo(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-muted p-3">
              <h4 className="font-medium mb-2">Items a incluir:</h4>
              <ul className="text-sm space-y-1">
                {externalSelected.map((item) => (
                  <li key={item.workOrderItemId} className="flex justify-between">
                    <span>{item.mantItemName}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.totalCost)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                <span>Total:</span>
                <span>
                  {formatCurrency(externalSelected.reduce((sum, i) => sum + i.totalCost, 0))}
                </span>
              </div>
            </div>

            {providers.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                No hay proveedores registrados
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOCDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateServiceOC}
              disabled={isSubmitting || !selectedProviderId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear OC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Ticket Interno</DialogTitle>
            <DialogDescription>
              Se creará un ticket interno para {internalSelected.length} servicio(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Técnico Asignado</label>
              <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-muted p-3">
              <h4 className="font-medium mb-2">Servicios a realizar:</h4>
              <ul className="text-sm space-y-1">
                {internalSelected.map((item) => (
                  <li key={item.workOrderItemId}>{item.mantItemName}</li>
                ))}
              </ul>
            </div>

            {technicians.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                No hay técnicos registrados
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateInternalTicket}
              disabled={isSubmitting || !selectedTechnicianId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
