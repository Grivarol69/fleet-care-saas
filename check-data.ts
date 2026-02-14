import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking User Tenant IDs...');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      tenantId: true,
      role: true,
    },
  });

  console.table(users);

  console.log('\n🔍 Checking Vehicles Tenant IDs...');
  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, licensePlate: true, tenantId: true },
  });
  console.table(vehicles);

  console.log('\n🔍 Checking Technicians Tenant IDs...');
  const techs = await prisma.technician.findMany({
    select: { id: true, name: true, tenantId: true },
  });
  console.table(techs);

  console.log('\n🔍 Checking Providers Tenant IDs...');
  const provs = await prisma.provider.findMany({
    select: { id: true, name: true, tenantId: true },
  });
  console.table(provs);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
