import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type RecentInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  status: string;
  supplier: {
    name: string;
  } | null;
  workOrder: {
    vehicle: {
      licensePlate: string;
    };
  } | null;
};

export async function GET() {
  try {
    // TODO: Obtener tenantId de la sesión
    const tenantId = "cf68b103-12fd-4208-a352-42379ef3b6e1";

    const recentInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
      },
      include: {
        supplier: {
          select: {
            name: true,
          },
        },
        workOrder: {
          select: {
            vehicle: {
              select: {
                licensePlate: true,
              },
            },
          },
        },
      },
      orderBy: {
        invoiceDate: "desc",
      },
      take: 10,
    });

    return NextResponse.json(recentInvoices);
  } catch (error) {
    console.error("Error fetching recent invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent invoices" },
      { status: 500 }
    );
  }
}
