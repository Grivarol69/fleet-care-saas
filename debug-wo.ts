import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const TENANT_ID = 'org_36M1mCUcHm4ShrsTQQK3etw9FEk';
    // Get vehicle B (Alert Active)
    const vehicle = await prisma.vehicle.findFirst({
        where: { licensePlate: 'TEST-002', tenantId: TENANT_ID }
    });

    if (!vehicle) {
        console.error('Vehicle TEST-002 not found');
        return;
    }

    // Get alerts
    const alerts = await prisma.maintenanceAlert.findMany({
        where: { vehicleId: vehicle.id, status: 'PENDING', tenantId: TENANT_ID }
    });

    if (alerts.length === 0) {
        console.error('No pending alerts found for TEST-002');
        return;
    }

    const payload = {
        vehicleId: vehicle.id,
        alertIds: alerts.map(a => a.id),
        title: 'Test Order Debug',
        description: 'Generated from debug script',
        priority: 'MEDIUM',
        mantType: 'PREVENTIVE'
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    // Simulate API logic locally to see where it breaks,
    // since we cannot run a real HTTP POST to localhost from here easily without auth headers.
    // We will call the logic functions directly.

    console.log('--- Simulating API Logic ---');

    // Logic 1: Fetch alerts with parts
    const alertsWithParts = await prisma.maintenanceAlert.findMany({
        where: {
            id: { in: payload.alertIds },
            status: { in: ["PENDING", "ACKNOWLEDGED", "SNOOZED"] },
            vehicleId: vehicle.id,
            tenantId: TENANT_ID,
        },
        include: {
            programItem: {
                include: {
                    mantItem: {
                        include: {
                            parts: {
                                include: {
                                    masterPart: {
                                        select: { referencePrice: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    console.log(`Found ${alertsWithParts.length} full alerts.`);

    // Logic 2: Calculate Cost
    const alertCosts = alertsWithParts.map((alert, index) => {
        console.log(`Processing Alert #${index}: ${alert.itemName}`);

        const programItemCost = alert.programItem.estimatedCost?.toNumber();
        console.log(`- programItemCost: ${programItemCost}`);

        if (programItemCost && programItemCost > 0) return programItemCost;

        const mantItem = alert.programItem.mantItem;
        console.log(`- mantItem: ${mantItem.name}, parts count: ${mantItem.parts?.length}`);

        if (!mantItem.parts) {
            console.log('!! mantItem.parts is undefined or null !!');
            return 0;
        }

        const partsCost = mantItem.parts.reduce(
            (sum, part) => {
                const price = part.masterPart.referencePrice?.toNumber() || 0;
                const qty = Number(part.quantity) || 1;
                console.log(`  - Part: price=${price}, qty=${qty}`);
                return sum + price * qty;
            },
            0
        );
        console.log(`- Calc partsCost: ${partsCost}`);

        if (partsCost > 0) return partsCost;

        const alertCost = alert.estimatedCost?.toNumber();
        console.log(`- alertCost snapshot: ${alertCost}`);

        return alertCost || 0;
    });

    const estimatedCost = alertCosts.reduce((sum, cost) => sum + cost, 0);
    console.log('Total Estimated Cost:', estimatedCost);


    // Logic 4: Create WorkOrder
    console.log('Creating WorkOrder...');
    const result = await prisma.workOrder.create({
        data: {
            tenantId: TENANT_ID,
            vehicleId: vehicle.id,
            title: payload.title,
            description: payload.description,
            mantType: 'PREVENTIVE',
            priority: 'MEDIUM',
            status: "PENDING",
            creationMileage: vehicle.mileage,
            estimatedCost,
            requestedBy: '25388509-d958-44f6-b3da-b8524218c6d6', // Real user ID
            // Let's check if requestedBy needs to be a real user. schema says String, typically ID.
            // We will try to fetch owner user first.
        },
    });
    console.log('WorkOrder Created:', result.id);

}

main()
    .catch((e) => {
        console.error('❌ Error during simulation:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
