'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Download,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { MaintenanceHistoryPDF } from './MaintenanceHistoryPDF';

interface MaintenanceHistoryDialogProps {
  vehicleId: string;
  onClose: () => void;
}

export const OBJ_UI_BADGE_STYLE = {
  PREVENTIVE: 'bg-blue-100 text-blue-700',
  PREDICTIVE: 'bg-purple-100 text-purple-700',
  CORRECTIVE: 'bg-red-100 text-red-700',
  EMERGENCY: 'bg-orange-100 text-orange-700',
} as const;

export const OBJ_MANT_TYPE_LABEL = {
  PREVENTIVE: 'Preventivo',
  PREDICTIVE: 'Predictivo',
  CORRECTIVE: 'Correctivo',
  EMERGENCY: 'Emergencia',
} as const;

export function MaintenanceHistoryDialog({
  vehicleId,
  onClose,
}: MaintenanceHistoryDialogProps) {
  const [data, setData] = useState<{ vehicle: any; workOrders: any[] } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expand state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/vehicles/vehicles/${vehicleId}/maintenance-history`
        );
        if (!res.ok) throw new Error('Error al obtener el historial');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vehicleId]);

  const filteredWorkOrders = useMemo(() => {
    if (!data) return [];
    let filtered = [...data.workOrders];

    if (typeFilter !== 'todos') {
      filtered = filtered.filter(wo => wo.mantType === typeFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(wo => {
        const title = wo.isPackageWork ? wo.packageName : wo.title;
        const providerName = wo.provider?.name || '';
        return (
          title?.toLowerCase().includes(lower) ||
          providerName.toLowerCase().includes(lower)
        );
      });
    }

    if (dateFrom) {
      filtered = filtered.filter(
        wo => new Date(wo.endDate) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(wo => new Date(wo.endDate) <= endOfDay);
    }

    return filtered;
  }, [data, typeFilter, searchTerm, dateFrom, dateTo]);

  const toggleRow = (id: string) => {
    const newExp = new Set(expandedRows);
    if (newExp.has(id)) {
      newExp.delete(id);
    } else {
      newExp.add(id);
    }
    setExpandedRows(newExp);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalCost =
    data?.workOrders.reduce(
      (sum, wo) => sum + (Number(wo.actualCost) || 0),
      0
    ) || 0;

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !data) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-red-600">
            {error || 'No se pudo cargar la información'}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span>
                Historial de Mantenimiento - {data.vehicle.licensePlate}
              </span>
              <span className="text-sm font-normal text-muted-foreground flex gap-4">
                <span>
                  Intervenciones: <b>{data.workOrders.length}</b>
                </span>
                <span>
                  Gasto Total: <b>{formatCurrency(totalCost)}</b>
                </span>
                <span>
                  Odómetro:{' '}
                  <b>{data.vehicle.mileage.toLocaleString('es-CO')} km</b>
                </span>
              </span>
            </div>

            <PDFDownloadLink
              document={
                <MaintenanceHistoryPDF
                  vehicle={data.vehicle}
                  workOrders={filteredWorkOrders}
                />
              }
              fileName={`Historial_${data.vehicle.licensePlate}_${new Date().toISOString().split('T')[0]}.pdf`}
            >
              {({ loading }) => (
                <Button size="sm" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar PDF
                    </>
                  )}
                </Button>
              )}
            </PDFDownloadLink>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 border-y bg-muted/20 shrink-0 flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1 w-48">
            <label className="text-xs font-semibold">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Título o proveedor..."
                className="pl-8"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-40">
            <label className="text-xs font-semibold">
              Tipo de Mantenimiento
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
                <SelectItem value="PREDICTIVE">Predictivo</SelectItem>
                <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                <SelectItem value="EMERGENCY">Emergencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 w-36">
            <label className="text-xs font-semibold flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> Desde
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1 w-36">
            <label className="text-xs font-semibold flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> Hasta
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 overflow-auto flex-1">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Kilometraje</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Trabajo</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No se encontraron mantenimientos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkOrders.map(wo => {
                    const isExpanded = expandedRows.has(wo.id);
                    const title = wo.isPackageWork ? wo.packageName : wo.title;
                    const badgeClass =
                      OBJ_UI_BADGE_STYLE[
                        wo.mantType as keyof typeof OBJ_UI_BADGE_STYLE
                      ] || 'bg-gray-100 text-gray-700';
                    const label =
                      OBJ_MANT_TYPE_LABEL[
                        wo.mantType as keyof typeof OBJ_MANT_TYPE_LABEL
                      ] || wo.mantType;

                    return (
                      <React.Fragment key={wo.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(wo.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {wo.endDate
                              ? new Date(wo.endDate).toLocaleDateString('es-CO')
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {wo.completionMileage?.toLocaleString('es-CO') ||
                              '--'}{' '}
                            km
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                            >
                              {label}
                            </span>
                          </TableCell>
                          <TableCell>{title}</TableCell>
                          <TableCell>
                            {wo.provider?.name || 'Interno'}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(Number(wo.actualCost) || 0)}
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={7} className="p-0">
                              <div className="p-4 border-b">
                                {wo.workOrderItems &&
                                wo.workOrderItems.length > 0 ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-background">
                                        <TableHead className="text-xs">
                                          Descripción
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Nº Parte
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Marca
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Proveedor
                                        </TableHead>
                                        <TableHead className="text-xs text-right">
                                          Costo
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {wo.workOrderItems.map((item: any) => (
                                        <TableRow
                                          key={item.id}
                                          className="bg-background"
                                        >
                                          <TableCell className="text-xs">
                                            {item.description ||
                                              item.mantItem?.name}
                                          </TableCell>
                                          <TableCell className="text-xs">
                                            {item.partNumber ||
                                              item.masterPart?.code ||
                                              '--'}
                                          </TableCell>
                                          <TableCell className="text-xs">
                                            {item.brand || '--'}
                                          </TableCell>
                                          <TableCell className="text-xs">
                                            {item.provider?.name ||
                                              item.supplier ||
                                              '--'}
                                          </TableCell>
                                          <TableCell className="text-xs text-right">
                                            {formatCurrency(
                                              Number(item.totalCost) || 0
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <div className="text-sm text-muted-foreground p-2">
                                    No hay ítems registrados en esta orden.
                                  </div>
                                )}

                                {wo.notes && (
                                  <div className="mt-4 p-3 bg-white border rounded text-sm whitespace-pre-wrap">
                                    <span className="font-semibold block mb-1">
                                      Notas del técnico:
                                    </span>
                                    {wo.notes}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
