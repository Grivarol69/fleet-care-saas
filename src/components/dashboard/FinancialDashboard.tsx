"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, DollarSign, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import axios from "axios";
import type { FinancialMetricsResponse } from "@/app/api/dashboard/financial-metrics/route";
import { KPICards } from "./FinancialDashboard/KPICards";
import { EvolutionChart } from "./FinancialDashboard/EvolutionChart";
import { RecentInvoicesTable } from "./FinancialDashboard/RecentInvoicesTable";

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

// Tipos para Recharts
interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

interface ChartDataEntry {
  value: number;
  percentage: number;
  [key: string]: unknown;
}

// Componente de Loading
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">Cargando métricas financieras...</p>
      </div>
    </div>
  );
}

// Componente de Error
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div>
              <h3 className="font-semibold text-lg">Error al cargar datos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No se pudieron cargar las métricas financieras
              </p>
            </div>
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Tabla de Gastos por Vehículo
function VehicleExpensesTable({
  data
}: {
  data: FinancialMetricsResponse
}) {
  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Gastos por Vehículo - {data.period.label}
        </CardTitle>
        <p className="text-blue-100 text-sm">
          ¿Qué vehículos están costando más?
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead className="text-right">Gastado</TableHead>
              <TableHead className="text-center">% del Total</TableHead>
              <TableHead className="text-center">Tendencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.vehicleExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay datos de gastos para este mes
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data.vehicleExpenses.map((vehicle) => (
                  <TableRow
                    key={vehicle.rank}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <TableCell className="text-center font-bold text-blue-600">
                      {vehicle.rank}
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      {vehicle.licensePlate}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.vehicle}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${vehicle.spent.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {vehicle.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(vehicle.trend)}
                        {vehicle.rank === 1 && vehicle.trend === "up" && (
                          <span className="text-xs text-red-500 font-medium">⚠️</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data.otherVehicles.count > 0 && (
                  <TableRow className="bg-gray-50 hover:bg-gray-100">
                    <TableCell className="text-center text-muted-foreground">
                      ...
                    </TableCell>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      Otros ({data.otherVehicles.count} vehículos)
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${data.otherVehicles.spent.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {data.otherVehicles.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-blue-100 border-t-2 border-blue-300 font-bold">
                  <TableCell colSpan={3} className="text-right text-blue-900">
                    TOTAL:
                  </TableCell>
                  <TableCell className="text-right text-blue-900 text-lg">
                    ${data.kpis.totalSpent.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center text-blue-900">100%</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Componente de Donut Chart Preventivo vs Correctivo
function MaintenanceTypeChart({
  data
}: {
  data: FinancialMetricsResponse
}) {
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: PieLabelProps) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const preventivePercentage = data.maintenanceType.find(
    (item) => item.name === "Preventivo"
  )?.percentage || 0;

  const getMessage = () => {
    if (preventivePercentage >= 70) {
      return "✅ Excelente balance: La mayoría de tu gasto es en mantenimiento preventivo";
    } else if (preventivePercentage >= 50) {
      return "⚠️ Balance aceptable: Podrías mejorar el mantenimiento preventivo";
    } else {
      return "❌ Alerta: Demasiado gasto en mantenimiento correctivo";
    }
  };

  const getMessageColor = () => {
    if (preventivePercentage >= 70) return "bg-green-50 border-green-200 text-green-800";
    if (preventivePercentage >= 50) return "bg-yellow-50 border-yellow-200 text-yellow-800";
    return "bg-red-50 border-red-200 text-red-800";
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <CardTitle className="text-lg">Preventivo vs Correctivo</CardTitle>
        <p className="text-green-100 text-sm">¿Estoy previniendo o apagando incendios?</p>
      </CardHeader>
      <CardContent className="pt-6">
        {data.maintenanceType.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No hay datos de mantenimiento
          </div>
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.maintenanceType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.maintenanceType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string, entry: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                      const payload = entry.payload as ChartDataEntry;
                      return (
                        <span className="text-sm">
                          {value}: ${payload.value.toLocaleString()} ({payload.percentage}%)
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={`mt-4 p-4 rounded-lg border ${getMessageColor()}`}>
              <p className="text-sm font-medium">
                {getMessage()}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de Pie Chart por Categoría
function CategoryExpensesChart({
  data
}: {
  data: FinancialMetricsResponse
}) {
  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardTitle className="text-lg">Gasto por Categoría</CardTitle>
        <p className="text-purple-100 text-sm">¿En qué se va la plata?</p>
      </CardHeader>
      <CardContent className="pt-6">
        {data.categories.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No hay datos de categorías
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ percentage }) => `${percentage}%`}
                >
                  {data.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend
                  verticalAlign="bottom"
                  height={60}
                  formatter={(value: string, entry: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    const payload = entry.payload as ChartDataEntry;
                    return (
                      <span className="text-xs">
                        {value} ({payload.percentage}%)
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente principal
export function FinancialDashboard() {
  const { data, error, isLoading, mutate } = useSWR<FinancialMetricsResponse>(
    "/api/dashboard/financial-metrics",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header con periodo y botón refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Métricas Financieras</h2>
          <p className="text-sm text-muted-foreground">{data.period.label}</p>
        </div>
        <Button
          onClick={() => mutate()}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Cards de KPIs principales */}
      <KPICards data={data} />

      {/* Gráfico de evolución 12 meses */}
      <EvolutionChart />

      {/* Tabla de ranking de vehículos */}
      <VehicleExpensesTable data={data} />

      {/* Gráficos de torta/donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaintenanceTypeChart data={data} />
        <CategoryExpensesChart data={data} />
      </div>

      {/* Tabla de facturas recientes */}
      <RecentInvoicesTable />
    </div>
  );
}
