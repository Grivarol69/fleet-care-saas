import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { requireCurrentUser } from '@/lib/auth';
import { canViewCosts } from '@/lib/permissions';
import { FleetStatusPDF } from '@/components/reports/pdf/FleetStatusPDF';

const STALE_DAYS = 30;

export async function GET(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewCosts(user)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') ?? 'json';

  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - STALE_DAYS);

  const vehicles = await tenantPrisma.vehicle.findMany({
    where: { status: 'ACTIVE' },
    include: {
      brand: true,
      line: true,
      odometerLogs: {
        orderBy: { recordedAt: 'desc' },
        take: 1,
      },
      workOrders: {
        where: { status: 'COMPLETED' },
        orderBy: { endDate: 'desc' },
        take: 1,
      },
      vehicleMantProgram: {
        select: {
          nextMaintenanceDesc: true,
          nextMaintenanceKm: true,
        },
      },
    },
    orderBy: { licensePlate: 'asc' },
  });

  const rows = vehicles.map((v) => {
    const lastLog = v.odometerLogs[0] ?? null;
    const lastWO = v.workOrders[0] ?? null;
    const stale = !lastLog || new Date(lastLog.recordedAt) < staleThreshold;

    return {
      vehicleId: v.id,
      plate: v.licensePlate,
      brand: `${v.brand.name} ${v.line.name}`,
      year: v.year,
      odometer: lastLog?.kilometers ?? null,
      lastWorkOrderDate: lastWO?.endDate ? lastWO.endDate.toISOString().split('T')[0] : null,
      nextMaintenanceDesc: v.vehicleMantProgram?.nextMaintenanceDesc ?? null,
      nextMaintenanceKm: v.vehicleMantProgram?.nextMaintenanceKm ?? null,
      stale,
    };
  });

  if (format === 'pdf') {
    const generatedAt = new Date().toLocaleDateString('es-CO');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(React.createElement(FleetStatusPDF, { vehicles: rows, generatedAt }) as any);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="estado-flota-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  }

  return NextResponse.json({ vehicles: rows, total: rows.length, staleCount: rows.filter((r) => r.stale).length });
}
