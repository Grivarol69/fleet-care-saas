import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { subDays } from 'date-fns';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const REFERENCE_DATE = new Date();
  console.log(
    '🌱 Starting TEST seed with FULL Global KB... (Reference Date:',
    REFERENCE_DATE.toISOString(),
    ')\n'
  );

  // ========================================
  // 1. CLEANUP (LIMPIEZA PROFUNDA)
  // ========================================
  console.log('🧹 Cleaning up ALL data...');

  const _TEST_TENANT_IDS = [
    'org_36M1mCUcHm4ShrsTQQK3etw9FEk', // User Real Tenant
    'cf68b103-12fd-4208-a352-42379ef3b6e1', // Old Seed Tenant
    '00000000-0000-0000-0000-000000000000', // Platform Tenant
  ];

  // Borrado en orden para respetar FK constraints
  await prisma.partPriceHistory.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.workOrderItem.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.maintenanceAlert.deleteMany({});

  await prisma.vehicleProgramItem.deleteMany({});
  await prisma.vehicleProgramPackage.deleteMany({});
  await prisma.vehicleMantProgram.deleteMany({});

  await prisma.vehicleDriver.deleteMany({});
  await prisma.odometerLog.deleteMany({});
  await prisma.document.deleteMany({});

  await prisma.vehicle.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.technician.deleteMany({});
  await prisma.provider.deleteMany({});

  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventoryItem.deleteMany({});

  await prisma.mantItemPart.deleteMany({});
  await prisma.packageItem.deleteMany({});
  await prisma.maintenancePackage.deleteMany({});
  await prisma.maintenanceTemplate.deleteMany({});

  await prisma.mantItem.deleteMany({});
  await prisma.mantCategory.deleteMany({});

  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  await prisma.masterPart.deleteMany({});
  await prisma.vehicleLine.deleteMany({});
  await prisma.vehicleBrand.deleteMany({});
  await prisma.vehicleType.deleteMany({});
  await prisma.documentTypeConfig.deleteMany({});

  console.log('✓ Cleanup complete\n');

  // ========================================
  // 2. KNOWLEDGE BASE GLOBAL (COMPLETA)
  // ========================================
  console.log('📚 Creating Global Knowledge Base...\n');

  // 2.1 BRANDS
  const toyota = await prisma.vehicleBrand.create({
    data: { name: 'Toyota', isGlobal: true },
  });
  const ford = await prisma.vehicleBrand.create({
    data: { name: 'Ford', isGlobal: true },
  });
  const chevy = await prisma.vehicleBrand.create({
    data: { name: 'Chevrolet', isGlobal: true },
  });
  const _nissan = await prisma.vehicleBrand.create({
    data: { name: 'Nissan', isGlobal: true },
  });
  const _mitsubishi = await prisma.vehicleBrand.create({
    data: { name: 'Mitsubishi', isGlobal: true },
  });

  // 2.2 LINES
  const hilux = await prisma.vehicleLine.create({
    data: { name: 'Hilux', brandId: toyota.id, isGlobal: true },
  });
  const ranger = await prisma.vehicleLine.create({
    data: { name: 'Ranger', brandId: ford.id, isGlobal: true },
  });
  const dmax = await prisma.vehicleLine.create({
    data: { name: 'D-MAX', brandId: chevy.id, isGlobal: true },
  });
  // (Adding others for completeness if needed, but focusing on the main 3 for test)

  // 2.3 TYPES
  const cat4x4 = await prisma.vehicleType.create({
    data: { name: 'Camioneta 4x4', isGlobal: true },
  });

  // 2.4 CATEGORIES
  const catMotor = await prisma.mantCategory.create({
    data: { name: 'Motor', isGlobal: true },
  });
  const catFiltros = await prisma.mantCategory.create({
    data: { name: 'Filtros', isGlobal: true },
  });
  const catFrenos = await prisma.mantCategory.create({
    data: { name: 'Frenos', isGlobal: true },
  });
  const catSuspension = await prisma.mantCategory.create({
    data: { name: 'Suspensión', isGlobal: true },
  });
  const catElectrico = await prisma.mantCategory.create({
    data: { name: 'Eléctrico', isGlobal: true },
  });
  const catLlantas = await prisma.mantCategory.create({
    data: { name: 'Neumáticos', isGlobal: true },
  });

  // 2.5 MANT ITEMS (LISTA COMPLETA DEL ORIGINAL)
  const items = {
    aceiteMotor: await prisma.mantItem.create({
      data: {
        name: 'Cambio aceite motor',
        categoryId: catMotor.id,
        type: 'PART',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    filtroAceite: await prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aceite',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    filtroAire: await prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aire',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    filtroCombustible: await prisma.mantItem.create({
      data: {
        name: 'Cambio filtro combustible',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    inspFrenos: await prisma.mantItem.create({
      data: {
        name: 'Inspección pastillas freno',
        categoryId: catFrenos.id,
        type: 'ACTION',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    liquidoFrenos: await prisma.mantItem.create({
      data: {
        name: 'Cambio líquido frenos',
        categoryId: catFrenos.id,
        type: 'PART',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    inspAmortiguadores: await prisma.mantItem.create({
      data: {
        name: 'Inspección amortiguadores',
        categoryId: catSuspension.id,
        type: 'ACTION',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    inspBateria: await prisma.mantItem.create({
      data: {
        name: 'Inspección batería',
        categoryId: catElectrico.id,
        type: 'ACTION',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    rotacionLlantas: await prisma.mantItem.create({
      data: {
        name: 'Rotación neumáticos',
        categoryId: catLlantas.id,
        type: 'ACTION',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
    alineacion: await prisma.mantItem.create({
      data: {
        name: 'Balanceo y alineación',
        categoryId: catLlantas.id,
        type: 'SERVICE',
        isGlobal: true,
        mantType: 'PREVENTIVE',
      },
    }),
  };

  // 2.6 MASTER PARTS (GLOBAL)
  console.log('🔧 Creating Master Parts...');
  const parts = {
    shell10w40: await prisma.masterPart.create({
      data: {
        code: 'SHELL-HX7-10W40',
        description: 'Aceite Shell Helix HX7 10W-40',
        category: 'LUBRICANTES',
        unit: 'LITRO',
        referencePrice: 45000,
        isActive: true,
      },
    }),
    mobil5w40: await prisma.masterPart.create({
      data: {
        code: 'MOBIL-3000-5W40',
        description: 'Aceite Mobil Super 3000 5W-40',
        category: 'LUBRICANTES',
        unit: 'LITRO',
        referencePrice: 58000,
        isActive: true,
      },
    }),
    filtroAceiteBosch: await prisma.masterPart.create({
      data: {
        code: 'BOSCH-OIL-01',
        description: 'Filtro Aceite BOSCH Universal',
        category: 'FILTROS',
        unit: 'UNIDAD',
        referencePrice: 28000,
        isActive: true,
      },
    }),
    filtroAireMann: await prisma.masterPart.create({
      data: {
        code: 'MANN-AIR-01',
        description: 'Filtro Aire MANN Standard',
        category: 'FILTROS',
        unit: 'UNIDAD',
        referencePrice: 42000,
        isActive: true,
      },
    }),
    filtroCombBosch: await prisma.masterPart.create({
      data: {
        code: 'BOSCH-FUEL-01',
        description: 'Filtro Combustible BOSCH Heavy',
        category: 'FILTROS',
        unit: 'UNIDAD',
        referencePrice: 55000,
        isActive: true,
      },
    }),
    liquidoFrenos: await prisma.masterPart.create({
      data: {
        code: 'CASTROL-DOT4',
        description: 'Líquido Frenos Castrol DOT4',
        category: 'FRENOS',
        unit: 'UNIDAD',
        referencePrice: 22000,
        isActive: true,
      },
    }),
  };

  // 2.7 VINCULACIÓN MANTITEM - MASTERPART (Lo que faltaba en el original para que funcione la magia)
  console.log('🔗 Linking MantItems to MasterParts...');
  await prisma.mantItemPart.createMany({
    data: [
      {
        mantItemId: items.aceiteMotor.id,
        masterPartId: parts.shell10w40.id,
        quantity: 6,
        isPrimary: true,
      },
      {
        mantItemId: items.filtroAceite.id,
        masterPartId: parts.filtroAceiteBosch.id,
        quantity: 1,
        isPrimary: true,
      },
      {
        mantItemId: items.filtroAire.id,
        masterPartId: parts.filtroAireMann.id,
        quantity: 1,
        isPrimary: true,
      },
      {
        mantItemId: items.filtroCombustible.id,
        masterPartId: parts.filtroCombBosch.id,
        quantity: 1,
        isPrimary: true,
      },
      {
        mantItemId: items.liquidoFrenos.id,
        masterPartId: parts.liquidoFrenos.id,
        quantity: 1,
        isPrimary: true,
      },
    ],
  });

  // 2.8 TEMPLATES (TOYOTA HILUX, FORD RANGER, CHEVY D-MAX)
  console.log('📋 Creating Templates...');

  // --- Toyota Hilux ---
  const tmplHilux = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Toyota Hilux Standard',
      vehicleBrandId: toyota.id,
      vehicleLineId: hilux.id,
      isGlobal: true,
      isDefault: true,
      version: '1.0',
    },
  });
  // 5k
  const pkgHilux5k = await prisma.maintenancePackage.create({
    data: {
      templateId: tmplHilux.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 450000,
      estimatedTime: 2.5,
    },
  });
  await prisma.packageItem.createMany({
    data: [
      {
        packageId: pkgHilux5k.id,
        mantItemId: items.aceiteMotor.id,
        triggerKm: 5000,
        order: 1,
      },
      {
        packageId: pkgHilux5k.id,
        mantItemId: items.filtroAceite.id,
        triggerKm: 5000,
        order: 2,
      },
      {
        packageId: pkgHilux5k.id,
        mantItemId: items.filtroAire.id,
        triggerKm: 5000,
        order: 3,
      },
      {
        packageId: pkgHilux5k.id,
        mantItemId: items.inspFrenos.id,
        triggerKm: 5000,
        order: 4,
      },
      {
        packageId: pkgHilux5k.id,
        mantItemId: items.rotacionLlantas.id,
        triggerKm: 5000,
        order: 5,
      },
    ],
  });
  // 10k
  const pkgHilux10k = await prisma.maintenancePackage.create({
    data: {
      templateId: tmplHilux.id,
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      estimatedCost: 550000,
      estimatedTime: 3.0,
    },
  });
  await prisma.packageItem.createMany({
    data: [
      {
        packageId: pkgHilux10k.id,
        mantItemId: items.aceiteMotor.id,
        triggerKm: 10000,
        order: 1,
      },
      {
        packageId: pkgHilux10k.id,
        mantItemId: items.filtroAceite.id,
        triggerKm: 10000,
        order: 2,
      },
      {
        packageId: pkgHilux10k.id,
        mantItemId: items.filtroAire.id,
        triggerKm: 10000,
        order: 3,
      },
      {
        packageId: pkgHilux10k.id,
        mantItemId: items.filtroCombustible.id,
        triggerKm: 10000,
        order: 4,
      },
      {
        packageId: pkgHilux10k.id,
        mantItemId: items.inspFrenos.id,
        triggerKm: 10000,
        order: 5,
      },
      {
        packageId: pkgHilux10k.id,
        mantItemId: items.alineacion.id,
        triggerKm: 10000,
        order: 6,
      },
    ],
  });

  // --- Ford Ranger ---
  const tmplRanger = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Ford Ranger Standard',
      vehicleBrandId: ford.id,
      vehicleLineId: ranger.id,
      isGlobal: true,
      isDefault: true,
      version: '1.0',
    },
  });
  const pkgRanger5k = await prisma.maintenancePackage.create({
    data: {
      templateId: tmplRanger.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 430000,
      estimatedTime: 2.5,
    },
  });
  await prisma.packageItem.createMany({
    data: [
      {
        packageId: pkgRanger5k.id,
        mantItemId: items.aceiteMotor.id,
        triggerKm: 5000,
        order: 1,
      },
      {
        packageId: pkgRanger5k.id,
        mantItemId: items.filtroAceite.id,
        triggerKm: 5000,
        order: 2,
      },
      {
        packageId: pkgRanger5k.id,
        mantItemId: items.filtroAire.id,
        triggerKm: 5000,
        order: 3,
      },
      {
        packageId: pkgRanger5k.id,
        mantItemId: items.inspBateria.id,
        triggerKm: 5000,
        order: 4,
      },
    ],
  });

  // --- Chevy D-MAX ---
  const tmplDmax = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Chevrolet D-MAX Standard',
      vehicleBrandId: chevy.id,
      vehicleLineId: dmax.id,
      isGlobal: true,
      isDefault: true,
      version: '1.0',
    },
  });
  const pkgDmax5k = await prisma.maintenancePackage.create({
    data: {
      templateId: tmplDmax.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 440000,
      estimatedTime: 2.5,
    },
  });
  await prisma.packageItem.createMany({
    data: [
      {
        packageId: pkgDmax5k.id,
        mantItemId: items.aceiteMotor.id,
        triggerKm: 5000,
        order: 1,
      },
      {
        packageId: pkgDmax5k.id,
        mantItemId: items.filtroAceite.id,
        triggerKm: 5000,
        order: 2,
      },
      {
        packageId: pkgDmax5k.id,
        mantItemId: items.rotacionLlantas.id,
        triggerKm: 5000,
        order: 3,
      },
    ],
  });

  // ========================================
  // 3. TENANT & USERS
  // ========================================
  console.log('🏢 Creating Tenant & Users...');
  const TENANT_ID = 'org_38zCXuXqy5Urw5CuaisTHu3jLTq'; // REAL Tenant (Guillermo)

  // Upsert tenant
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'Taller Demo Real',
      slug: 'demo-real',
      country: 'CO',
      subscriptionStatus: 'ACTIVE',
    },
  });

  const owner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: TENANT_ID,
        email: 'grivarol69@gmail.com',
      },
    },
    update: { role: 'OWNER' },
    create: {
      id: '26f90a8f-c193-4c49-8d4c-f6591efe0d40',
      tenantId: TENANT_ID,
      email: 'grivarol69@gmail.com',
      firstName: 'Guillermo',
      lastName: 'Rivarola',
      role: 'OWNER',
    },
  });

  const _tech = await prisma.technician.create({
    data: { tenantId: TENANT_ID, name: 'Taller Central', status: 'ACTIVE' },
  });
  const _prov = await prisma.provider.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Repuestos & Partes SAS',
      status: 'ACTIVE',
    },
  });

  // ========================================
  // 4. INVENTARIO (TEST)
  // ========================================
  console.log('📦 Creating Inventory...');

  // Crear stock para las Master Parts globales
  for (const part of Object.values(parts)) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: TENANT_ID,
        masterPartId: part.id,
        // sku removed
        quantity: 50,
        minStock: 5,
        location: 'Bodega Principal',
        averageCost: Number(part.referencePrice || 0) * 0.9, // Costo levemente menor al precio venta
        totalValue: Number(part.referencePrice || 0) * 0.9 * 50,
      },
    });
  }

  // ========================================
  // 5. VEHÍCULOS DE PRUEBA
  // ========================================
  console.log('🚗 Creating Test Vehicles...');

  // VEHÍCULO A: PRE-ALERTA (Toyota Hilux)
  // 4,900 km -> Al cargar 5,000 km debería disparar alerta del paquete 5k
  const vehA = await prisma.vehicle.create({
    data: {
      tenantId: TENANT_ID,
      licensePlate: 'TEST-001',
      brandId: toyota.id,
      lineId: hilux.id,
      typeId: cat4x4.id,
      year: 2024,
      mileage: 4900,
      status: 'ACTIVE',
      owner: 'OWN',
      color: 'Blanco',
    },
  });
  const progA = await prisma.vehicleMantProgram.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehA.id,
      name: 'Programa Test Hilux',
      generatedFrom: 'Template: Toyota Hilux Standard',
      generatedBy: owner.id,
      assignmentKm: 0,
      isActive: true,
    },
  });
  // Clonar paquete 5k para el vehículo
  const pkgA = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: progA.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      status: 'PENDING',
      scheduledKm: 5000,
      estimatedCost: 450000,
    },
  });
  // Clonar items del paquete 5k
  await prisma.vehicleProgramItem.createMany({
    data: [
      {
        tenantId: TENANT_ID,
        packageId: pkgA.id,
        mantItemId: items.aceiteMotor.id,
        mantType: 'PREVENTIVE',
        scheduledKm: 5000,
        status: 'PENDING',
        estimatedCost: 90000,
      },
      {
        tenantId: TENANT_ID,
        packageId: pkgA.id,
        mantItemId: items.filtroAceite.id,
        mantType: 'PREVENTIVE',
        scheduledKm: 5000,
        status: 'PENDING',
        estimatedCost: 30000,
      },
    ],
  });

  // VEHÍCULO B: ALERTA ACTIVA (Ford Ranger)
  // 5,100 km -> Alerta ya generada
  const vehB = await prisma.vehicle.create({
    data: {
      tenantId: TENANT_ID,
      licensePlate: 'TEST-002',
      brandId: ford.id,
      lineId: ranger.id,
      typeId: cat4x4.id,
      year: 2023,
      mileage: 5100,
      status: 'ACTIVE',
      owner: 'OWN',
      color: 'Negro',
    },
  });
  const progB = await prisma.vehicleMantProgram.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehB.id,
      name: 'Programa Test Ranger',
      generatedFrom: 'Template: Ford Ranger Standard',
      generatedBy: owner.id,
      assignmentKm: 0,
      isActive: true,
    },
  });
  const pkgB = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: progB.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      status: 'PENDING',
      scheduledKm: 5000,
    },
  });
  const itemB = await prisma.vehicleProgramItem.create({
    data: {
      tenantId: TENANT_ID,
      packageId: pkgB.id,
      mantItemId: items.aceiteMotor.id,
      mantType: 'PREVENTIVE',
      scheduledKm: 5000,
      status: 'PENDING',
    },
  });
  // Generar alerta
  await prisma.maintenanceAlert.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehB.id,
      programItemId: itemB.id,
      type: 'PREVENTIVE',
      category: 'ROUTINE',
      itemName: 'Cambio aceite motor',
      packageName: 'Mantenimiento 5,000 km',
      description: 'Mantenimiento vencido por 100km',
      scheduledKm: 5000,
      currentKm: 5100,
      currentKmAtCreation: 5000,
      kmToMaintenance: -100,
      alertThresholdKm: 5000,
      priority: 'MEDIUM',
      alertLevel: 'HIGH',
      status: 'PENDING',
      createdAt: subDays(new Date(), 1),
    },
  });

  // VEHÍCULO C: LIMPIO (Chevrolet D-MAX)
  // 1,000 km -> Lejos de alertas
  await prisma.vehicle.create({
    data: {
      tenantId: TENANT_ID,
      licensePlate: 'TEST-003',
      brandId: chevy.id,
      lineId: dmax.id,
      typeId: cat4x4.id,
      year: 2024,
      mileage: 1000,
      status: 'ACTIVE',
      owner: 'OWN',
      color: 'Rojo',
    },
  });

  console.log(
    '✓ Created 3 Test Vehicles (A: Pre-Alert, B: Alert-Active, C: Clean)'
  );
  console.log('✅ TEST Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
