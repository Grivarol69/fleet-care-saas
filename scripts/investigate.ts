import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vehicle = await prisma.vehicle.findFirst({
    where: { licensePlate: 'SVA120' }
  });

  if (!vehicle) {
    console.log('Vehicle not found');
    return;
  }

  console.log('Vehicle id:', vehicle.id);

  const wos = await prisma.workOrder.findMany({
    where: { vehicleId: vehicle.id },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      endDate: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });

  console.log('Recent Work Orders:');
  console.log(JSON.stringify(wos, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
