
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const importSchema = z.object({
    packageId: z.number()
});

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const workOrderId = parseInt(params.id);
        const json = await req.json();
        const body = importSchema.parse(json);

        // 1. Verify WorkOrder
        const workOrder = await prisma.workOrder.findUnique({
            where: { id: workOrderId, tenantId: user.tenantId }
        });

        if (!workOrder) {
            return new NextResponse("Work Order not found", { status: 404 });
        }

        // 2. Fetch Package Items
        const pkg = await prisma.maintenancePackage.findUnique({
            where: { id: body.packageId },
            include: {
                packageItems: {
                    include: { mantItem: true }
                }
            }
        });

        if (!pkg) {
            return new NextResponse("Package not found", { status: 404 });
        }

        // 3. Create WorkOrderItems from Package Items
        // We use a transaction to ensure all or nothing
        await prisma.$transaction(async (tx) => {
            // Update WO to reference the package name (optional metadata)
            await tx.workOrder.update({
                where: { id: workOrderId },
                data: {
                    packageName: pkg.name,
                    isPackageWork: true,
                    // We could also update estimatedCost if null
                }
            });

            for (const item of pkg.packageItems) {
                await tx.workOrderItem.create({
                    data: {
                        workOrderId,
                        mantItemId: item.mantItemId,
                        description: item.mantItem.name,
                        quantity: 1,
                        unitPrice: 0,
                        totalCost: 0,
                        status: 'PENDING',
                        notes: item.technicalNotes ?? null,
                        purchasedBy: user.id,
                        supplier: 'Pendiente' // To be filled when purchasing
                    }
                });
            }
        });

        return NextResponse.json({ success: true, count: pkg.packageItems.length });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 });
        }
        console.error("[WO_IMPORT_RECIPE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
