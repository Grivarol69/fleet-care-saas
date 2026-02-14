'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';

type DocumentAlert = {
  id: string;
  plate: string;
  document: string;
  expiryDate: string;
  daysLeft: number;
  status: 'danger' | 'warning' | 'success';
  isExpired: boolean;
};

type DocumentStats = {
  critical: number;
  warning: number;
  ok: number;
  total: number;
};

export const DocumentStats = () => {
  const [documentAlerts, setDocumentAlerts] = useState<DocumentAlert[]>([]);
  const [stats, setStats] = useState<DocumentStats>({
    critical: 0,
    warning: 0,
    ok: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocumentAlerts = useCallback(async () => {
    try {
      // Obtener documentos que están próximos a vencer
      const [alertsResponse, statsResponse] = await Promise.all([
        axios.get(`/api/vehicles/documents/expiring`),
        axios.post(`/api/vehicles/documents/expiring`), // POST para obtener estadísticas
      ]);

      // Filtrar solo documentos que necesitan atención (no mostrar los que están "Al día")
      const filteredAlerts = alertsResponse.data.filter(
        (alert: DocumentAlert) =>
          alert.status === 'danger' || alert.status === 'warning'
      );

      setDocumentAlerts(filteredAlerts);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching Document Alerts: ', error);
      toast({
        title: 'Error fetching Document Alerts',
        description: 'Please try again later',
        variant: 'destructive',
      });
      // Fallback a datos vacíos
      setDocumentAlerts([]);
      setStats({ critical: 0, warning: 0, ok: 0, total: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocumentAlerts();
  }, [fetchDocumentAlerts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'danger':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documentos por Vencer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando documentos...</div>
        </CardContent>
      </Card>
    );
  }

  const getDocumentIcon = (docName: string) => {
    const lower = docName.toLowerCase();
    if (lower.includes('soat')) return '🛡️';
    if (
      lower.includes('tecno') ||
      lower.includes('mecánica') ||
      lower.includes('mecanica')
    )
      return '🔧';
    if (
      lower.includes('seguro') ||
      lower.includes('póliza') ||
      lower.includes('poliza') ||
      lower.includes('insurance')
    )
      return '📋';
    if (
      lower.includes('propiedad') ||
      lower.includes('registro') ||
      lower.includes('registration')
    )
      return '📄';
    return '📄';
  };

  return (
    <Card className="overflow-hidden">
      {/* Header con gradient azul */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📄</span>
          <h3 className="text-lg font-semibold">Documentos por Vencer</h3>
        </div>

        {/* Resumen de números */}
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl">{stats.critical}</span>
            <span className="opacity-90">Críticos ≤ 15 días</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl">{stats.warning}</span>
            <span className="opacity-90">Atención ≤ 45 días</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl">{stats.ok}</span>
            <span className="opacity-90">Al día {'>'} 45 días</span>
          </div>
        </div>
      </div>
      <CardContent>
        {documentAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium">
              ¡No hay alertas de documentos!
            </p>
            <p className="text-sm">
              Todos los documentos están al día o en estado normal
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentAlerts.map(alert => (
                <TableRow
                  key={alert.id}
                  className={`border-l-4 ${
                    alert.status === 'danger'
                      ? 'bg-red-50/50 border-l-red-400 hover:bg-red-50'
                      : 'bg-yellow-50/50 border-l-yellow-400 hover:bg-yellow-50'
                  } transition-colors`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${alert.status === 'danger' ? 'bg-red-500' : 'bg-yellow-500'}`}
                      ></span>
                      {alert.plate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {getDocumentIcon(alert.document)}
                      </span>
                      {alert.document}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col gap-1">
                      <span>
                        {new Date(alert.expiryDate).toLocaleDateString()}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          alert.isExpired
                            ? 'bg-red-100 text-red-700'
                            : alert.status === 'danger'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {alert.isExpired
                          ? '⚠️ Vencido'
                          : `En ${alert.daysLeft} días`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        alert.status
                      )}`}
                    >
                      {alert.status === 'danger' ? (
                        <span className="flex items-center gap-1">
                          🔺 Crítico
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          ⚠️ Atención
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {/* Footer con total de documentos */}
        <div className="mt-4 pt-4 border-t text-sm text-gray-600 text-center">
          Total de documentos monitoreados: {stats.total}
        </div>
      </CardContent>
    </Card>
  );
};
