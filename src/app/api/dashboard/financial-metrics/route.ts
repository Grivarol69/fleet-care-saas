import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export type VehicleExpense = {
  rank: number;
  licensePlate: string;
  vehicle: string;
  vehicleId: number;
  spent: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
  invoiceCount: number;
};

export type MaintenanceTypeData = {
  name: string;
  value: number;
  percentage: number;
  color: string;
};

export type CategoryData = {
  name: string;
  value: number;
  percentage: number;
  color: string;
};

export type KPIData = {
  totalSpent: number;
  previousMonthSpent: number;
  trendPercentage: number;
  averagePerVehicle: number;
  invoiceCount: number;
  pendingInvoicesAmount: number;
  pendingInvoicesCount: number;
};

export type FinancialMetricsResponse = {
  vehicleExpenses: VehicleExpense[];
  otherVehicles: {
    count: number;
    spent: number;
    percentage: number;
  };
  maintenanceType: MaintenanceTypeData[];
  categories: CategoryData[];
  kpis: KPIData;
  period: {
    month: number;
    year: number;
    label: string;
  };
};

const CATEGORY_COLORS: Record<string, string> = {
  MOTOR: '#ef4444',
  FRENOS: '#8b5cf6',
  LUBRICANTES: '#3b82f6',
  ACEITES: '#3b82f6',
  FILTROS: '#60a5fa',
  LLANTAS: '#f97316',
  NEUMATICOS: '#f97316',
  SUSPENSION: '#10b981',
  ELECTRICO: '#f59e0b',
  TRANSMISION: '#a855f7',
  CARROCERIA: '#ec4899',
  OTROS: '#6b7280',
};

/** Normaliza el nombre de categoría para el lookup de colores:
 *  elimina tildes, pasa a mayúsculas.
 *  Ej: "Neumáticos" → "NEUMATICOS", "Motor" → "MOTOR"
 */
function normalizeCategoryKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId;

    // Calcular fechas del mes actual y anterior
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
      23,
      59,
      59
    );

    const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfPreviousMonth = new Date(
      currentYear,
      currentMonth,
      0,
      23,
      59,
      59
    );

    // ============================================
    // 1. GASTOS POR VEHÍCULO (MES ACTUAL)
    // ============================================

    const currentMonthInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
        status: { in: ['APPROVED', 'PAID'] },
        workOrderId: { not: null },
      },
      include: {
        workOrder: {
          include: {
            vehicle: {
              include: {
                brand: { select: { name: true } },
                line: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Gastos mes anterior (para tendencias)
    const previousMonthInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: {
          gte: startOfPreviousMonth,
          lte: endOfPreviousMonth,
        },
        status: { in: ['APPROVED', 'PAID'] },
        workOrderId: { not: null },
      },
      include: {
        workOrder: {
          select: {
            vehicleId: true,
          },
        },
      },
    });

    // Agrupar por vehículo (mes actual)
    const vehicleExpensesMap = new Map<
      number,
      {
        licensePlate: string;
        vehicle: string;
        spent: number;
        invoiceCount: number;
      }
    >();

    let totalCurrentMonthSpent = 0;

    currentMonthInvoices.forEach(invoice => {
      if (!invoice.workOrder) return;

      const vehicleId = invoice.workOrder.vehicleId;
      const amount = Number(invoice.totalAmount);
      totalCurrentMonthSpent += amount;

      if (!vehicleExpensesMap.has(vehicleId)) {
        vehicleExpensesMap.set(vehicleId, {
          licensePlate: invoice.workOrder.vehicle.licensePlate,
          vehicle: `${invoice.workOrder.vehicle.brand.name} ${invoice.workOrder.vehicle.line.name}`,
          spent: 0,
          invoiceCount: 0,
        });
      }

      const current = vehicleExpensesMap.get(vehicleId)!;
      current.spent += amount;
      current.invoiceCount += 1;
    });

    // Agrupar por vehículo (mes anterior) para tendencias
    const previousVehicleExpensesMap = new Map<number, number>();
    let totalPreviousMonthSpent = 0;

    previousMonthInvoices.forEach(invoice => {
      if (!invoice.workOrder) return;

      const vehicleId = invoice.workOrder.vehicleId;
      const amount = Number(invoice.totalAmount);
      totalPreviousMonthSpent += amount;

      if (!previousVehicleExpensesMap.has(vehicleId)) {
        previousVehicleExpensesMap.set(vehicleId, 0);
      }

      previousVehicleExpensesMap.set(
        vehicleId,
        previousVehicleExpensesMap.get(vehicleId)! + amount
      );
    });

    // Convertir a array y calcular tendencias
    const vehicleExpensesArray = Array.from(vehicleExpensesMap.entries())
      .map(([vehicleId, data]) => {
        const previousSpent = previousVehicleExpensesMap.get(vehicleId) || 0;
        let trend: 'up' | 'down' | 'neutral' = 'neutral';

        if (previousSpent > 0) {
          const change = ((data.spent - previousSpent) / previousSpent) * 100;
          if (change > 5) trend = 'up';
          else if (change < -5) trend = 'down';
        } else if (data.spent > 0) {
          trend = 'up';
        }

        return {
          vehicleId,
          ...data,
          trend,
          percentage: 0, // Se calculará después
          rank: 0,
        };
      })
      .sort((a, b) => b.spent - a.spent);

    // Calcular porcentajes y ranks
    vehicleExpensesArray.forEach((expense, index) => {
      expense.percentage =
        totalCurrentMonthSpent > 0
          ? Math.round((expense.spent / totalCurrentMonthSpent) * 100)
          : 0;
      expense.rank = index + 1;
    });

    // Top 5 y otros
    const top5 = vehicleExpensesArray.slice(0, 5);
    const others = vehicleExpensesArray.slice(5);

    const otherVehicles = {
      count: others.length,
      spent: others.reduce((sum, v) => sum + v.spent, 0),
      percentage: others.reduce((sum, v) => sum + v.percentage, 0),
    };

    // ============================================
    // 2. PREVENTIVO VS CORRECTIVO
    // ============================================

    const maintenanceTypeAgg = await prisma.invoice.groupBy({
      by: ['workOrderId'],
      where: {
        tenantId,
        invoiceDate: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
        status: { in: ['APPROVED', 'PAID'] },
        workOrderId: { not: null },
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Obtener tipos de cada WorkOrder
    const workOrderIds = maintenanceTypeAgg
      .map(agg => agg.workOrderId)
      .filter((id): id is number => id !== null);

    const workOrders = await prisma.workOrder.findMany({
      where: {
        id: { in: workOrderIds },
      },
      select: {
        id: true,
        mantType: true,
      },
    });

    const workOrderTypeMap = new Map(
      workOrders.map(wo => [wo.id, wo.mantType])
    );

    let preventiveSpent = 0;
    let correctiveSpent = 0;

    maintenanceTypeAgg.forEach(agg => {
      const amount = Number(agg._sum.totalAmount || 0);
      const mantType = workOrderTypeMap.get(agg.workOrderId!);

      if (mantType === 'PREVENTIVE' || mantType === 'PREDICTIVE') {
        preventiveSpent += amount;
      } else if (mantType === 'CORRECTIVE' || mantType === 'EMERGENCY') {
        correctiveSpent += amount;
      }
    });

    const maintenanceTypeTotal = preventiveSpent + correctiveSpent;

    const maintenanceType: MaintenanceTypeData[] = [
      {
        name: 'Preventivo',
        value: preventiveSpent,
        percentage:
          maintenanceTypeTotal > 0
            ? Math.round((preventiveSpent / maintenanceTypeTotal) * 100)
            : 0,
        color: '#10b981',
      },
      {
        name: 'Correctivo',
        value: correctiveSpent,
        percentage:
          maintenanceTypeTotal > 0
            ? Math.round((correctiveSpent / maintenanceTypeTotal) * 100)
            : 0,
        color: '#ef4444',
      },
    ];

    // ============================================
    // 3. GASTO POR CATEGORÍA
    // ============================================

    const invoicesWithItems = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
        status: { in: ['APPROVED', 'PAID'] },
      },
      include: {
        items: {
          include: {
            workOrderItem: {
              include: {
                mantItem: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const categoryMap = new Map<string, number>();

    invoicesWithItems.forEach(invoice => {
      invoice.items.forEach(item => {
        const categoryName =
          item.workOrderItem?.mantItem?.category?.name || 'OTROS';
        const amount = Number(item.total);

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, 0);
        }

        categoryMap.set(categoryName, categoryMap.get(categoryName)! + amount);
      });
    });

    const categoriesArray = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: 0,
        color: (CATEGORY_COLORS[normalizeCategoryKey(name)] ||
          CATEGORY_COLORS['OTROS']) as string,
      }))
      .sort((a, b) => b.value - a.value);

    // Calcular porcentajes
    const totalCategorySpent = categoriesArray.reduce(
      (sum, cat) => sum + cat.value,
      0
    );

    categoriesArray.forEach(category => {
      category.percentage =
        totalCategorySpent > 0
          ? Math.round((category.value / totalCategorySpent) * 100)
          : 0;
    });

    // ============================================
    // 4. KPIs
    // ============================================

    const trendPercentage =
      totalPreviousMonthSpent > 0
        ? Math.round(
            ((totalCurrentMonthSpent - totalPreviousMonthSpent) /
              totalPreviousMonthSpent) *
              100
          )
        : 0;

    const activeVehiclesCount = await prisma.vehicle.count({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });

    // Facturas pendientes (por aprobar o pagar)
    const pendingInvoices = await prisma.invoice.aggregate({
      where: {
        tenantId,
        status: 'PENDING', // Facturas pendientes de aprobación
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    const kpis: KPIData = {
      totalSpent: totalCurrentMonthSpent,
      previousMonthSpent: totalPreviousMonthSpent,
      trendPercentage,
      averagePerVehicle:
        activeVehiclesCount > 0
          ? totalCurrentMonthSpent / activeVehiclesCount
          : 0,
      invoiceCount: currentMonthInvoices.length,
      pendingInvoicesAmount: Number(pendingInvoices._sum?.totalAmount ?? 0),
      pendingInvoicesCount: pendingInvoices._count,
    };

    // ============================================
    // RESPUESTA
    // ============================================

    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const response: FinancialMetricsResponse = {
      vehicleExpenses: top5,
      otherVehicles,
      maintenanceType,
      categories: categoriesArray,
      kpis,
      period: {
        month: currentMonth + 1,
        year: currentYear,
        label: `${monthNames[currentMonth]} ${currentYear}`,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching financial metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial metrics' },
      { status: 500 }
    );
  }
}
