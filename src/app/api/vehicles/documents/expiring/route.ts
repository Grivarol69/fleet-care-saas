import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

export async function GET() {
  try {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Obtener documentos que están próximos a vencer o ya vencidos
    const documents = await prisma.document.findMany({
      where: {
        tenantId: TENANT_ID,
        expiryDate: {
          lte: sixtyDaysFromNow // Documentos que vencen en los próximos 60 días
        }
      },
      include: {
        vehicle: true
      },
      orderBy: {
        expiryDate: 'asc'
      }
    });

    // Transformar datos para el formato esperado por el componente
    const documentAlerts = documents.map((doc) => {
      const daysLeft = Math.floor(
        (doc.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      // Determinar estado basado en días restantes
      let status: "danger" | "warning" | "success" = "success";
      if (daysLeft < 0) {
        status = "danger"; // Vencido
      } else if (daysLeft <= 7) {
        status = "danger"; // Crítico: 1-7 días
      } else if (daysLeft <= 30) {
        status = "warning"; // Atención: 8-30 días
      } else {
        status = "success"; // Al día: 31+ días
      }

      // Mapear tipos de documento a nombres más legibles
      const documentTypeNames: Record<string, string> = {
        'SOAT': 'SOAT',
        'TECNOMECANICA': 'Tecnomecánica', 
        'INSURANCE': 'Seguro',
        'REGISTRATION': 'Registro',
        'OTHER': 'Otro'
      };

      return {
        id: doc.id,
        plate: doc.vehicle.licensePlate,
        document: documentTypeNames[doc.type] || doc.type,
        expiryDate: doc.expiryDate!.toISOString().split('T')[0], // Formato YYYY-MM-DD
        daysLeft: Math.max(0, daysLeft), // No mostrar días negativos, pero usar 0 para vencidos
        status: status,
        isExpired: daysLeft < 0
      };
    });

    return NextResponse.json(documentAlerts);
  } catch (error) {
    console.error("[DOCUMENTS_EXPIRING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Opcional: Endpoint para obtener estadísticas resumidas
export async function POST() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Contar documentos por categoría de vencimiento
    const criticalCount = await prisma.document.count({
      where: {
        tenantId: TENANT_ID,
        expiryDate: {
          lte: sevenDaysFromNow
        }
      }
    });

    const warningCount = await prisma.document.count({
      where: {
        tenantId: TENANT_ID,
        expiryDate: {
          gt: sevenDaysFromNow,
          lte: thirtyDaysFromNow
        }
      }
    });

    const okCount = await prisma.document.count({
      where: {
        tenantId: TENANT_ID,
        expiryDate: {
          gt: thirtyDaysFromNow
        }
      }
    });

    const totalCount = await prisma.document.count({
      where: {
        tenantId: TENANT_ID
      }
    });

    return NextResponse.json({
      critical: criticalCount,
      warning: warningCount,
      ok: okCount,
      total: totalCount
    });
  } catch (error) {
    console.error("[DOCUMENTS_STATS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}