import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../prisma';
import { getTenantPrisma } from '../tenant-prisma';

const runIntegration = process.env['RUN_INTEGRATION_TESTS'] === '1';

describe.skipIf(!runIntegration)('getTenantPrisma integration isolation', () => {
    let tenant1Id = '';
    let tenant2Id = '';
    let tenant1Prisma: ReturnType<typeof getTenantPrisma>;
    let tenant2Prisma: ReturnType<typeof getTenantPrisma>;

    beforeAll(async () => {
        // Setup 2 tenants
        const t1 = await prisma.tenant.create({ data: { name: 'T1', slug: 't1-test-isolated', country: 'CO', currency: 'COP' } });
        const t2 = await prisma.tenant.create({ data: { name: 'T2', slug: 't2-test-isolated', country: 'CO', currency: 'COP' } });
        tenant1Id = t1.id;
        tenant2Id = t2.id;

        tenant1Prisma = getTenantPrisma(tenant1Id);
        tenant2Prisma = getTenantPrisma(tenant2Id);

        // Create Vehicles
        const b1 = await prisma.vehicleBrand.create({ data: { name: 'B1-IsoTest', tenantId: tenant1Id } });
        const b2 = await prisma.vehicleBrand.create({ data: { name: 'B2-IsoTest', tenantId: tenant2Id } });

        await prisma.vehicle.create({
            data: {
                licensePlate: 'V1-ISO',
                brandId: b1.id,
                lineId: (await prisma.vehicleLine.create({ data: { name: 'L1', brandId: b1.id, tenantId: tenant1Id } })).id,
                typeId: (await prisma.vehicleType.create({ data: { name: 'Ty1', tenantId: tenant1Id } })).id,
                year: 2020, color: 'Red', tenantId: tenant1Id
            }
        });

        await prisma.vehicle.create({
            data: {
                licensePlate: 'V2-ISO',
                brandId: b2.id,
                lineId: (await prisma.vehicleLine.create({ data: { name: 'L2', brandId: b2.id, tenantId: tenant2Id } })).id,
                typeId: (await prisma.vehicleType.create({ data: { name: 'Ty2', tenantId: tenant2Id } })).id,
                year: 2020, color: 'Blue', tenantId: tenant2Id
            }
        });

        // Create Global KB Item
        await prisma.vehicleBrand.create({ data: { name: 'GlobalBrand-IsoTest', isGlobal: true } });
    });

    afterAll(async () => {
        await prisma.vehicle.deleteMany({ where: { licensePlate: { in: ['V1-ISO', 'V2-ISO'] } } });
        await prisma.vehicleBrand.deleteMany({ where: { name: { in: ['B1-IsoTest', 'B2-IsoTest', 'GlobalBrand-IsoTest', 'AutoBrand-IsoTest'] } } });
        await prisma.vehicleLine.deleteMany({ where: { name: { in: ['L1', 'L2'] } } });
        await prisma.vehicleType.deleteMany({ where: { name: { in: ['Ty1', 'Ty2'] } } });
        await prisma.tenant.deleteMany({ where: { id: { in: [tenant1Id, tenant2Id] } } });
    });

    it('keeps vehicle queries scoped to the current tenant', async () => {
        const t1Vehicles = await tenant1Prisma.vehicle.findMany({ where: { licensePlate: { contains: '-ISO' } } });
        expect(t1Vehicles).toHaveLength(1);
        expect(t1Vehicles[0].licensePlate).toBe('V1-ISO');

        const t2Vehicles = await tenant2Prisma.vehicle.findMany({ where: { licensePlate: { contains: '-ISO' } } });
        expect(t2Vehicles).toHaveLength(1);
        expect(t2Vehicles[0].licensePlate).toBe('V2-ISO');
    });

    it('returns global catalog records together with tenant-owned records', async () => {
        const t1Brands = await tenant1Prisma.vehicleBrand.findMany({ where: { name: { contains: 'IsoTest' } } });
        const brandNames = t1Brands.map(b => b.name);
        // Should see 'B1-IsoTest' and 'GlobalBrand-IsoTest', but not 'B2-IsoTest'
        expect(brandNames).toContain('B1-IsoTest');
        expect(brandNames).toContain('GlobalBrand-IsoTest');
        expect(brandNames).not.toContain('B2-IsoTest');
    });

    it('injects tenantId automatically on create operations', async () => {
        const newBrand = await tenant1Prisma.vehicleBrand.create({ data: { name: 'AutoBrand-IsoTest' } as any });
        expect(newBrand.tenantId).toBe(tenant1Id);

        // Validate we can query it
        const check = await prisma.vehicleBrand.findUnique({ where: { id: newBrand.id } });
        expect(check?.tenantId).toBe(tenant1Id);
    });
});
