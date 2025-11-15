import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('\n📊 Verificando datos del seed...\n');

  const vehicleCount = await prisma.vehicle.count();
  const templateCount = await prisma.maintenanceTemplate.count();
  const providerCount = await prisma.provider.count();
  const userCount = await prisma.user.count();

  console.log(`✅ Vehículos: ${vehicleCount}`);
  console.log(`✅ Templates: ${templateCount}`);
  console.log(`✅ Proveedores: ${providerCount}`);
  console.log(`✅ Usuarios: ${userCount}`);

  // Verificar vehículo BCD-890
  const bcd890 = await prisma.vehicle.findFirst({
    where: { licensePlate: 'BCD-890' },
    include: {
      brand: true,
      line: true,
      type: true
    }
  });

  if (bcd890) {
    console.log(`\n🚗 Vehículo BCD-890 encontrado:`);
    console.log(`   - ${bcd890.brand.name} ${bcd890.line.name} ${bcd890.year}`);
    console.log(`   - Color: ${bcd890.color}`);
    console.log(`   - Kilometraje actual: ${bcd890.mileage} km`);
    console.log(`   - Estado: ${bcd890.status}`);
  } else {
    console.log(`\n❌ Vehículo BCD-890 NO encontrado`);
  }

  await prisma.$disconnect();
}

verify().catch(console.error);
