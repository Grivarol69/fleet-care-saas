import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMileage() {
  const workOrders = await prisma.workOrder.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      completionMileage: null
    }
  });

  console.log(`Found ${workOrders.length} work orders to update.`);

  for (const wo of workOrders) {
    if (wo.creationMileage) {
      await prisma.workOrder.update({
        where: { id: wo.id },
        data: { completionMileage: wo.creationMileage }
      });
      console.log(`Updated WO ${wo.code ?? wo.id} with mileage ${wo.creationMileage}`);
    }
  }

  console.log('Finished updating work orders.');
}

fixMileage()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
