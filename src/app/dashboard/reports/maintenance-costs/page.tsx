'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Loader2 } from 'lucide-react';

type Vehicle = {
  id: string;
  licensePlate: string;
  brand: { name: string };
  line: { name: string };
};

type CostResult = {
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleYear: number;
  from: string;
  to: string;
  costs: {
    maintenance: number;
    purchases: number;
    fuel: number;
    total: number;
  };
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function MaintenanceCostsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().slice(0, 7);
  });
  const [to, setTo] = useState(currentMonth);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CostResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/vehicles/vehicles')
      .then((r) => r.json())
      .then((data: Vehicle[]) => setVehicles(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) { setError('Selecciona un vehículo'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/maintenance-costs?vehicleId=${vehicleId}&from=${from}&to=${to}`);
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
    window.open(`/api/reports/maintenance-costs?vehicleId=${vehicleId}&from=${from}&to=${to}&format=pdf`);
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Costos de Mantenimiento</h1>
        <p className="text-muted-foreground text-sm mt-1">Desglose de costos por vehículo y período</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Parámetros del reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-3">
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
              <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hasta (mes)</Label>
              <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generar
              </Button>
            </div>
          </form>
          {error && <p className="text-destructive text-sm mt-3">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">{result.vehiclePlate} — {result.vehicleBrand} ({result.vehicleYear})</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">Período: {result.from} al {result.to}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" /> Descargar PDF
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Mantenimiento (Órdenes de Trabajo)</TableCell>
                  <TableCell className="text-right font-mono">{formatCOP(result.costs.maintenance)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Compras / Facturas</TableCell>
                  <TableCell className="text-right font-mono">{formatCOP(result.costs.purchases)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Combustible</TableCell>
                  <TableCell className="text-right font-mono">{formatCOP(result.costs.fuel)}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted/40">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">{formatCOP(result.costs.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
