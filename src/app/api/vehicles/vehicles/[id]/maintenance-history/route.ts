import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, tenantPrisma } = await requireCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicle = await tenantPrisma.vehicle.findUnique({
      where: { id, tenantId: user.tenantId },
      select: {
        licensePlate: true,
        mileage: true,
        brand: { select: { name: true } },
        line: { select: { name: true } },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    const workOrders = await tenantPrisma.workOrder.findMany({
      where: {
        vehicleId: id,
        tenantId: user.tenantId,
        status: 'COMPLETED',
      },
      orderBy: { endDate: 'desc' },
      include: {
        provider: { select: { name: true } },
        workOrderItems: {
          include: {
            mantItem: { select: { name: true } },
            masterPart: { select: { description: true, code: true } },
            provider: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ vehicle, workOrders });
  } catch (error) {
    console.error('[MAINTENANCE_HISTORY_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
