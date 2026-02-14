'use client';

import useSWR from 'swr';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MonthlyData } from '@/app/api/dashboard/financial-evolution/route';

const fetcher = (url: string) => axios.get(url).then(res => res.data);

// Componente de Loading
function LoadingSkeleton() {
  return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-muted-foreground">Cargando evolución...</p>
      </div>
    </div>
  );
}

// Componente de Error
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div>
          <h3 className="font-semibold text-lg">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No se pudo cargar la evolución de gastos
          </p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          Reintentar
        </Button>
      </div>
    </div>
  );
}

// Componente de Estado Vacío
function EmptyState() {
  return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p className="text-lg font-medium">Sin datos históricos</p>
        <p className="text-sm mt-1">
          Los gastos aparecerán aquí una vez que registres facturas
        </p>
      </div>
    </div>
  );
}

// Tooltip personalizado
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: MonthlyData;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900">{data.month}</p>
        <p className="text-2xl font-bold text-indigo-600 mt-1">
          ${data.spent.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {data.invoiceCount} factura{data.invoiceCount !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
}

export function EvolutionChart() {
  const { data, error, isLoading, mutate } = useSWR<MonthlyData[]>(
    '/api/dashboard/financial-evolution',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Calcular totales para el resumen
  const totalSpent = data?.reduce((sum, month) => sum + month.spent, 0) || 0;
  const totalInvoices =
    data?.reduce((sum, month) => sum + month.invoiceCount, 0) || 0;
  const hasData = data && data.some(month => month.spent > 0);

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolución de Gastos - Últimos 12 Meses
            </CardTitle>
            <p className="text-indigo-100 text-sm mt-1">
              Tendencia histórica de gastos en mantenimiento
            </p>
          </div>
          {hasData && (
            <div className="text-right">
              <p className="text-xs text-indigo-200">Total 12 meses</p>
              <p className="text-xl font-bold">
                ${totalSpent.toLocaleString()}
              </p>
              <p className="text-xs text-indigo-200">
                {totalInvoices} facturas
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => mutate()} />}
        {!isLoading && !error && !hasData && <EmptyState />}
        {!isLoading && !error && hasData && (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="monthShort"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis
                  tickFormatter={value => {
                    if (value >= 1000000)
                      return `$${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                    return `$${value}`;
                  }}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="line"
                  formatter={() => 'Gastos'}
                />
                <Line
                  type="monotone"
                  dataKey="spent"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ fill: '#4f46e5', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Gastos"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
