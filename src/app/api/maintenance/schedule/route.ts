import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

export async function GET() {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [workOrders, alerts] = await Promise.all([
    tenantPrisma.workOrder.findMany({
      where: {
        startDate: { not: null },
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        notes: true,
        priority: true,
        status: true,
        vehicle: {
          select: { licensePlate: true },
        },
      },
    }),
    tenantPrisma.maintenanceAlert.findMany({
      where: {
        workOrderId: null,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
      },
      select: {
        id: true,
        itemName: true,
        kmToMaintenance: true,
        alertLevel: true,
        vehicle: {
          select: { licensePlate: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    scheduledWorkOrders: workOrders.map(wo => ({
      id: wo.id,
      title: wo.title,
      startDate: wo.startDate!.toISOString(),
      endDate: wo.endDate ? wo.endDate.toISOString() : null,
      notes: wo.notes ?? null,
      priority: wo.priority,
      status: wo.status,
      vehicle: { licensePlate: wo.vehicle.licensePlate },
    })),
    pendingAlerts: alerts.map(a => ({
      id: a.id,
      itemName: a.itemName,
      vehiclePlate: a.vehicle.licensePlate,
      kmToMaintenance: a.kmToMaintenance,
      alertLevel: a.alertLevel,
    })),
  });
}
