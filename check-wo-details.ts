import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Work Order #10...');

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: 10 },
    include: {
      workOrderItems: true,
      maintenanceAlerts: {
        include: {
          programItem: true,
        },
      },
    },
  });

  if (!workOrder) {
    console.log('❌ Work Order #10 NOT FOUND');
    return;
  }

  console.log('✅ Work Order Found:', {
    id: workOrder.id,
    description: workOrder.description,
    tenantId: workOrder.tenantId,
    itemsCount: workOrder.workOrderItems.length,
    alertsCount: workOrder.maintenanceAlerts.length,
  });

  console.log('\n📦 Items:', workOrder.workOrderItems);
  console.log(
    '\n🔔 Alerts:',
    workOrder.maintenanceAlerts.map(a => ({
      id: a.id,
      itemName: a.itemName,
      programItemId: a.programItemId,
      hasProgramItem: !!a.programItem,
    }))
  );
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
