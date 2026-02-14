import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...\n');

  console.log('🧹 Cleaning up previous seed data...');

  // FIX: PartPriceHistory blocks Provider deletion (Restrict), need to delete first
  // FIX: Also clean up old seed tenant (cf68...) data which blocks global deletions
  const TEST_TENANT_IDS = [
    'org_38zCXuXqy5Urw5CuaisTHu3jLTq', // User Real Tenant (Clerk orgId)
    'org_36M1mCUcHm4ShrsTQQK3etw9FEk', // Old Seed Tenant
    'cf68b103-12fd-4208-a352-42379ef3b6e1', // Old Seed Tenant
    '00000000-0000-0000-0000-000000000000', // Platform Tenant
  ];

  await prisma.partPriceHistory.deleteMany({
    where: {
      tenantId: { in: TEST_TENANT_IDS },
    },
  });

  // Clean data for ALL test tenants
  // We explicitly delete child records to avoid FK issues with Global Items or Restrict constraints
  await prisma.vehicleDriver.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });

  await prisma.vehicleProgramItem.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });
  await prisma.vehicleProgramPackage.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });
  await prisma.vehicleMantProgram.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });

  await prisma.invoiceItem.deleteMany({
    where: { invoice: { tenantId: { in: TEST_TENANT_IDS } } },
  });
  await prisma.invoice.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });

  await prisma.workOrderItem.deleteMany({
    where: { workOrder: { tenantId: { in: TEST_TENANT_IDS } } },
  });
  await prisma.workOrder.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });

  await prisma.maintenanceAlert.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });

  await prisma.vehicle.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });
  await prisma.driver.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });
  await prisma.technician.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });
  await prisma.provider.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });
  await prisma.masterPart.deleteMany({
    where: { tenantId: { in: TEST_TENANT_IDS } },
  });

  // Clean tenants themselves (EXCEPT the User Tenant which we keep)
  await prisma.tenant.deleteMany({
    where: {
      id: {
        in: [
          'cf68b103-12fd-4208-a352-42379ef3b6e1',
          '00000000-0000-0000-0000-000000000000',
        ],
      },
    },
  });

  // Clean Global Knowledge Base
  // Order matters due to foreign key constraints (unless Cascade is set everywhere)
  await prisma.maintenanceTemplate.deleteMany({
    where: { tenantId: null, isGlobal: true },
  });
  await prisma.mantItem.deleteMany({
    where: { tenantId: null, isGlobal: true },
  });
  await prisma.mantCategory.deleteMany({
    where: { tenantId: null, isGlobal: true },
  });
  await prisma.vehicleType.deleteMany({
    where: { tenantId: null, isGlobal: true },
  });
  await prisma.vehicleBrand.deleteMany({
    where: { tenantId: null, isGlobal: true },
  });
  await prisma.masterPart.deleteMany({ where: { tenantId: null } });
  await prisma.documentTypeConfig.deleteMany({
    where: { tenantId: null, isGlobal: true },
  });

  console.log('✓ Cleanup complete\n');

  // ========================================
  // PARTE 1: KNOWLEDGE BASE GLOBAL
  // ========================================
  console.log('📚 Creating Global Knowledge Base...\n');

  // 1. GLOBAL BRANDS
  console.log('Creating global brands...');
  const globalBrands = await Promise.all([
    prisma.vehicleBrand.create({
      data: { name: 'Toyota', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Ford', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Chevrolet', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Nissan', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Mitsubishi', isGlobal: true, tenantId: null },
    }),
  ]);
  console.log(`✓ Created ${globalBrands.length} global brands\n`);

  // 2. GLOBAL LINES
  console.log('Creating global vehicle lines...');
  const globalLines = await Promise.all([
    // Toyota
    prisma.vehicleLine.create({
      data: {
        name: 'Hilux',
        brandId: globalBrands[0].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Land Cruiser',
        brandId: globalBrands[0].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Prado',
        brandId: globalBrands[0].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Ford
    prisma.vehicleLine.create({
      data: {
        name: 'Ranger',
        brandId: globalBrands[1].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'F-150',
        brandId: globalBrands[1].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Transit',
        brandId: globalBrands[1].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Chevrolet
    prisma.vehicleLine.create({
      data: {
        name: 'D-MAX',
        brandId: globalBrands[2].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Silverado',
        brandId: globalBrands[2].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'NPR',
        brandId: globalBrands[2].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Nissan
    prisma.vehicleLine.create({
      data: {
        name: 'Frontier',
        brandId: globalBrands[3].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Navara',
        brandId: globalBrands[3].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Mitsubishi
    prisma.vehicleLine.create({
      data: {
        name: 'L200',
        brandId: globalBrands[4].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Montero',
        brandId: globalBrands[4].id,
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);
  console.log(`✓ Created ${globalLines.length} global vehicle lines\n`);

  // 3. GLOBAL TYPES
  console.log('Creating global vehicle types...');
  const globalTypes = await Promise.all([
    prisma.vehicleType.create({
      data: { name: 'Camioneta 4x4', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'Camión de Carga', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'Camioneta de Pasajeros', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'Vehículo Urbano', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'SUV', isGlobal: true, tenantId: null },
    }),
  ]);
  console.log(`✓ Created ${globalTypes.length} global vehicle types\n`);

  // 4. GLOBAL MAINTENANCE CATEGORIES
  console.log('Creating global maintenance categories...');
  const globalCategories = await Promise.all([
    prisma.mantCategory.create({
      data: {
        name: 'Motor',
        description: 'Sistema de motor y combustible',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Transmisión',
        description: 'Caja de cambios y embrague',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Frenos',
        description: 'Sistema de frenado',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Suspensión',
        description: 'Amortiguadores y resortes',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Eléctrico',
        description: 'Sistema eléctrico y batería',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Lubricación',
        description: 'Aceites y lubricantes',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Filtros',
        description: 'Filtros aire, aceite, combustible',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Neumáticos',
        description: 'Llantas y neumáticos',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Carrocería',
        description: 'Elementos de carrocería',
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);
  console.log(
    `✓ Created ${globalCategories.length} global maintenance categories\n`
  );

  // 5. GLOBAL MAINTENANCE ITEMS (PREVENTIVOS + CORRECTIVOS)
  console.log('Creating global maintenance items (preventive + corrective)...');
  const globalMantItems = await Promise.all([
    // ===== ITEMS PREVENTIVOS =====
    // Motor (index 0-2)
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite motor',
        description: 'Cambio de aceite motor 5W-40 sintético',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[0].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspección sistema combustible',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[0].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajuste válvulas',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[0].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Filtros (index 3-5)
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aceite',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[6].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aire',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[6].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro combustible',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[6].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Frenos preventivo (index 6-7)
    prisma.mantItem.create({
      data: {
        name: 'Inspección pastillas freno',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[2].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio líquido frenos',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[2].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Suspensión preventivo (index 8-9)
    prisma.mantItem.create({
      data: {
        name: 'Inspección amortiguadores',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[3].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Lubricación rótulas',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[3].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Eléctrico preventivo (index 10-11)
    prisma.mantItem.create({
      data: {
        name: 'Inspección batería',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[4].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Limpieza terminales batería',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[4].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Transmisión preventivo (index 12-13)
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite transmisión',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[1].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajuste embrague',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[1].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Neumáticos preventivo (index 14-15)
    prisma.mantItem.create({
      data: {
        name: 'Rotación neumáticos',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[7].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Balanceo y alineación',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[7].id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Lubricación preventivo (index 16)
    prisma.mantItem.create({
      data: {
        name: 'Cambio líquido dirección hidráulica',
        description: 'Cambio de líquido de dirección hidráulica',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[5].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),

    // ===== ITEMS CORRECTIVOS =====
    // Frenos correctivos (index 17-20)
    prisma.mantItem.create({
      data: {
        name: 'Cambio pastillas freno delanteras',
        description: 'Reemplazo de pastillas desgastadas delanteras',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[2].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio pastillas freno traseras',
        description: 'Reemplazo de pastillas desgastadas traseras',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[2].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio discos freno',
        description: 'Reemplazo de discos de freno desgastados',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[2].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Reparación cilindro maestro',
        description: 'Reparación o cambio de cilindro maestro de frenos',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[2].id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Motor correctivos (index 21-23)
    prisma.mantItem.create({
      data: {
        name: 'Cambio correa distribución',
        description: 'Reemplazo de correa de distribución',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[0].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Reparación empaque culata',
        description: 'Reparación de empaque de culata',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[0].id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio bomba agua',
        description: 'Reemplazo de bomba de agua',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[0].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Suspensión correctivos (index 24-26)
    prisma.mantItem.create({
      data: {
        name: 'Cambio amortiguadores',
        description: 'Reemplazo de amortiguadores',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[3].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio rótulas',
        description: 'Reemplazo de rótulas de suspensión',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[3].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio bujes suspensión',
        description: 'Reemplazo de bujes de suspensión',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[3].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Eléctrico correctivos (index 27-29)
    prisma.mantItem.create({
      data: {
        name: 'Cambio batería',
        description: 'Reemplazo de batería',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[4].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio alternador',
        description: 'Reemplazo de alternador',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[4].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio motor arranque',
        description: 'Reemplazo de motor de arranque',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[4].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Transmisión correctivos (index 30-31)
    prisma.mantItem.create({
      data: {
        name: 'Cambio kit embrague',
        description: 'Reemplazo de kit de embrague completo',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[1].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Reparación caja cambios',
        description: 'Reparación de caja de cambios',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[1].id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Neumáticos correctivo (index 32)
    prisma.mantItem.create({
      data: {
        name: 'Cambio neumáticos',
        description: 'Reemplazo de neumáticos desgastados',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[7].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);
  console.log(
    `✓ Created ${globalMantItems.length} global maintenance items (17 preventive + 16 corrective)\n`
  );

  // 6. GLOBAL MAINTENANCE TEMPLATES
  console.log(
    'Creating global maintenance templates with 4 packages each (5K, 10K, 20K, 30K)...'
  );

  // ========================================
  // Template: Toyota Hilux
  // ========================================
  const template_ToyotaHilux = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Toyota Hilux Standard',
      description:
        'Programa de mantenimiento preventivo estándar para Toyota Hilux',
      vehicleBrandId: globalBrands[0].id,
      vehicleLineId: globalLines[0].id,
      version: '1.0',
      isDefault: true,
      status: 'ACTIVE',
      isGlobal: true,
      tenantId: null,
    },
  });

  // Package 5K Hilux
  const package_Hilux_5k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_ToyotaHilux.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 450000,
      estimatedTime: 2.5,
      priority: 'MEDIUM',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[0].id, // Cambio aceite
        triggerKm: 5000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[3].id, // Filtro aceite
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[4].id, // Filtro aire
        triggerKm: 5000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[6].id, // Inspección frenos
        triggerKm: 5000,
        estimatedTime: 0.5,
        order: 4,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[10].id, // Inspección batería
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 5,
        priority: 'LOW',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[14].id, // Rotación neumáticos
        triggerKm: 5000,
        estimatedTime: 0.7,
        order: 6,
        priority: 'MEDIUM',
      },
    }),
  ]);

  // Package 10K Hilux
  const package_Hilux_10k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_ToyotaHilux.id,
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      estimatedCost: 550000,
      estimatedTime: 3.0,
      priority: 'MEDIUM',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 10000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[5].id, // Filtro combustible
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[6].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 5,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[8].id, // Inspección amortiguadores
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[9].id, // Lubricación rótulas
        triggerKm: 10000,
        estimatedTime: 0.4,
        order: 7,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[15].id, // Balanceo
        triggerKm: 10000,
        estimatedTime: 0.8,
        order: 8,
        priority: 'MEDIUM',
      },
    }),
  ]);

  // Package 20K Hilux
  const package_Hilux_20k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_ToyotaHilux.id,
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      estimatedCost: 750000,
      estimatedTime: 4.0,
      priority: 'HIGH',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 20000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 20000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[5].id,
        triggerKm: 20000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[2].id, // Ajuste válvulas
        triggerKm: 20000,
        estimatedTime: 1.0,
        order: 5,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[6].id,
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[7].id, // Cambio líquido frenos
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 7,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[12].id, // Aceite transmisión
        triggerKm: 20000,
        estimatedTime: 1.2,
        order: 8,
        priority: 'MEDIUM',
      },
    }),
  ]);

  // Package 30K Hilux (NUEVO)
  const package_Hilux_30k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_ToyotaHilux.id,
      name: 'Mantenimiento 30,000 km',
      triggerKm: 30000,
      estimatedCost: 950000,
      estimatedTime: 5.0,
      priority: 'HIGH',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[0].id, // Cambio aceite
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[3].id, // Filtro aceite
        triggerKm: 30000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[4].id, // Filtro aire
        triggerKm: 30000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[5].id, // Filtro combustible
        triggerKm: 30000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[2].id, // Ajuste válvulas
        triggerKm: 30000,
        estimatedTime: 1.0,
        order: 5,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[6].id, // Inspección frenos
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[7].id, // Líquido frenos
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 7,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[12].id, // Aceite transmisión
        triggerKm: 30000,
        estimatedTime: 1.2,
        order: 8,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[13].id, // Ajuste embrague
        triggerKm: 30000,
        estimatedTime: 1.5,
        order: 9,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_30k.id,
        mantItemId: globalMantItems[16].id, // Líquido dirección hidráulica
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 10,
        priority: 'MEDIUM',
      },
    }),
  ]);

  console.log(
    `✓ Created template "Toyota Hilux Standard" with 4 packages (5K, 10K, 20K, 30K)\n`
  );

  // ========================================
  // Template: Ford Ranger
  // ========================================
  const template_FordRanger = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Ford Ranger Standard',
      description:
        'Programa de mantenimiento preventivo estándar para Ford Ranger',
      vehicleBrandId: globalBrands[1].id, // Ford
      vehicleLineId: globalLines[3].id, // Ranger
      version: '1.0',
      isDefault: true,
      status: 'ACTIVE',
      isGlobal: true,
      tenantId: null,
    },
  });

  // Package 5K Ranger
  const package_Ranger_5k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_FordRanger.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 430000,
      estimatedTime: 2.5,
      priority: 'MEDIUM',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_5k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 5000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_5k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_5k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 5000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_5k.id,
        mantItemId: globalMantItems[10].id, // Inspección batería
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'LOW',
      },
    }),
  ]);

  // Package 10K Ranger
  const package_Ranger_10k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_FordRanger.id,
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      estimatedCost: 520000,
      estimatedTime: 3.0,
      priority: 'MEDIUM',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_10k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_10k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_10k.id,
        mantItemId: globalMantItems[5].id, // Filtro combustible
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_10k.id,
        mantItemId: globalMantItems[6].id, // Inspección frenos
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 4,
        priority: 'HIGH',
      },
    }),
  ]);

  // Package 20K Ranger (NUEVO)
  const package_Ranger_20k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_FordRanger.id,
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      estimatedCost: 720000,
      estimatedTime: 4.0,
      priority: 'HIGH',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_20k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_20k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 20000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_20k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 20000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_20k.id,
        mantItemId: globalMantItems[5].id,
        triggerKm: 20000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_20k.id,
        mantItemId: globalMantItems[6].id,
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 5,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_20k.id,
        mantItemId: globalMantItems[7].id, // Líquido frenos
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_20k.id,
        mantItemId: globalMantItems[12].id, // Aceite transmisión
        triggerKm: 20000,
        estimatedTime: 1.2,
        order: 7,
        priority: 'MEDIUM',
      },
    }),
  ]);

  // Package 30K Ranger (NUEVO)
  const package_Ranger_30k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_FordRanger.id,
      name: 'Mantenimiento 30,000 km',
      triggerKm: 30000,
      estimatedCost: 920000,
      estimatedTime: 5.0,
      priority: 'HIGH',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 30000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 30000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[5].id,
        triggerKm: 30000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[2].id, // Ajuste válvulas
        triggerKm: 30000,
        estimatedTime: 1.0,
        order: 5,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[6].id,
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[7].id,
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 7,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[12].id,
        triggerKm: 30000,
        estimatedTime: 1.2,
        order: 8,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_30k.id,
        mantItemId: globalMantItems[13].id, // Ajuste embrague
        triggerKm: 30000,
        estimatedTime: 1.5,
        order: 9,
        priority: 'MEDIUM',
      },
    }),
  ]);

  console.log(
    `✓ Created template "Ford Ranger Standard" with 4 packages (5K, 10K, 20K, 30K)\n`
  );

  // ========================================
  // Template: Chevrolet D-MAX
  // ========================================
  const template_ChevyDmax = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Chevrolet D-MAX Standard',
      description:
        'Programa de mantenimiento preventivo estándar para Chevrolet D-MAX',
      vehicleBrandId: globalBrands[2].id, // Chevrolet
      vehicleLineId: globalLines[6].id, // D-MAX
      version: '1.0',
      isDefault: true,
      status: 'ACTIVE',
      isGlobal: true,
      tenantId: null,
    },
  });

  // Package 5K D-MAX
  const package_Dmax_5k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_ChevyDmax.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 440000,
      estimatedTime: 2.5,
      priority: 'MEDIUM',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_5k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 5000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_5k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_5k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 5000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_5k.id,
        mantItemId: globalMantItems[14].id, // Rotación neumáticos
        triggerKm: 5000,
        estimatedTime: 0.7,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
  ]);

  // Package 10K D-MAX
  const package_Dmax_10k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_ChevyDmax.id,
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      estimatedCost: 540000,
      estimatedTime: 3.0,
      priority: 'MEDIUM',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_10k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_10k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_10k.id,
        mantItemId: globalMantItems[5].id, // Filtro combustible
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_10k.id,
        mantItemId: globalMantItems[12].id, // Aceite transmisión
        triggerKm: 10000,
        estimatedTime: 1.2,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
  ]);

  // Package 20K D-MAX (NUEVO)
  const package_Dmax_20k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_ChevyDmax.id,
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      estimatedCost: 700000,
      estimatedTime: 4.0,
      priority: 'HIGH',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_20k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_20k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 20000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_20k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 20000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_20k.id,
        mantItemId: globalMantItems[5].id,
        triggerKm: 20000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_20k.id,
        mantItemId: globalMantItems[6].id, // Inspección frenos
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 5,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_20k.id,
        mantItemId: globalMantItems[7].id, // Líquido frenos
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_20k.id,
        mantItemId: globalMantItems[12].id,
        triggerKm: 20000,
        estimatedTime: 1.2,
        order: 7,
        priority: 'MEDIUM',
      },
    }),
  ]);

  // Package 30K D-MAX (NUEVO)
  const package_Dmax_30k = await prisma.maintenancePackage.create({
    data: {
      templateId: template_ChevyDmax.id,
      name: 'Mantenimiento 30,000 km',
      triggerKm: 30000,
      estimatedCost: 900000,
      estimatedTime: 5.0,
      priority: 'HIGH',
      packageType: 'PREVENTIVE',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 30000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 30000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[5].id,
        triggerKm: 30000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[2].id, // Ajuste válvulas
        triggerKm: 30000,
        estimatedTime: 1.0,
        order: 5,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[6].id,
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[7].id,
        triggerKm: 30000,
        estimatedTime: 0.5,
        order: 7,
        priority: 'HIGH',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[12].id,
        triggerKm: 30000,
        estimatedTime: 1.2,
        order: 8,
        priority: 'MEDIUM',
      },
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_30k.id,
        mantItemId: globalMantItems[13].id, // Ajuste embrague
        triggerKm: 30000,
        estimatedTime: 1.5,
        order: 9,
        priority: 'MEDIUM',
      },
    }),
  ]);

  console.log(
    `✓ Created template "Chevrolet D-MAX Standard" with 4 packages (5K, 10K, 20K, 30K)\n`
  );

  // Suppress unused variable warnings
  void package_Hilux_5k;
  void package_Hilux_10k;
  void package_Hilux_20k;
  void package_Hilux_30k;
  void package_Ranger_5k;
  void package_Ranger_10k;
  void package_Ranger_20k;
  void package_Ranger_30k;
  void package_Dmax_5k;
  void package_Dmax_10k;
  void package_Dmax_20k;
  void package_Dmax_30k;

  // 7. GLOBAL DOCUMENT TYPE CONFIGS (Multi-Country)
  console.log('Creating global document type configs...');
  const globalDocTypes = await Promise.all([
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'SOAT',
        name: 'SOAT',
        description: 'Seguro Obligatorio de Accidentes de Tránsito',
        requiresExpiry: true,
        isMandatory: true,
        expiryWarningDays: 30,
        expiryCriticalDays: 7,
        sortOrder: 1,
      },
    }),
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'TECNOMECANICA',
        name: 'Revisión Técnico-Mecánica',
        description: 'Revisión técnico-mecánica y de emisiones contaminantes',
        requiresExpiry: true,
        isMandatory: true,
        expiryWarningDays: 45,
        expiryCriticalDays: 15,
        sortOrder: 2,
      },
    }),
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'INSURANCE',
        name: 'Seguro / Póliza',
        description: 'Póliza de seguro del vehículo',
        requiresExpiry: true,
        isMandatory: false,
        expiryWarningDays: 30,
        expiryCriticalDays: 7,
        sortOrder: 3,
      },
    }),
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'REGISTRATION',
        name: 'Tarjeta de Propiedad',
        description: 'Tarjeta de propiedad del vehículo',
        requiresExpiry: false,
        isMandatory: true,
        expiryWarningDays: 0,
        expiryCriticalDays: 0,
        sortOrder: 4,
      },
    }),
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'OTHER',
        name: 'Otro',
        description: 'Otro tipo de documento',
        requiresExpiry: false,
        isMandatory: false,
        expiryWarningDays: 30,
        expiryCriticalDays: 7,
        sortOrder: 5,
      },
    }),
  ]);
  console.log(
    `✓ Created ${globalDocTypes.length} global document type configs (CO)\n`
  );

  console.log('✅ Knowledge Base Global created successfully!\n');

  // ========================================
  // PARTE 2: TENANTS Y USUARIOS
  // ========================================

  // ========================================
  // A) TENANT PLATFORM (Fleet Care - SUPER_ADMIN)
  // ========================================
  console.log('🏢 Creating Platform Tenant...\n');

  const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000';

  const platformTenant = await prisma.tenant.upsert({
    where: { id: PLATFORM_TENANT_ID },
    update: { country: 'CO' },
    create: {
      id: PLATFORM_TENANT_ID,
      name: 'Fleet Care Platform',
      slug: 'fleet-care-platform',
      country: 'CO',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'platform@fleetcare.com',
    },
  });
  console.log(`✓ Created platform tenant: ${platformTenant.name}\n`);

  // SUPER_ADMIN (pertenece al tenant de la plataforma)
  // Usa el email real para permitir login
  console.log('Creating SUPER_ADMIN...');
  const superAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: PLATFORM_TENANT_ID,
        email: 'grivarol69@gmail.com',
      },
    },
    update: {},
    create: {
      tenantId: PLATFORM_TENANT_ID,
      email: 'grivarol69@gmail.com',
      firstName: 'Fleet Care',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✓ Created SUPER_ADMIN: ${superAdmin.email}\n`);

  // ========================================
  // B) TENANT CLIENTE (TransLogística)
  // ========================================
  console.log('🏢 Creating Customer Tenant...\n');

  const TENANT_ID = 'org_38zCXuXqy5Urw5CuaisTHu3jLTq';

  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: { country: 'CO' },
    create: {
      id: TENANT_ID,
      name: 'TransLogística del Caribe SAS',
      slug: 'translogistica-caribe',
      country: 'CO',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@translogistica.co',
    },
  });
  console.log(`✓ Created customer tenant: ${tenant.name}\n`);

  // USERS DEL CLIENTE
  // El OWNER usa el email real para permitir login con un solo email
  console.log('Creating customer users...');

  const owner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: TENANT_ID,
        email: 'grivarol69@gmail.com',
      },
    },
    update: {},
    create: {
      tenantId: TENANT_ID,
      email: 'grivarol69@gmail.com',
      firstName: 'Carlos',
      lastName: 'Pérez',
      role: 'OWNER',
      isActive: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: TENANT_ID,
        email: 'manager@translogistica.co',
      },
    },
    update: {},
    create: {
      tenantId: TENANT_ID,
      email: 'manager@translogistica.co',
      firstName: 'Ana',
      lastName: 'García',
      role: 'MANAGER',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: TENANT_ID,
        email: 'technician@translogistica.co',
      },
    },
    update: {},
    create: {
      tenantId: TENANT_ID,
      email: 'technician@translogistica.co',
      firstName: 'José',
      lastName: 'Martínez',
      role: 'TECHNICIAN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: TENANT_ID,
        email: 'driver@translogistica.co',
      },
    },
    update: {},
    create: {
      tenantId: TENANT_ID,
      email: 'driver@translogistica.co',
      firstName: 'Luis',
      lastName: 'Rodríguez',
      role: 'DRIVER',
      isActive: true,
    },
  });

  console.log(
    `✓ Created 5 users (SUPER_ADMIN + OWNER, MANAGER, TECHNICIAN, DRIVER)\n`
  );

  // TECHNICIANS
  console.log('Creating technicians and providers...');
  const technicians = await Promise.all([
    prisma.technician.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Taller Central',
        specialty: 'GENERAL',
        status: 'ACTIVE',
      },
    }),
    prisma.technician.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Especialista Motor',
        specialty: 'MOTOR',
        status: 'ACTIVE',
      },
    }),
  ]);

  // PROVIDERS
  const providers = await Promise.all([
    prisma.provider.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Repuestos Toyota',
        specialty: 'REPUESTOS',
        status: 'ACTIVE',
      },
    }),
    prisma.provider.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Lubricantes Shell',
        specialty: 'LUBRICANTES',
        status: 'ACTIVE',
      },
    }),
    prisma.provider.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Taller ABC Frenos',
        specialty: 'FRENOS',
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(
    `✓ Created ${technicians.length} technicians and ${providers.length} providers\n`
  );

  // DRIVERS
  console.log('Creating drivers...');
  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Juan López',
        licenseNumber: '12345678',
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Pedro Gómez',
        licenseNumber: '87654321',
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        tenantId: TENANT_ID,
        name: 'María Fernández',
        licenseNumber: '11223344',
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`✓ Created ${drivers.length} drivers\n`);

  // VEHICLES
  console.log('Creating vehicles...');
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'ABC-123',
        brandId: globalBrands[0].id, // Toyota
        lineId: globalLines[0].id, // Hilux
        typeId: globalTypes[0].id, // Camioneta 4x4
        year: 2022,
        mileage: 45000,
        color: 'Blanco',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'DEF-456',
        brandId: globalBrands[1].id, // Ford
        lineId: globalLines[3].id, // Ranger
        typeId: globalTypes[0].id,
        year: 2021,
        mileage: 62000,
        color: 'Negro',
        status: 'ACTIVE',
        situation: 'IN_USE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'GHI-789',
        brandId: globalBrands[2].id, // Chevrolet
        lineId: globalLines[6].id, // D-MAX
        typeId: globalTypes[0].id,
        year: 2023,
        mileage: 18000,
        color: 'Rojo',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'LEASED',
        typePlate: 'PARTICULAR',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'JKL-012',
        brandId: globalBrands[0].id, // Toyota
        lineId: globalLines[1].id, // Land Cruiser
        typeId: globalTypes[4].id, // SUV
        year: 2020,
        mileage: 95000,
        color: 'Gris',
        status: 'ACTIVE',
        situation: 'MAINTENANCE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'MNO-345',
        brandId: globalBrands[1].id, // Ford
        lineId: globalLines[5].id, // Transit
        typeId: globalTypes[2].id, // Camioneta de Pasajeros
        year: 2022,
        mileage: 38000,
        color: 'Azul',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'OWN',
        typePlate: 'PUBLICO',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'PQR-678',
        brandId: globalBrands[3].id, // Nissan
        lineId: globalLines[9].id, // Frontier
        typeId: globalTypes[0].id,
        year: 2021,
        mileage: 72000,
        color: 'Plateado',
        status: 'ACTIVE',
        situation: 'IN_USE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'STU-901',
        brandId: globalBrands[2].id, // Chevrolet
        lineId: globalLines[8].id, // NPR
        typeId: globalTypes[1].id, // Camión de Carga
        year: 2019,
        mileage: 120000,
        color: 'Blanco',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'OWN',
        typePlate: 'PUBLICO',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'VWX-234',
        brandId: globalBrands[4].id, // Mitsubishi
        lineId: globalLines[11].id, // L200
        typeId: globalTypes[0].id,
        year: 2023,
        mileage: 12000,
        color: 'Verde',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'RENTED',
        typePlate: 'PARTICULAR',
      },
    }),
  ]);

  console.log(`✓ Created ${vehicles.length} vehicles\n`);

  // ========================================
  // PARTE 3: DATOS DEL TENANT (sin operacionales)
  // ========================================

  // MASTER PARTS (Catálogo global de artículos)
  console.log('Creating global master parts catalog...');
  const masterParts = await Promise.all([
    // ACEITES
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'SHELL-HELIX-HX7-10W40',
        description: 'Aceite Shell Helix HX7 10W-40 Semi-Sintético',
        category: 'LUBRICANTES',
        subcategory: 'ACEITE_MOTOR',
        unit: 'LITRO',
        referencePrice: 45000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'MOBIL-SUPER-3000-5W40',
        description: 'Aceite Mobil Super 3000 5W-40 Sintético',
        category: 'LUBRICANTES',
        subcategory: 'ACEITE_MOTOR',
        unit: 'LITRO',
        referencePrice: 58000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'CASTROL-GTX-15W40',
        description: 'Aceite Castrol GTX 15W-40 Mineral',
        category: 'LUBRICANTES',
        subcategory: 'ACEITE_MOTOR',
        unit: 'LITRO',
        referencePrice: 35000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    // FILTROS
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'BOSCH-0986AF0134',
        description: 'Filtro Aceite BOSCH 0986AF0134',
        category: 'FILTROS',
        subcategory: 'FILTRO_ACEITE',
        unit: 'UNIDAD',
        referencePrice: 28000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'MANN-W920/21',
        description: 'Filtro Aceite MANN W920/21',
        category: 'FILTROS',
        subcategory: 'FILTRO_ACEITE',
        unit: 'UNIDAD',
        referencePrice: 32000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'BOSCH-F026400364',
        description: 'Filtro Aire BOSCH F026400364',
        category: 'FILTROS',
        subcategory: 'FILTRO_AIRE',
        unit: 'UNIDAD',
        referencePrice: 42000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'MANN-C25114',
        description: 'Filtro Aire MANN C25114',
        category: 'FILTROS',
        subcategory: 'FILTRO_AIRE',
        unit: 'UNIDAD',
        referencePrice: 48000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'BOSCH-F026402065',
        description: 'Filtro Combustible BOSCH F026402065',
        category: 'FILTROS',
        subcategory: 'FILTRO_COMBUSTIBLE',
        unit: 'UNIDAD',
        referencePrice: 55000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    // FRENOS
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'BOSCH-0986AB1234',
        description: 'Pastillas Freno Delanteras BOSCH',
        category: 'FRENOS',
        subcategory: 'PASTILLAS',
        unit: 'JUEGO',
        referencePrice: 185000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'CASTROL-DOT4-500ML',
        description: 'Líquido Frenos Castrol DOT4 500ml',
        category: 'FRENOS',
        subcategory: 'LIQUIDO_FRENOS',
        unit: 'UNIDAD',
        referencePrice: 22000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ Created ${masterParts.length} master parts\n`);

  // VEHICLE DRIVER ASSIGNMENTS
  console.log('Creating vehicle-driver assignments...');
  const vehicleDrivers = await Promise.all([
    prisma.vehicleDriver.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId: vehicles[0].id, // ABC-123
        driverId: drivers[0].id, // Juan López
        status: 'ACTIVE',
        isPrimary: true,
        startDate: new Date(),
        assignedBy: owner.id,
      },
    }),
    prisma.vehicleDriver.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId: vehicles[1].id, // DEF-456
        driverId: drivers[1].id, // Pedro Gómez
        status: 'ACTIVE',
        isPrimary: true,
        startDate: new Date(),
        assignedBy: owner.id,
      },
    }),
    prisma.vehicleDriver.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId: vehicles[4].id, // MNO-345
        driverId: drivers[2].id, // María Fernández
        status: 'ACTIVE',
        isPrimary: true,
        startDate: new Date(),
        assignedBy: owner.id,
      },
    }),
  ]);
  console.log(
    `✓ Created ${vehicleDrivers.length} vehicle-driver assignments\n`
  );

  // Suppress unused variable warnings
  void manager;

  console.log('✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log('\n🌍 KNOWLEDGE BASE GLOBAL (tenantId: NULL):');
  console.log(`   - Vehicle Brands: ${globalBrands.length}`);
  console.log(`   - Vehicle Lines: ${globalLines.length}`);
  console.log(`   - Vehicle Types: ${globalTypes.length}`);
  console.log(`   - Maintenance Categories: ${globalCategories.length}`);
  console.log(
    `   - Maintenance Items: ${globalMantItems.length} (17 preventive + 16 corrective)`
  );
  console.log(
    `   - Maintenance Templates: 3 (Toyota Hilux, Ford Ranger, Chevy D-MAX)`
  );
  console.log(
    `   - Template Packages: 12 total (4 per template: 5K, 10K, 20K, 30K)`
  );
  console.log(`   - Master Parts (Catalog): ${masterParts.length}`);
  console.log(`   - Document Type Configs (CO): ${globalDocTypes.length}`);

  console.log('\n🏢 TENANT PLATFORM (Fleet Care):');
  console.log(`   - Platform Tenant: 1`);
  console.log(`   - SUPER_ADMIN: 1 (grivarol69@gmail.com)`);

  console.log('\n🚛 TENANT CLIENTE (TransLogística del Caribe SAS):');
  console.log(`   - Customer Tenant: 1`);
  console.log(`   - Users: 4 (OWNER, MANAGER, TECHNICIAN, DRIVER)`);
  console.log(`   - Vehicles: ${vehicles.length}`);
  console.log(`   - Drivers: ${drivers.length}`);
  console.log(`   - Technicians: ${technicians.length}`);
  console.log(`   - Providers: ${providers.length}`);
  console.log(`   - Vehicle-Driver Assignments: ${vehicleDrivers.length}`);

  console.log('\n⚠️  NO se crearon (para pruebas manuales):');
  console.log(`   - Odometer Logs: 0`);
  console.log(`   - Maintenance Alerts: 0`);
  console.log(`   - Work Orders: 0`);
  console.log(`   - Invoices: 0`);
  console.log(`   - Vehicle Maintenance Programs: 0\n`);

  console.log('🔑 USUARIOS CONFIGURADOS:');
  console.log(
    '   - grivarol69@gmail.com → SUPER_ADMIN (Platform) + OWNER (TransLogística)'
  );
  console.log('   - manager@translogistica.co → MANAGER (prueba)');
  console.log('   - technician@translogistica.co → TECHNICIAN (prueba)');
  console.log('   - driver@translogistica.co → DRIVER (prueba)\n');
}

main()
  .catch(e => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
