'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Loader2 } from 'lucide-react';

type FleetVehicle = {
  vehicleId: string;
  plate: string;
  brand: string;
  year: number;
  odometer: number | null;
  lastWorkOrderDate: string | null;
  nextMaintenanceDesc: string | null;
  nextMaintenanceKm: number | null;
  stale: boolean;
};

type FleetStatusData = {
  vehicles: FleetVehicle[];
  total: number;
  staleCount: number;
};

export default function FleetStatusPage() {
  const [data, setData] = useState<FleetStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports/fleet-status');
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Error al cargar datos');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleDownloadPDF() {
    window.open('/api/reports/fleet-status?format=pdf');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estado de Flota</h1>
          <p className="text-muted-foreground text-sm mt-1">Estado operativo de todos los vehículos activos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={loading || !data}>
            <Download className="h-4 w-4 mr-2" /> Descargar PDF
          </Button>
        </div>
      </div>

      {data && (
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{data.total}</p>
              <p className="text-muted-foreground text-sm">Vehículos activos</p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-orange-500">{data.staleCount}</p>
              <p className="text-muted-foreground text-sm">Sin registro +30 días</p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{data.total - data.staleCount}</p>
              <p className="text-muted-foreground text-sm">Con odómetro reciente</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por Vehículo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          {data && !loading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Marca / Línea</TableHead>
                  <TableHead className="text-right">Odómetro</TableHead>
                  <TableHead>Última OT</TableHead>
                  <TableHead>Próx. Mantenimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.vehicles.map((v) => (
                  <TableRow key={v.vehicleId} className={v.stale ? 'bg-orange-50/60' : ''}>
                    <TableCell className="font-medium">{v.plate}</TableCell>
                    <TableCell>{v.brand} ({v.year})</TableCell>
                    <TableCell className="text-right font-mono">
                      {v.odometer != null ? `${v.odometer.toLocaleString()} km` : '—'}
                    </TableCell>
                    <TableCell>{v.lastWorkOrderDate ?? '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={v.nextMaintenanceDesc ?? ''}>
                      {v.nextMaintenanceDesc
                        ? `${v.nextMaintenanceDesc}${v.nextMaintenanceKm ? ` (${v.nextMaintenanceKm.toLocaleString()} km)` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {v.stale
                        ? <Badge variant="outline" className="text-orange-600 border-orange-300">Sin registro</Badge>
                        : <Badge variant="outline" className="text-green-600 border-green-300">OK</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
