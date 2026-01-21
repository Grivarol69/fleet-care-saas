const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWO() {
  const wo = await prisma.workOrder.findFirst({
    where: { id: 3 },
    include: {
      workOrderItems: true,
      vehicle: { select: { licensePlate: true } }
    }
  });

  console.log('\n📋 WorkOrder ID:', wo?.id);
  console.log('🚗 Vehículo:', wo?.vehicle?.licensePlate);
  console.log('📦 Items encontrados:', wo?.workOrderItems?.length || 0);
  
  if (wo?.workOrderItems && wo.workOrderItems.length > 0) {
    console.log('\n🔍 Items:');
    wo.workOrderItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.description} - $${item.unitPrice} x ${item.quantity}`);
    });
  } else {
    console.log('\n⚠️  Esta WorkOrder NO tiene items cargados');
    console.log('   Necesitás primero agregar items a la WorkOrder');
  }

  await prisma.$disconnect();
}

checkWO().catch(console.error);
