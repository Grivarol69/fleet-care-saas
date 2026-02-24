import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

async function runTest() {
  console.log('\n🧪 TESTING INVOICE WORKFLOW - INICIO\n');
  console.log('='.repeat(60));

  // ========================================
  // PASO 1: Asignar template a vehículo BCD-890
  // ========================================
  console.log('\n📋 PASO 1: Asignar template Toyota Hilux a BCD-890...');

  const vehicle = await prisma.vehicle.findFirst({
    where: { licensePlate: 'BCD-890' },
    include: { brand: true, line: true },
  });

  if (!vehicle) {
    throw new Error('Vehículo BCD-890 no encontrado');
  }

  console.log(
    `   ✓ Vehículo: ${vehicle.brand.name} ${vehicle.line.name} ${vehicle.year}`
  );
  console.log(`   ✓ Kilometraje actual: ${vehicle.mileage} km`);

  const template = await prisma.maintenanceTemplate.findFirst({
    where: { name: 'Toyota Hilux Estándar' },
    include: {
      packages: {
        include: {
          packageItems: {
            include: {
              mantItem: true,
            },
          },
        },
        orderBy: { triggerKm: 'asc' },
      },
    },
  });

  if (!template) {
    throw new Error('Template Toyota Hilux no encontrado');
  }

  console.log(
    `   ✓ Template: ${template.name} (${template.packages.length} paquetes)`
  );

  // Crear VehicleMantProgram
  const program = await prisma.vehicleMantProgram.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicle.id,
      name: `Programa ${vehicle.licensePlate}`,
      description: `Programa de mantenimiento para ${vehicle.licensePlate}`,
      generatedFrom: `Template: ${template.name} v${template.version}`,
      generatedAt: new Date(),
      generatedBy: 'admin@mvp.com', // UUID del user
      assignmentKm: vehicle.mileage,
      isActive: true,
    },
  });

  console.log(`   ✓ Programa creado: ${program.id}`);

  // Crear VehicleProgramPackages y Items
  for (const pkg of template.packages) {
    const vehiclePackage = await prisma.vehicleProgramPackage.create({
      data: {
        tenantId: TENANT_ID,
        programId: program.id,
        name: pkg.name,
        description: pkg.description || '',
        triggerKm: pkg.triggerKm,
        packageType: pkg.packageType,
        priority: pkg.priority,
        estimatedCost: pkg.estimatedCost || 0,
        estimatedTime: pkg.estimatedTime || 0,
      },
    });

    // Crear VehicleProgramItems
    for (const pkgItem of pkg.packageItems) {
      await prisma.vehicleProgramItem.create({
        data: {
          tenantId: TENANT_ID,
          packageId: vehiclePackage.id,
          mantItemId: pkgItem.mantItemId,
          mantType: pkgItem.mantItem.mantType,
          scheduledKm: pkgItem.triggerKm,
          priority: pkgItem.priority,
          estimatedCost: 0,
          estimatedTime: pkgItem.estimatedTime || 0,
          order: pkgItem.order,
          status: 'PENDING',
        },
      });
    }
  }

  const packageCount = await prisma.vehicleProgramPackage.count({
    where: { programId: program.id },
  });
  const itemCount = await prisma.vehicleProgramItem.count({
    where: { package: { programId: program.id } },
  });

  console.log(`   ✓ ${packageCount} paquetes creados`);
  console.log(`   ✓ ${itemCount} items creados`);

  // ========================================
  // PASO 2: Actualizar odómetro a 30,200 km
  // ========================================
  console.log('\n📊 PASO 2: Actualizar odómetro a 30,200 km...');

  const newMileage = 30200;

  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: {
      mileage: newMileage,
      lastKilometers: newMileage,
    },
  });

  // Crear OdometerLog
  await prisma.odometerLog.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicle.id,
      kilometers: newMileage,
      measureType: 'KILOMETERS',
      recordedAt: new Date(),
    },
  });

  console.log(`   ✓ Odómetro actualizado: ${newMileage} km`);

  // Generar alertas para paquetes alcanzados
  const reachedPackages = await prisma.vehicleProgramPackage.findMany({
    where: {
      programId: program.id,
      triggerKm: { lte: newMileage },
    },
    include: {
      items: {
        include: {
          mantItem: true,
        },
      },
    },
  });

  console.log(`   ✓ Paquetes alcanzados: ${reachedPackages.length}`);

  let totalAlertsCreated = 0;

  for (const pkg of reachedPackages) {
    for (const item of pkg.items) {
      // Verificar si ya existe alerta
      const existingAlert = await prisma.maintenanceAlert.findFirst({
        where: {
          vehicleId: vehicle.id,
          programItemId: item.id,
        },
      });

      if (!existingAlert) {
        await prisma.maintenanceAlert.create({
          data: {
            tenantId: TENANT_ID,
            vehicleId: vehicle.id,
            programItemId: item.id,
            type: 'PREVENTIVE',
            category: 'ROUTINE',
            alertLevel: pkg.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
            status: 'PENDING',
            itemName: item.mantItem.name,
            packageName: pkg.name,
            description: item.mantItem.description || '',
            scheduledKm: pkg.triggerKm ?? 0,
            currentKmAtCreation: newMileage,
            currentKm: newMileage,
            kmToMaintenance: (pkg.triggerKm ?? 0) - newMileage,
            alertThresholdKm: 1000,
          },
        });
        totalAlertsCreated++;
      }
    }
  }

  console.log(`   ✓ ${totalAlertsCreated} alertas creadas`);

  // ========================================
  // PASO 3: Verificar alertas generadas
  // ========================================
  console.log('\n🚨 PASO 3: Verificar alertas generadas...');

  const alerts = await prisma.maintenanceAlert.findMany({
    where: {
      vehicleId: vehicle.id,
      status: 'PENDING',
    },
    include: {
      programItem: {
        include: {
          mantItem: true,
        },
      },
    },
  });

  console.log(`   ✓ Total alertas PENDING: ${alerts.length}`);
  alerts.forEach((alert, idx) => {
    console.log(`      ${idx + 1}. ${alert.itemName} (${alert.status})`);
  });

  if (alerts.length === 0) {
    throw new Error('No se generaron alertas!');
  }

  console.log('\n✅ PASO 1-3 COMPLETADOS EXITOSAMENTE');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

runTest().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  console.error(error);
  process.exit(1);
});
