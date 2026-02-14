import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TEST seed...');

  // 1. Cleanup
  console.log('🧹 Cleaning up test database...');
  await prisma.workOrderItem.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.mantItem.deleteMany();
  await prisma.mantCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 2. Create Tenant
  console.log('🏢 Creating Test Tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Fleet Local',
      slug: 'test-fleet-local',
      country: 'CO',
      currency: 'COP',
      subscriptionStatus: 'ACTIVE',
    },
  });

  // 3. Create Users
  console.log('👥 Creating Users...');
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'manager@test.com',
      firstName: 'Test',
      lastName: 'Manager',
      role: 'MANAGER', // Using string literal as UserRole might be an enum in code but string in DB
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'tech@test.com',
      firstName: 'Test',
      lastName: 'Technician',
      role: 'TECHNICIAN',
    },
  });

  // 4. Create Vehicle Assets
  console.log('🚗 Creating Vehicle...');
  // Create Brand/Line/Type (Local for test simplicity)
  const brand = await prisma.vehicleBrand.create({
    data: { name: 'TestBrand', tenantId: tenant.id },
  });
  const line = await prisma.vehicleLine.create({
    data: { name: 'TestLine', brandId: brand.id, tenantId: tenant.id },
  });
  const type = await prisma.vehicleType.create({
    data: { name: 'TestType', tenantId: tenant.id },
  });

  await prisma.vehicle.create({
    data: {
      tenantId: tenant.id,
      licensePlate: 'TEST-001',
      brandId: brand.id,
      lineId: line.id,
      typeId: type.id,
      year: 2023,
      color: 'White',
      mileage: 10000,
      status: 'ACTIVE',
    },
  });

  // 5. Create Maintenance Catalog
  console.log('🛠️ Creating Maintenance Catalog...');
  const category = await prisma.mantCategory.create({
    data: {
      name: 'Test Category',
      tenantId: tenant.id,
    },
  });

  await prisma.mantItem.create({
    data: {
      name: 'Oil Change',
      mantType: 'PREVENTIVE',
      type: 'PART',
      categoryId: category.id,
      tenantId: tenant.id,
    },
  });

  console.log('✅ TEST Seed completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
