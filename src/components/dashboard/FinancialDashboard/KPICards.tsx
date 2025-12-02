import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, TrendingUpDown, AlertTriangle } from "lucide-react";
import type { FinancialMetricsResponse } from "@/app/api/dashboard/financial-metrics/route";

interface KPICardsProps {
  data: FinancialMetricsResponse;
}

export function KPICards({ data }: KPICardsProps) {
  const { kpis, period } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Gasto del Mes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Gasto del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            ${kpis.totalSpent.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {period.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {kpis.invoiceCount} facturas
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Promedio por Vehículo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUpDown className="h-4 w-4" />
            Promedio /Vehículo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-600">
            ${Math.round(kpis.averagePerVehicle).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Costo promedio mensual
          </p>
          <p className="text-xs text-muted-foreground">
            por vehículo activo
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Facturas Pendientes */}
      <Card className={
        kpis.pendingInvoicesCount > 0
          ? "border-yellow-300 bg-yellow-50"
          : "border-gray-200"
      }>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
            kpis.pendingInvoicesCount > 0 ? "text-yellow-800" : "text-muted-foreground"
          }`}>
            <AlertTriangle className="h-4 w-4" />
            Facturas Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            kpis.pendingInvoicesCount > 0 ? "text-yellow-900" : "text-gray-400"
          }`}>
            ${kpis.pendingInvoicesAmount.toLocaleString()}
          </div>
          <p className={`text-xs mt-1 ${
            kpis.pendingInvoicesCount > 0 ? "text-yellow-700" : "text-muted-foreground"
          }`}>
            {kpis.pendingInvoicesCount > 0
              ? `${kpis.pendingInvoicesCount} factura${kpis.pendingInvoicesCount !== 1 ? 's' : ''} por aprobar`
              : "Sin facturas pendientes"
            }
          </p>
          {kpis.pendingInvoicesCount > 0 && (
            <p className="text-xs text-yellow-700">
              Requiere atención
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 4: Variación vs Mes Anterior */}
      <Card className={
        kpis.trendPercentage > 0
          ? "border-red-300 bg-red-50"
          : kpis.trendPercentage < 0
            ? "border-green-300 bg-green-50"
            : "border-gray-200"
      }>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {kpis.trendPercentage > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            vs Mes Anterior
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold flex items-center gap-2 ${
            kpis.trendPercentage > 0
              ? "text-red-600"
              : kpis.trendPercentage < 0
                ? "text-green-600"
                : "text-gray-600"
          }`}>
            {kpis.trendPercentage > 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : kpis.trendPercentage < 0 ? (
              <TrendingDown className="h-5 w-5" />
            ) : null}
            {kpis.trendPercentage === 0 ? "0%" : `${kpis.trendPercentage > 0 ? "+" : ""}${kpis.trendPercentage}%`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ${kpis.previousMonthSpent.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            mes anterior
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
