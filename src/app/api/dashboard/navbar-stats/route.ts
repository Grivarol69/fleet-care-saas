import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        // Get total active vehicles
        const totalVehicles = await prisma.vehicle.count({
            where: {
                tenantId: TENANT_ID,
                status: "ACTIVE"
            }
        });

        // Get critical alerts (PENDING status)
        const criticalAlerts = await prisma.maintenanceAlert.count({
            where: {
                tenantId: TENANT_ID,
                status: "PENDING"
            }
        });

        // Get open work orders (IN_PROGRESS status)
        const openWorkOrders = await prisma.workOrder.count({
            where: {
                tenantId: TENANT_ID,
                status: "IN_PROGRESS"
            }
        });

        // Calculate month costs (mock for now - will be real when Invoice is implemented)
        // TODO: Replace with real calculation from Invoice table when implemented
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        // Mock calculation - will be replaced with:
        // const monthCostsRaw = await prisma.invoice.aggregate({
        //     where: {
        //         tenantId: TENANT_ID,
        //         status: "APPROVED",
        //         createdAt: { gte: currentMonth }
        //     },
        //     _sum: { totalAmount: true }
        // });

        // For now, return mock data
        const monthCosts = "16.8"; // Mock value shown in design

        return NextResponse.json({
            totalVehicles,
            criticalAlerts,
            openWorkOrders,
            monthCosts
        });
    } catch (error) {
        console.error("[NAVBAR_STATS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
