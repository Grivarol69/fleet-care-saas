import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

async function main() {
  console.log('\n🔍 Buscando todas las WorkOrders...\n');

  const workOrders = await prisma.workOrder.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      vehicle: {
        select: { licensePlate: true }
      },
      maintenanceAlerts: {
        select: { id: true, status: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (workOrders.length === 0) {
    console.log('❌ No hay WorkOrders para este tenant');
    return;
  }

  console.log(`✅ Encontradas ${workOrders.length} WorkOrders:\n`);

  workOrders.forEach(wo => {
    console.log(`ID: ${wo.id}`);
    console.log(`Status: ${wo.status}`);
    console.log(`Vehicle: ${wo.vehicle?.licensePlate || 'N/A'}`);
    console.log(`Title: ${wo.title}`);
    console.log(`Estimated Cost: ${wo.estimatedCost}`);
    console.log(`Actual Cost: ${wo.actualCost || 'N/A'}`);
    console.log(`Alerts: ${wo.maintenanceAlerts.length}`);
    console.log(`Created: ${wo.createdAt}`);
    console.log('---\n');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
