'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { AlertTriangle, Droplets, FileText, Fuel, Loader2, TrendingUp } from 'lucide-react';
import type { FuelAnalyticsResult, AnomalyFlag } from '@/lib/fuel-analytics';

type Vehicle = {
  id: string;
  licensePlate: string;
  brand: { name: string };
  line: { name: string };
};

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function fmt2(n: number): string {
  return n.toFixed(2);
}

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

function AnomalyBadge({ anomaly }: { anomaly: AnomalyFlag }) {
  if (anomaly.kind === 'HIGH_CONSUMPTION') {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <AlertTriangle className="h-3 w-3" />
        Alto consumo
        {anomaly.percentAbove != null ? ` +${anomaly.percentAbove}%` : ''}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs border-yellow-400 text-yellow-700">
      <AlertTriangle className="h-3 w-3" />
      Odómetro inconsistente
    </Badge>
  );
}

export default function FuelAnalyticsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [from, setFrom] = useState(() => monthsAgo(6));
  const [to, setTo] = useState(currentMonth);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FuelAnalyticsResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/vehicles/vehicles')
      .then((r) => r.json())
      .then((data: Vehicle[]) => setVehicles(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) {
      setError('Selecciona un vehículo');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/fuel?vehicleId=${vehicleId}&from=${from}&to=${to}`
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

  const chartData = result?.monthly.map((m) => ({
    month: m.month,
    efficiency: m.avgEfficiency > 0 ? parseFloat(fmt2(m.avgEfficiency)) : null,
    baseline: result.baseline ? parseFloat(fmt2(result.baseline)) : undefined,
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Fuel className="h-6 w-6" />
          Análisis de Combustible
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Eficiencia L/100 km por vehículo y detección automática de anomalías
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Parámetros del reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>Vehículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vehículo..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.licensePlate} — {v.brand.name} {v.line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Desde (mes)</Label>
              <Input
                type="month"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Hasta (mes)</Label>
              <Input
                type="month"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="flex items-end sm:col-span-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Generar análisis
              </Button>
            </div>
          </form>
          {error && <p className="text-destructive text-sm mt-3">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Eficiencia promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {result.avgEfficiency !== null
                    ? `${fmt2(result.avgEfficiency)} L/100km`
                    : '—'}
                </p>
                {result.baseline !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Línea base: {fmt2(result.baseline)} L/100km
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Droplets className="h-4 w-4" /> Total litros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {result.totalLiters.toLocaleString('es-CO', {
                    maximumFractionDigits: 1,
                  })}{' '}
                  L
                </p>
                {result.skippedPairs > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.skippedPairs} registros sin odómetro omitidos
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Fuel className="h-4 w-4" /> Costo total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCOP(result.totalCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Período: {result.from} al {result.to}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Line chart */}
          {chartData && chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Eficiencia mensual (L/100 km)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${v}`}
                      label={{ value: 'L/100km', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${fmt2(value)} L/100km`]}
                    />
                    <Line
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                      name="L/100km"
                    />
                    {result.baseline !== null && (
                      <ReferenceLine
                        y={result.baseline}
                        stroke="#f59e0b"
                        strokeDasharray="4 2"
                        label={{ value: 'Línea base', fontSize: 11, fill: '#f59e0b' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Monthly table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">L/100km</TableHead>
                    <TableHead className="text-right">Litros</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead>Anomalía</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.monthly.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right font-mono">
                        {m.pairCount > 0 ? fmt2(m.avgEfficiency) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {m.totalLiters.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCOP(m.totalCost)}
                      </TableCell>
                      <TableCell>
                        {m.anomaly ? (
                          <AnomalyBadge anomaly={m.anomaly} />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {result.monthly.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Sin datos en el período seleccionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Anomalies summary */}
          {result.anomalies.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Anomalías detectadas ({result.anomalies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.anomalies.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                    <AnomalyBadge anomaly={a} />
                    <p className="text-sm">{a.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
