'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, Loader2, AlertTriangle } from 'lucide-react';
import type { ExpenseReportResponse } from '@/components/reports/pdf/ExpenseReportPDF/ExpenseReportPDF.types';

type Vehicle = {
  id: string;
  licensePlate: string;
  brand: { name: string };
  line: { name: string };
};

type Category = {
  id: string;
  name: string;
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function threeMonthsAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

function monthsBetween(from: string, to: string): number {
  const f = new Date(from);
  const t = new Date(to);
  return (
    (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth())
  );
}

export default function ExpenseReportPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicleId, setVehicleId] = useState('__all__');
  const [categoryId, setCategoryId] = useState('__all__');
  const [from, setFrom] = useState(threeMonthsAgoStr);
  const [to, setTo] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExpenseReportResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/vehicles/vehicles')
      .then(r => r.json())
      .then((data: Vehicle[]) => setVehicles(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/maintenance/mant-categories')
      .then(r => r.json())
      .then((data: Category[]) => setCategories(data))
      .catch(() => {});
  }, []);

  function buildQueryString() {
    const params = new URLSearchParams({ from, to });
    if (vehicleId !== '__all__') params.set('vehicleId', vehicleId);
    if (categoryId === '__none__') params.set('categoryId', 'none');
    else if (categoryId !== '__all__') params.set('categoryId', categoryId);
    return params.toString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/expense-report?${buildQueryString()}`
      );
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Error al cargar datos');
        return;
      }
      setResult(await res.json());
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPDF() {
    window.open(`/api/reports/expense-report?${buildQueryString()}&format=pdf`);
  }

  const rangeMonths = monthsBetween(from, to);
  const showRangeWarning = rangeMonths > 12;

  const showByVehicle = !result?.filters.vehicle;
  const showByCategory = !result?.filters.category;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Gastos de Flota</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Detalle de gastos por vehículo y/o categoría en un período
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Parámetros del reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {/* Vehicle */}
            <div className="space-y-1">
              <Label>Vehículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los vehículos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los vehículos</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.licensePlate} — {v.brand.name} {v.line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las categorías</SelectItem>
                  <SelectItem value="__none__">Sin categoría</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Generar
              </Button>
            </div>
          </form>

          {showRangeWarning && (
            <Alert variant="default" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                El rango seleccionado es mayor a 12 meses. La consulta puede
                tardar más de lo esperado.
              </AlertDescription>
            </Alert>
          )}

          {error && <p className="text-destructive text-sm mt-3">{error}</p>}
        </CardContent>
      </Card>

      {result && result.lines.length === 0 && (
        <Alert
          variant="default"
          className="border-amber-200 bg-amber-50 text-amber-800"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            Sin resultados para el período seleccionado. Si cargaste facturas
            históricas, verificá que sus fechas caigan dentro del rango — la
            fecha que importa es la de la factura, no la de carga.
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Resultados</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Período: {result.filters.from} al {result.filters.to}
              </p>
              {(result.filters.vehicle || result.filters.category) && (
                <p className="text-muted-foreground text-sm">
                  Filtros:{' '}
                  {result.filters.vehicle && (
                    <span>Vehículo: {result.filters.vehicle.label}</span>
                  )}
                  {result.filters.vehicle && result.filters.category && ' | '}
                  {result.filters.category && (
                    <span>Categoría: {result.filters.category.label}</span>
                  )}
                </p>
              )}
              <p className="text-base font-bold mt-1">
                Total: {formatCOP(result.summary.grandTotal)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  ({result.summary.grandCount} ítems)
                </span>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" /> Descargar PDF
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Summary by Category */}
            {showByCategory && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Resumen por categoría
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right"># ítems</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.summary.byCategory.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-muted-foreground text-sm"
                        >
                          Sin resultados
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.summary.byCategory.map(cat => (
                        <TableRow key={cat.key}>
                          <TableCell>{cat.label}</TableCell>
                          <TableCell className="text-right">
                            {cat.count}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCOP(cat.total)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Summary by Vehicle */}
            {showByVehicle && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Resumen por vehículo
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehículo</TableHead>
                      <TableHead className="text-right"># ítems</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.summary.byVehicle.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-muted-foreground text-sm"
                        >
                          Sin resultados
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.summary.byVehicle.map(veh => (
                        <TableRow key={veh.key}>
                          <TableCell>{veh.label}</TableCell>
                          <TableCell className="text-right">
                            {veh.count}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCOP(veh.total)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Grand Total row */}
            <div className="flex justify-end">
              <p className="font-bold text-sm">
                TOTAL GENERAL: {formatCOP(result.summary.grandTotal)}
              </p>
            </div>

            {/* Line Detail */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Detalle de líneas</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cant</TableHead>
                      <TableHead className="text-right">P. Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.lines.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-muted-foreground text-sm"
                        >
                          Sin resultados para los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.lines.map(line => (
                        <TableRow key={line.id}>
                          <TableCell className="whitespace-nowrap">
                            {line.invoiceDate.slice(0, 10)}
                          </TableCell>
                          <TableCell>{line.invoiceNumber}</TableCell>
                          <TableCell>{line.providerName}</TableCell>
                          <TableCell>{line.vehicleLabel}</TableCell>
                          <TableCell>{line.categoryLabel}</TableCell>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">
                            {line.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCOP(line.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCOP(line.total)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
