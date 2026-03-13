import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total active vehicles
    const totalVehicles = await tenantPrisma.vehicle.count({
      where: {
        status: 'ACTIVE',
      },
    });

    // Get critical alerts (PENDING status)
    const criticalAlerts = await tenantPrisma.maintenanceAlert.count({
      where: {
        status: 'PENDING',
      },
    });

    // Get open work orders (IN_PROGRESS status)
    const openWorkOrders = await tenantPrisma.workOrder.count({
      where: {
        status: 'IN_PROGRESS',
      },
    });

    // Calculate month costs (mock for now - will be real when Invoice is implemented)
    // TODO: Replace with real calculation from Invoice table when implemented
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Mock calculation - will be replaced with:
    // const monthCostsRaw = await tenantPrisma.invoice.aggregate({
    //     where: {
    //         //         status: "APPROVED",
    //         createdAt: { gte: currentMonth }
    //     },
    //     _sum: { totalAmount: true }
    // });

    // For now, return mock data
    const monthCosts = '16.8'; // Mock value shown in design

    return NextResponse.json({
      totalVehicles,
      criticalAlerts,
      openWorkOrders,
      monthCosts,
    });
  } catch (error) {
    console.error('[NAVBAR_STATS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
