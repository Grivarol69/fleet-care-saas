import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Use pool for better performance in stress seed
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🚀 Starting STRESS Seed for Load Testing...');

    // 1. Cleanup (Partial, avoid wiping critical platform data if possible, but for stress test usually clean slate is best)
    // For safety, we will only clean our stress tenants if they exist, or just wipe everything if running in a dedicated test env.
    // Assuming dev env, we wipe.
    console.log('🧹 Cleaning database...');
    await prisma.workOrderItem.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // 2. Create Tenants
    const tenants = [];
    for (let i = 1; i <= 3; i++) {
        tenants.push(
            await prisma.tenant.create({
                data: {
                    name: `Stress Tenant ${i}`,
                    slug: `stress-tenant-${i}`,
                    country: 'CO',
                    subscriptionStatus: 'ACTIVE',
                },
            })
        );
    }
    console.log(`✅ Created ${tenants.length} tenants`);

    // 3. Create Users (5 per tenant = 15 total, plus some extra for concurrency)
    for (const tenant of tenants) {
        for (let i = 1; i <= 5; i++) {
            await prisma.user.create({
                data: {
                    tenantId: tenant.id,
                    email: `user${i}@${tenant.slug}.com`,
                    firstName: `User ${i}`,
                    lastName: `Tenant ${tenant.name}`,
                    role: i === 1 ? 'OWNER' : 'MANAGER',
                }
            });
        }
    }
    console.log('✅ Created 15 Users');

    // 4. Create Vehicles (50 per tenant = 150 total)
    // Need minimal master data (Brands/Lines)
    const brand = await prisma.vehicleBrand.create({ data: { name: 'Generic Brand', isGlobal: true } });
    const line = await prisma.vehicleLine.create({ data: { name: 'Generic Line', brandId: brand.id, isGlobal: true } });
    const type = await prisma.vehicleType.create({ data: { name: 'Generic Type', isGlobal: true } });

    for (const tenant of tenants) {
        const vehiclesData = Array.from({ length: 50 }).map((_, i) => ({
            tenantId: tenant.id,
            licensePlate: `${tenant.slug.slice(0, 3).toUpperCase()}-${100 + i}`,
            brandId: brand.id,
            lineId: line.id,
            typeId: type.id,
            year: 2020 + (i % 5),
            mileage: 10000 + (i * 100),
            status: 'ACTIVE',
            owner: 'OWN',
            color: 'White'
        }));
        await prisma.vehicle.createMany({ data: vehiclesData });
    }
    console.log('✅ Created 150 Vehicles');

    // 5. Create Work Orders (History)
    // ... (Simplified for speed, we need mainly data to query)

    console.log('🏁 STRESS Seed Complete');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
