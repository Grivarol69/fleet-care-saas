import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { canCreateWorkOrders } from '@/lib/permissions';

const importSchema = z.object({
  packageId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canCreateWorkOrders(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const workOrderId = id;
    if (!workOrderId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const json = await req.json();
    const body = importSchema.parse(json);

    // 1. Verify WorkOrder
    const workOrder = await tenantPrisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      return new NextResponse('Work Order not found', { status: 404 });
    }

    // 2. Fetch Package Items
    const pkg = await tenantPrisma.maintenancePackage.findUnique({
      where: { id: body.packageId },
      include: {
        packageItems: {
          include: { mantItem: true },
        },
      },
    });

    if (!pkg) {
      return new NextResponse('Package not found', { status: 404 });
    }

    // 3. Create WorkOrderItems from Package Items
    // We use a transaction to ensure all or nothing
    await tenantPrisma.$transaction(async tx => {
      // Update WO to reference the package name (optional metadata)
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          packageName: pkg.name,
          isPackageWork: true,
          // We could also update estimatedCost if null
        },
      });

      for (const item of pkg.packageItems) {
        await tx.workOrderItem.create({
          data: {
            tenantId: user.tenantId,
            workOrderId,
            mantItemId: item.mantItemId,
            description: item.mantItem.name,
            quantity: 1,
            unitPrice: 0,
            totalCost: 0,
            status: 'PENDING',
            notes: item.technicalNotes ?? null,
            purchasedBy: user.id,
            supplier: 'Pendiente', // To be filled when purchasing
          },
        });
      }
    });

    return NextResponse.json({ success: true, count: pkg.packageItems.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }
    console.error('[WO_IMPORT_RECIPE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
