import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';

export type MonthlyData = {
  month: string;       // "Ene 2025"
  monthShort: string;  // "Ene"
  year: number;
  spent: number;
  invoiceCount: number;
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.tenantId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const tenantId = user.tenantId;

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const monthNamesShort = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];

    const last12Months: MonthlyData[] = [];
    const now = new Date();

    // Generar datos para los últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      const startOfMonth = new Date(year, monthIndex, 1);
      const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);

      // Agregar invoices del mes
      const invoices = await prisma.invoice.aggregate({
        where: {
          tenantId,
          invoiceDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: { in: ["APPROVED", "PAID"] },
        },
        _sum: {
          totalAmount: true,
        },
        _count: true,
      });

      last12Months.push({
        month: `${monthNames[monthIndex]} ${year}`,
        monthShort: monthNamesShort[monthIndex] ?? "",
        year,
        spent: Number(invoices._sum?.totalAmount ?? 0),
        invoiceCount: invoices._count,
      });
    }

    return NextResponse.json(last12Months);
  } catch (error) {
    console.error("Error fetching financial evolution:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial evolution" },
      { status: 500 }
    );
  }
}
