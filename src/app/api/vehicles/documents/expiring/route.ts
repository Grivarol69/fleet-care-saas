import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Obtener documentos que están próximos a vencer o ya vencidos
    const documents = await tenantPrisma.document.findMany({
      where: {
        expiryDate: {
          lte: sixtyDaysFromNow, // Documentos que vencen en los próximos 60 días
        },
      },
      include: {
        vehicle: true,
        documentType: true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    // Transformar datos para el formato esperado por el componente
    const documentAlerts = documents.map(doc => {
      const daysLeft = Math.floor(
        (doc.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Use config thresholds if available, otherwise fall back to defaults
      const criticalDays = doc.documentType.expiryCriticalDays;
      const warningDays = doc.documentType.expiryWarningDays;

      let status: 'danger' | 'warning' | 'success' = 'success';
      if (daysLeft < 0) {
        status = 'danger'; // Vencido
      } else if (daysLeft <= criticalDays) {
        status = 'danger'; // Crítico
      } else if (daysLeft <= warningDays) {
        status = 'warning'; // Atención
      } else {
        status = 'success'; // Al día
      }

      return {
        id: doc.id,
        plate: doc.vehicle.licensePlate,
        document: doc.documentType.name,
        expiryDate: doc.expiryDate!.toISOString().split('T')[0],
        daysLeft: Math.max(0, daysLeft),
        status: status,
        isExpired: daysLeft < 0,
      };
    });

    return NextResponse.json(documentAlerts);
  } catch (error) {
    console.error('[DOCUMENTS_EXPIRING_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// Endpoint para obtener estadísticas resumidas
export async function POST() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    // Contar documentos por categoría de vencimiento
    const criticalCount = await tenantPrisma.document.count({
      where: {
        expiryDate: {
          lte: sevenDaysFromNow,
        },
      },
    });

    const warningCount = await tenantPrisma.document.count({
      where: {
        expiryDate: {
          gt: sevenDaysFromNow,
          lte: thirtyDaysFromNow,
        },
      },
    });

    const okCount = await tenantPrisma.document.count({
      where: {
        expiryDate: {
          gt: thirtyDaysFromNow,
        },
      },
    });

    const totalCount = await tenantPrisma.document.count({
      where: {
        },
    });

    return NextResponse.json({
      critical: criticalCount,
      warning: warningCount,
      ok: okCount,
      total: totalCount,
    });
  } catch (error) {
    console.error('[DOCUMENTS_STATS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
