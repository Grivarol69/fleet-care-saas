import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...\n');

  // ========================================
  // PARTE 1: KNOWLEDGE BASE GLOBAL
  // ========================================
  console.log('📚 Creating Global Knowledge Base...\n');

  // 1. GLOBAL BRANDS
  console.log('Creating global brands...');
  const globalBrands = await Promise.all([
    prisma.vehicleBrand.create({
      data: { name: 'Toyota', isGlobal: true, tenantId: null }
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Ford', isGlobal: true, tenantId: null }
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Chevrolet', isGlobal: true, tenantId: null }
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Nissan', isGlobal: true, tenantId: null }
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Mitsubishi', isGlobal: true, tenantId: null }
    }),
  ]);
  console.log(`✓ Created ${globalBrands.length} global brands\n`);

  // 2. GLOBAL LINES
  console.log('Creating global vehicle lines...');
  const globalLines = await Promise.all([
    // Toyota
    prisma.vehicleLine.create({
      data: { name: 'Hilux', brandId: globalBrands[0].id, isGlobal: true, tenantId: null }
    }),
    prisma.vehicleLine.create({
      data: { name: 'Land Cruiser', brandId: globalBrands[0].id, isGlobal: true, tenantId: null }
    }),
    prisma.vehicleLine.create({
      data: { name: 'Prado', brandId: globalBrands[0].id, isGlobal: true, tenantId: null }
    }),
    // Ford
    prisma.vehicleLine.create({
      data: { name: 'Ranger', brandId: globalBrands[1].id, isGlobal: true, tenantId: null }
    }),
    prisma.vehicleLine.create({
      data: { name: 'F-150', brandId: globalBrands[1].id, isGlobal: true, tenantId: null }
    }),
    prisma.vehicleLine.create({
      data: { name: 'Transit', brandId: globalBrands[1].id, isGlobal: true, tenantId: null }
    }),
    // Chevrolet
    prisma.vehicleLine.create({
      data: { name: 'D-MAX', brandId: globalBrands[2].id, isGlobal: true, tenantId: null }
    }),
    prisma.vehicleLine.create({
      data: { name: 'Silverado', brandId: globalBrands[2].id, isGlobal: true, tenantId: null }
    }),
    prisma.vehicleLine.create({
      data: { name: 'NPR', brandId: globalBrands[2].id, isGlobal: true, tenantId: null }
    }),
    // Nissan
    prisma.vehicleLine.create({
      data: { name: 'Frontier', brandId: globalBrands[3].id, isGlobal: true, tenantId: null }
    }),
    prisma.vehicleLine.create({
      data: { name: 'Navara', brandId: globalBrands[3].id, isGlobal: true, tenantId: null }
    }),
    // Mitsubishi
    prisma.vehicleLine.create({
      data: { name: 'L200', brandId: globalBrands[4].id, isGlobal: true, tenantId: null }
    }),
    prisma.vehicleLine.create({
      data: { name: 'Montero', brandId: globalBrands[4].id, isGlobal: true, tenantId: null }
    }),
  ]);
  console.log(`✓ Created ${globalLines.length} global vehicle lines\n`);

  // 3. GLOBAL TYPES
  console.log('Creating global vehicle types...');
  const globalTypes = await Promise.all([
    prisma.vehicleType.create({
      data: { name: 'Camioneta 4x4', isGlobal: true, tenantId: null }
    }),
    prisma.vehicleType.create({
      data: { name: 'Camión de Carga', isGlobal: true, tenantId: null }
    }),
    prisma.vehicleType.create({
      data: { name: 'Camioneta de Pasajeros', isGlobal: true, tenantId: null }
    }),
    prisma.vehicleType.create({
      data: { name: 'Vehículo Urbano', isGlobal: true, tenantId: null }
    }),
    prisma.vehicleType.create({
      data: { name: 'SUV', isGlobal: true, tenantId: null }
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
        tenantId: null
      }
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Transmisión',
        description: 'Caja de cambios y embrague',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Frenos',
        description: 'Sistema de frenado',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Suspensión',
        description: 'Amortiguadores y resortes',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Eléctrico',
        description: 'Sistema eléctrico y batería',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Lubricación',
        description: 'Aceites y lubricantes',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Filtros',
        description: 'Filtros aire, aceite, combustible',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Neumáticos',
        description: 'Llantas y neumáticos',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Carrocería',
        description: 'Elementos de carrocería',
        isGlobal: true,
        tenantId: null
      }
    }),
  ]);
  console.log(`✓ Created ${globalCategories.length} global maintenance categories\n`);

  // 5. GLOBAL MAINTENANCE ITEMS
  console.log('Creating global maintenance items...');
  const globalMantItems = await Promise.all([
    // Motor
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite motor',
        description: 'Cambio de aceite motor 5W-40 sintético',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[0].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspección sistema combustible',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[0].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajuste válvulas',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[0].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Filtros
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aceite',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[6].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aire',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[6].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro combustible',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[6].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Frenos
    prisma.mantItem.create({
      data: {
        name: 'Inspección pastillas freno',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[2].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio líquido frenos',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[2].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio pastillas freno delanteras',
        mantType: 'CORRECTIVE',
        categoryId: globalCategories[2].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Suspensión
    prisma.mantItem.create({
      data: {
        name: 'Inspección amortiguadores',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[3].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Lubricación rótulas',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[3].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Eléctrico
    prisma.mantItem.create({
      data: {
        name: 'Inspección batería',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[4].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Limpieza terminales batería',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[4].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Transmisión
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite transmisión',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[1].id,
        type: 'PART',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajuste embrague',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[1].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Neumáticos
    prisma.mantItem.create({
      data: {
        name: 'Rotación neumáticos',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[7].id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Balanceo y alineación',
        mantType: 'PREVENTIVE',
        categoryId: globalCategories[7].id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null
      }
    }),
  ]);
  console.log(`✓ Created ${globalMantItems.length} global maintenance items\n`);

  // 6. GLOBAL MAINTENANCE TEMPLATES
  console.log('Creating global maintenance templates...');

  // Template: Toyota Hilux
  const template_ToyotaHilux = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Toyota Hilux Standard',
      description: 'Programa de mantenimiento preventivo estándar para Toyota Hilux',
      vehicleBrandId: globalBrands[0].id,
      vehicleLineId: globalLines[0].id,
      version: '1.0',
      isDefault: true,
      status: 'ACTIVE',
      isGlobal: true,
      tenantId: null,
    }
  });

  // Packages para Toyota Hilux
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
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[0].id, // Cambio aceite
        triggerKm: 5000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[3].id, // Filtro aceite
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[4].id, // Filtro aire
        triggerKm: 5000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[6].id, // Inspección frenos
        triggerKm: 5000,
        estimatedTime: 0.5,
        order: 4,
        priority: 'HIGH'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[11].id, // Inspección batería
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 5,
        priority: 'LOW'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_5k.id,
        mantItemId: globalMantItems[15].id, // Rotación neumáticos
        triggerKm: 5000,
        estimatedTime: 0.7,
        order: 6,
        priority: 'MEDIUM'
      }
    }),
  ]);

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
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 10000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[5].id, // Filtro combustible
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[6].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 5,
        priority: 'HIGH'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[9].id, // Inspección amortiguadores
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[10].id, // Lubricación rótulas
        triggerKm: 10000,
        estimatedTime: 0.4,
        order: 7,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_10k.id,
        mantItemId: globalMantItems[16].id, // Balanceo
        triggerKm: 10000,
        estimatedTime: 0.8,
        order: 8,
        priority: 'MEDIUM'
      }
    }),
  ]);

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
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 20000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 20000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[5].id,
        triggerKm: 20000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[2].id, // Ajuste válvulas
        triggerKm: 20000,
        estimatedTime: 1.0,
        order: 5,
        priority: 'HIGH'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[6].id,
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 6,
        priority: 'HIGH'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[7].id, // Cambio líquido frenos
        triggerKm: 20000,
        estimatedTime: 0.5,
        order: 7,
        priority: 'HIGH'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Hilux_20k.id,
        mantItemId: globalMantItems[13].id, // Aceite transmisión
        triggerKm: 20000,
        estimatedTime: 1.2,
        order: 8,
        priority: 'MEDIUM'
      }
    }),
  ]);

  console.log(`✓ Created template "Toyota Hilux Standard" with 3 packages and ${6 + 8 + 8} items\n`);

  // Template: Ford Ranger
  const template_FordRanger = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Ford Ranger Standard',
      description: 'Programa de mantenimiento preventivo estándar para Ford Ranger',
      vehicleBrandId: globalBrands[1].id, // Ford
      vehicleLineId: globalLines[3].id,   // Ranger
      version: '1.0',
      isDefault: true,
      status: 'ACTIVE',
      isGlobal: true,
      tenantId: null,
    }
  });

  // Packages para Ford Ranger
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
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_5k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 5000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_5k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_5k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 5000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_5k.id,
        mantItemId: globalMantItems[11].id,
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 4,
        priority: 'LOW'
      }
    }),
  ]);

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
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_10k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_10k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_10k.id,
        mantItemId: globalMantItems[5].id,
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 3,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Ranger_10k.id,
        mantItemId: globalMantItems[6].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 4,
        priority: 'HIGH'
      }
    }),
  ]);

  console.log(`✓ Created template "Ford Ranger Standard" with 2 packages\n`);

  // Template: Chevrolet D-MAX
  const template_ChevyDmax = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Chevrolet D-MAX Standard',
      description: 'Programa de mantenimiento preventivo estándar para Chevrolet D-MAX',
      vehicleBrandId: globalBrands[2].id, // Chevrolet
      vehicleLineId: globalLines[6].id,   // D-MAX
      version: '1.0',
      isDefault: true,
      status: 'ACTIVE',
      isGlobal: true,
      tenantId: null,
    }
  });

  // Packages para Chevrolet D-MAX
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
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_5k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 5000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_5k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 5000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_5k.id,
        mantItemId: globalMantItems[4].id,
        triggerKm: 5000,
        estimatedTime: 0.2,
        order: 3,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_5k.id,
        mantItemId: globalMantItems[15].id,
        triggerKm: 5000,
        estimatedTime: 0.7,
        order: 4,
        priority: 'MEDIUM'
      }
    }),
  ]);

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
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_10k.id,
        mantItemId: globalMantItems[0].id,
        triggerKm: 10000,
        estimatedTime: 0.5,
        order: 1,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_10k.id,
        mantItemId: globalMantItems[3].id,
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 2,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_10k.id,
        mantItemId: globalMantItems[5].id,
        triggerKm: 10000,
        estimatedTime: 0.3,
        order: 3,
        priority: 'MEDIUM'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: package_Dmax_10k.id,
        mantItemId: globalMantItems[13].id,
        triggerKm: 10000,
        estimatedTime: 1.2,
        order: 4,
        priority: 'MEDIUM'
      }
    }),
  ]);

  console.log(`✓ Created template "Chevrolet D-MAX Standard" with 2 packages\n`);

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
    update: {},
    create: {
      id: PLATFORM_TENANT_ID,
      name: 'Fleet Care Platform',
      slug: 'fleet-care-platform',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'platform@fleetcare.com',
    },
  });
  console.log(`✓ Created platform tenant: ${platformTenant.name}\n`);

  // SUPER_ADMIN (pertenece al tenant de la plataforma)
  console.log('Creating SUPER_ADMIN...');
  const superAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: PLATFORM_TENANT_ID,
        email: 'admin@fleetcare.com',
      },
    },
    update: {},
    create: {
      tenantId: PLATFORM_TENANT_ID,
      email: 'admin@fleetcare.com',
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

  const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'TransLogística del Caribe SAS',
      slug: 'translogistica-caribe',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@translogistica.co',
    },
  });
  console.log(`✓ Created customer tenant: ${tenant.name}\n`);

  // USERS DEL CLIENTE
  console.log('Creating customer users...');

  const owner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: TENANT_ID,
        email: 'owner@translogistica.co',
      },
    },
    update: {},
    create: {
      tenantId: TENANT_ID,
      email: 'owner@translogistica.co',
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

  const technician_user = await prisma.user.upsert({
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

  const driver_user = await prisma.user.upsert({
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

  console.log(`✓ Created 5 users (all roles)\n`);

  // TECHNICIANS
  console.log('Creating technicians and providers...');
  const technicians = await Promise.all([
    prisma.technician.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Taller Central',
        specialty: 'GENERAL',
        status: 'ACTIVE',
      }
    }),
    prisma.technician.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Especialista Motor',
        specialty: 'MOTOR',
        status: 'ACTIVE',
      }
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
      }
    }),
    prisma.provider.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Lubricantes Shell',
        specialty: 'LUBRICANTES',
        status: 'ACTIVE',
      }
    }),
    prisma.provider.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Taller ABC Frenos',
        specialty: 'FRENOS',
        status: 'ACTIVE',
      }
    }),
  ]);

  console.log(`✓ Created ${technicians.length} technicians and ${providers.length} providers\n`);

  // DRIVERS
  console.log('Creating drivers...');
  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Juan López',
        licenseNumber: '12345678',
        status: 'ACTIVE',
      }
    }),
    prisma.driver.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Pedro Gómez',
        licenseNumber: '87654321',
        status: 'ACTIVE',
      }
    }),
    prisma.driver.create({
      data: {
        tenantId: TENANT_ID,
        name: 'María Fernández',
        licenseNumber: '11223344',
        status: 'ACTIVE',
      }
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
        lineId: globalLines[0].id,   // Hilux
        typeId: globalTypes[0].id,   // Camioneta 4x4
        year: 2022,
        mileage: 45000,
        color: 'Blanco',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      }
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'DEF-456',
        brandId: globalBrands[1].id, // Ford
        lineId: globalLines[3].id,   // Ranger
        typeId: globalTypes[0].id,
        year: 2021,
        mileage: 62000,
        color: 'Negro',
        status: 'ACTIVE',
        situation: 'IN_USE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      }
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'GHI-789',
        brandId: globalBrands[2].id, // Chevrolet
        lineId: globalLines[6].id,   // D-MAX
        typeId: globalTypes[0].id,
        year: 2023,
        mileage: 18000,
        color: 'Rojo',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'LEASED',
        typePlate: 'PARTICULAR',
      }
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'JKL-012',
        brandId: globalBrands[0].id, // Toyota
        lineId: globalLines[1].id,   // Land Cruiser
        typeId: globalTypes[4].id,   // SUV
        year: 2020,
        mileage: 95000,
        color: 'Gris',
        status: 'ACTIVE',
        situation: 'MAINTENANCE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      }
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'MNO-345',
        brandId: globalBrands[1].id, // Ford
        lineId: globalLines[5].id,   // Transit
        typeId: globalTypes[2].id,   // Camioneta de Pasajeros
        year: 2022,
        mileage: 38000,
        color: 'Azul',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'OWN',
        typePlate: 'PUBLICO',
      }
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'PQR-678',
        brandId: globalBrands[3].id, // Nissan
        lineId: globalLines[9].id,   // Frontier
        typeId: globalTypes[0].id,
        year: 2021,
        mileage: 72000,
        color: 'Plateado',
        status: 'ACTIVE',
        situation: 'IN_USE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      }
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'STU-901',
        brandId: globalBrands[2].id, // Chevrolet
        lineId: globalLines[8].id,   // NPR
        typeId: globalTypes[1].id,   // Camión de Carga
        year: 2019,
        mileage: 120000,
        color: 'Blanco',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'OWN',
        typePlate: 'PUBLICO',
      }
    }),
    prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'VWX-234',
        brandId: globalBrands[4].id, // Mitsubishi
        lineId: globalLines[11].id,  // L200
        typeId: globalTypes[0].id,
        year: 2023,
        mileage: 12000,
        color: 'Verde',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'RENTED',
        typePlate: 'PARTICULAR',
      }
    }),
  ]);

  console.log(`✓ Created ${vehicles.length} vehicles\n`);

  // ========================================
  // PARTE 3: DATOS OPERACIONALES DEL CLIENTE
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
        driverId: drivers[0].id,   // Juan López
        status: 'ACTIVE',
        isPrimary: true,
        startDate: new Date('2024-01-15'),
        assignedBy: owner.id,
      }
    }),
    prisma.vehicleDriver.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId: vehicles[1].id, // DEF-456
        driverId: drivers[1].id,   // Pedro Gómez
        status: 'ACTIVE',
        isPrimary: true,
        startDate: new Date('2024-02-01'),
        assignedBy: owner.id,
      }
    }),
    prisma.vehicleDriver.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId: vehicles[4].id, // MNO-345
        driverId: drivers[2].id,   // María Fernández
        status: 'ACTIVE',
        isPrimary: true,
        startDate: new Date('2024-03-10'),
        assignedBy: owner.id,
      }
    }),
  ]);
  console.log(`✓ Created ${vehicleDrivers.length} vehicle-driver assignments\n`);

  // ODOMETER LOGS (Histórico de registros)
  console.log('Creating odometer logs...');
  const now = new Date();
  const odometerLogs = [];

  // Vehicle ABC-123 (Toyota Hilux, mileage: 45000)
  for (let i = 0; i < 12; i++) {
    odometerLogs.push(
      prisma.odometerLog.create({
        data: {
          vehicleId: vehicles[0].id,
          driverId: drivers[0].id,
          kilometers: 35000 + (i * 850),
          measureType: 'KILOMETERS',
          recordedAt: new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000),
        }
      })
    );
  }

  // Vehicle DEF-456 (Ford Ranger, mileage: 62000)
  for (let i = 0; i < 15; i++) {
    odometerLogs.push(
      prisma.odometerLog.create({
        data: {
          vehicleId: vehicles[1].id,
          driverId: drivers[1].id,
          kilometers: 50000 + (i * 800),
          measureType: 'KILOMETERS',
          recordedAt: new Date(now.getTime() - (15 - i) * 7 * 24 * 60 * 60 * 1000),
        }
      })
    );
  }

  // Vehicle GHI-789 (Chevy D-MAX, mileage: 18000)
  for (let i = 0; i < 8; i++) {
    odometerLogs.push(
      prisma.odometerLog.create({
        data: {
          vehicleId: vehicles[2].id,
          kilometers: 12000 + (i * 750),
          measureType: 'KILOMETERS',
          recordedAt: new Date(now.getTime() - (8 - i) * 7 * 24 * 60 * 60 * 1000),
        }
      })
    );
  }

  await Promise.all(odometerLogs);
  console.log(`✓ Created ${odometerLogs.length} odometer logs\n`);

  // VEHICLE MAINTENANCE PROGRAMS
  console.log('Creating vehicle maintenance programs...');

  // Program para ABC-123 (Toyota Hilux) - usar template Toyota Hilux
  const program_ABC123 = await prisma.vehicleMantProgram.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicles[0].id,
      name: 'Programa Toyota Hilux ABC-123',
      description: 'Programa preventivo basado en template Toyota Hilux Standard',
      generatedFrom: 'Template: Toyota Hilux Standard v1.0',
      generatedBy: owner.id,
      assignmentKm: 35000,
      nextMaintenanceKm: 50000,
      nextMaintenanceDesc: 'Mantenimiento 50,000 km',
      isActive: true,
      status: 'ACTIVE',
    }
  });

  // Program para DEF-456 (Ford Ranger) - usar template Ford Ranger
  const program_DEF456 = await prisma.vehicleMantProgram.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicles[1].id,
      name: 'Programa Ford Ranger DEF-456',
      description: 'Programa preventivo basado en template Ford Ranger Standard',
      generatedFrom: 'Template: Ford Ranger Standard v1.0',
      generatedBy: owner.id,
      assignmentKm: 50000,
      nextMaintenanceKm: 65000,
      nextMaintenanceDesc: 'Mantenimiento 65,000 km',
      isActive: true,
      status: 'ACTIVE',
    }
  });

  // Program para GHI-789 (Chevy D-MAX)
  const program_GHI789 = await prisma.vehicleMantProgram.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicles[2].id,
      name: 'Programa Chevrolet D-MAX GHI-789',
      description: 'Programa preventivo basado en template Chevrolet D-MAX Standard',
      generatedFrom: 'Template: Chevrolet D-MAX Standard v1.0',
      generatedBy: owner.id,
      assignmentKm: 12000,
      nextMaintenanceKm: 20000,
      nextMaintenanceDesc: 'Mantenimiento 20,000 km',
      isActive: true,
      status: 'ACTIVE',
    }
  });

  console.log(`✓ Created 3 vehicle maintenance programs\n`);

  // VEHICLE PROGRAM PACKAGES
  console.log('Creating vehicle program packages...');

  // Packages para ABC-123 (mileage actual: 45000)
  const pkg_ABC123_40k = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: program_ABC123.id,
      name: 'Mantenimiento 40,000 km',
      description: 'Mantenimiento preventivo completado',
      triggerKm: 40000,
      packageType: 'PREVENTIVE',
      priority: 'MEDIUM',
      estimatedCost: 450000,
      estimatedTime: 2.5,
      actualCost: 478000,
      actualTime: 2.8,
      status: 'COMPLETED',
      scheduledKm: 40000,
      executedKm: 40150,
      startDate: new Date('2024-10-15'),
      endDate: new Date('2024-10-15'),
      technicianId: technicians[0].id,
    }
  });

  const pkg_ABC123_45k = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: program_ABC123.id,
      name: 'Mantenimiento 45,000 km',
      description: 'Mantenimiento preventivo completado recientemente',
      triggerKm: 45000,
      packageType: 'PREVENTIVE',
      priority: 'MEDIUM',
      estimatedCost: 450000,
      estimatedTime: 2.5,
      actualCost: 465000,
      actualTime: 2.7,
      status: 'COMPLETED',
      scheduledKm: 45000,
      executedKm: 45080,
      startDate: new Date('2024-11-20'),
      endDate: new Date('2024-11-20'),
      technicianId: technicians[0].id,
    }
  });

  const pkg_ABC123_50k = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: program_ABC123.id,
      name: 'Mantenimiento 50,000 km',
      description: 'Próximo mantenimiento programado',
      triggerKm: 50000,
      packageType: 'PREVENTIVE',
      priority: 'MEDIUM',
      estimatedCost: 750000,
      estimatedTime: 4.0,
      status: 'PENDING',
      scheduledKm: 50000,
    }
  });

  // Packages para DEF-456 (mileage actual: 62000)
  const pkg_DEF456_60k = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: program_DEF456.id,
      name: 'Mantenimiento 60,000 km',
      description: 'Mantenimiento preventivo completado',
      triggerKm: 60000,
      packageType: 'PREVENTIVE',
      priority: 'MEDIUM',
      estimatedCost: 520000,
      estimatedTime: 3.0,
      actualCost: 545000,
      actualTime: 3.2,
      status: 'COMPLETED',
      scheduledKm: 60000,
      executedKm: 60200,
      startDate: new Date('2024-11-10'),
      endDate: new Date('2024-11-10'),
      technicianId: technicians[1].id,
    }
  });

  const pkg_DEF456_65k = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: program_DEF456.id,
      name: 'Mantenimiento 65,000 km',
      description: 'Próximo mantenimiento - ALERTA ACTIVA',
      triggerKm: 65000,
      packageType: 'PREVENTIVE',
      priority: 'HIGH',
      estimatedCost: 520000,
      estimatedTime: 3.0,
      status: 'PENDING',
      scheduledKm: 65000,
    }
  });

  // Packages para GHI-789 (mileage actual: 18000)
  const pkg_GHI789_15k = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: program_GHI789.id,
      name: 'Mantenimiento 15,000 km',
      description: 'Mantenimiento preventivo completado',
      triggerKm: 15000,
      packageType: 'PREVENTIVE',
      priority: 'MEDIUM',
      estimatedCost: 440000,
      estimatedTime: 2.5,
      actualCost: 455000,
      actualTime: 2.6,
      status: 'COMPLETED',
      scheduledKm: 15000,
      executedKm: 15100,
      startDate: new Date('2024-09-25'),
      endDate: new Date('2024-09-25'),
      technicianId: technicians[0].id,
    }
  });

  const pkg_GHI789_20k = await prisma.vehicleProgramPackage.create({
    data: {
      tenantId: TENANT_ID,
      programId: program_GHI789.id,
      name: 'Mantenimiento 20,000 km',
      description: 'Próximo mantenimiento programado',
      triggerKm: 20000,
      packageType: 'PREVENTIVE',
      priority: 'MEDIUM',
      estimatedCost: 540000,
      estimatedTime: 3.0,
      status: 'PENDING',
      scheduledKm: 20000,
    }
  });

  console.log(`✓ Created 8 vehicle program packages\n`);

  // VEHICLE PROGRAM ITEMS
  console.log('Creating vehicle program items...');

  // Items para pkg_ABC123_50k (próximo mantenimiento)
  const items_ABC123_50k = await Promise.all([
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_ABC123_50k.id,
        mantItemId: globalMantItems[0].id, // Cambio aceite
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        scheduledKm: 50000,
        estimatedCost: 180000,
        estimatedTime: 0.5,
        status: 'PENDING',
        order: 1,
      }
    }),
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_ABC123_50k.id,
        mantItemId: globalMantItems[3].id, // Filtro aceite
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        scheduledKm: 50000,
        estimatedCost: 32000,
        estimatedTime: 0.3,
        status: 'PENDING',
        order: 2,
      }
    }),
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_ABC123_50k.id,
        mantItemId: globalMantItems[4].id, // Filtro aire
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        scheduledKm: 50000,
        estimatedCost: 48000,
        estimatedTime: 0.2,
        status: 'PENDING',
        order: 3,
      }
    }),
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_ABC123_50k.id,
        mantItemId: globalMantItems[5].id, // Filtro combustible
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        scheduledKm: 50000,
        estimatedCost: 55000,
        estimatedTime: 0.3,
        status: 'PENDING',
        order: 4,
      }
    }),
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_ABC123_50k.id,
        mantItemId: globalMantItems[6].id, // Inspección frenos
        mantType: 'PREVENTIVE',
        priority: 'HIGH',
        scheduledKm: 50000,
        estimatedCost: 0,
        estimatedTime: 0.5,
        status: 'PENDING',
        order: 5,
      }
    }),
  ]);

  // Items para pkg_DEF456_65k (próximo - con alerta)
  const items_DEF456_65k = await Promise.all([
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_DEF456_65k.id,
        mantItemId: globalMantItems[0].id,
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        scheduledKm: 65000,
        estimatedCost: 180000,
        estimatedTime: 0.5,
        status: 'PENDING',
        order: 1,
      }
    }),
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_DEF456_65k.id,
        mantItemId: globalMantItems[3].id,
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        scheduledKm: 65000,
        estimatedCost: 32000,
        estimatedTime: 0.3,
        status: 'PENDING',
        order: 2,
      }
    }),
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_DEF456_65k.id,
        mantItemId: globalMantItems[5].id,
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        scheduledKm: 65000,
        estimatedCost: 55000,
        estimatedTime: 0.3,
        status: 'PENDING',
        order: 3,
      }
    }),
    prisma.vehicleProgramItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: pkg_DEF456_65k.id,
        mantItemId: globalMantItems[6].id,
        mantType: 'PREVENTIVE',
        priority: 'HIGH',
        scheduledKm: 65000,
        estimatedCost: 0,
        estimatedTime: 0.5,
        status: 'PENDING',
        order: 4,
      }
    }),
  ]);

  console.log(`✓ Created ${items_ABC123_50k.length + items_DEF456_65k.length} vehicle program items\n`);

  // MAINTENANCE ALERTS
  console.log('Creating maintenance alerts...');

  // Alerta MEDIUM para DEF-456 (3000 km para vencer)
  const alert_DEF456 = await prisma.maintenanceAlert.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicles[1].id,
      programItemId: items_DEF456_65k[0].id, // Cambio aceite
      type: 'PREVENTIVE',
      category: 'ROUTINE',
      itemName: 'Cambio aceite motor',
      packageName: 'Mantenimiento 65,000 km',
      description: 'Próximo cambio de aceite motor programado',
      estimatedCost: 180000,
      estimatedDuration: 0.5,
      scheduledKm: 65000,
      currentKmAtCreation: 62000,
      currentKm: 62000,
      kmToMaintenance: 3000,
      alertThresholdKm: 5000,
      priority: 'MEDIUM',
      alertLevel: 'MEDIUM',
      priorityScore: 60,
      status: 'PENDING',
      notificationsSent: 1,
      lastNotificationAt: new Date(),
    }
  });

  console.log(`✓ Created 1 maintenance alert\n`);

  // WORK ORDERS
  console.log('Creating work orders...');

  // WO Completada para ABC-123 (mantenimiento 45k)
  const wo_ABC123_45k = await prisma.workOrder.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicles[0].id,
      title: 'Mantenimiento Preventivo 45,000 km',
      description: 'Mantenimiento preventivo según programa Toyota Hilux',
      mantType: 'PREVENTIVE',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      technicianId: technicians[0].id,
      creationMileage: 45080,
      isPackageWork: true,
      packageName: 'Mantenimiento 45,000 km',
      requestedBy: manager.id,
      authorizedBy: owner.id,
      estimatedCost: 450000,
      actualCost: 465000,
      startDate: new Date('2024-11-20T08:00:00'),
      endDate: new Date('2024-11-20T11:00:00'),
    }
  });

  // WO Completada para DEF-456 (mantenimiento 60k)
  const wo_DEF456_60k = await prisma.workOrder.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicles[1].id,
      title: 'Mantenimiento Preventivo 60,000 km',
      description: 'Mantenimiento preventivo según programa Ford Ranger',
      mantType: 'PREVENTIVE',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      technicianId: technicians[1].id,
      creationMileage: 60200,
      isPackageWork: true,
      packageName: 'Mantenimiento 60,000 km',
      requestedBy: manager.id,
      authorizedBy: owner.id,
      estimatedCost: 520000,
      actualCost: 545000,
      startDate: new Date('2024-11-10T08:00:00'),
      endDate: new Date('2024-11-10T12:00:00'),
    }
  });

  // WO Completada para GHI-789 (mantenimiento 15k)
  const wo_GHI789_15k = await prisma.workOrder.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicles[2].id,
      title: 'Mantenimiento Preventivo 15,000 km',
      description: 'Mantenimiento preventivo según programa Chevrolet D-MAX',
      mantType: 'PREVENTIVE',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      technicianId: technicians[0].id,
      providerId: providers[1].id,
      creationMileage: 15100,
      isPackageWork: true,
      packageName: 'Mantenimiento 15,000 km',
      requestedBy: manager.id,
      authorizedBy: owner.id,
      estimatedCost: 440000,
      actualCost: 455000,
      startDate: new Date('2024-09-25T08:00:00'),
      endDate: new Date('2024-09-25T11:00:00'),
    }
  });

  console.log(`✓ Created 3 work orders\n`);

  // WORK ORDER ITEMS
  console.log('Creating work order items...');

  const woItems = await Promise.all([
    // Items para WO ABC-123
    prisma.workOrderItem.create({
      data: {
        workOrderId: wo_ABC123_45k.id,
        mantItemId: globalMantItems[0].id,
        description: 'Aceite Shell Helix HX7 10W-40 x 4.5 litros',
        supplier: 'Lubricantes Shell',
        unitPrice: 45000,
        quantity: 5,
        totalCost: 225000,
        purchasedBy: manager.id,
        invoiceNumber: 'SHELL-2024-1145',
        status: 'COMPLETED',
        executionMileage: 45080,
      }
    }),
    prisma.workOrderItem.create({
      data: {
        workOrderId: wo_ABC123_45k.id,
        mantItemId: globalMantItems[3].id,
        description: 'Filtro Aceite BOSCH 0986AF0134',
        supplier: 'Repuestos Toyota',
        unitPrice: 28000,
        quantity: 1,
        totalCost: 28000,
        purchasedBy: manager.id,
        invoiceNumber: 'RT-2024-0876',
        status: 'COMPLETED',
        executionMileage: 45080,
      }
    }),
    prisma.workOrderItem.create({
      data: {
        workOrderId: wo_ABC123_45k.id,
        mantItemId: globalMantItems[4].id,
        description: 'Filtro Aire BOSCH F026400364',
        supplier: 'Repuestos Toyota',
        unitPrice: 42000,
        quantity: 1,
        totalCost: 42000,
        purchasedBy: manager.id,
        invoiceNumber: 'RT-2024-0876',
        status: 'COMPLETED',
        executionMileage: 45080,
      }
    }),
    // Items para WO DEF-456
    prisma.workOrderItem.create({
      data: {
        workOrderId: wo_DEF456_60k.id,
        mantItemId: globalMantItems[0].id,
        description: 'Aceite Mobil Super 3000 5W-40 x 5 litros',
        supplier: 'Lubricantes Shell',
        unitPrice: 58000,
        quantity: 5,
        totalCost: 290000,
        purchasedBy: manager.id,
        invoiceNumber: 'SHELL-2024-1098',
        status: 'COMPLETED',
        executionMileage: 60200,
      }
    }),
    prisma.workOrderItem.create({
      data: {
        workOrderId: wo_DEF456_60k.id,
        mantItemId: globalMantItems[3].id,
        description: 'Filtro Aceite MANN W920/21',
        supplier: 'Repuestos Toyota',
        unitPrice: 32000,
        quantity: 1,
        totalCost: 32000,
        purchasedBy: manager.id,
        invoiceNumber: 'RT-2024-0912',
        status: 'COMPLETED',
        executionMileage: 60200,
      }
    }),
    prisma.workOrderItem.create({
      data: {
        workOrderId: wo_DEF456_60k.id,
        mantItemId: globalMantItems[5].id,
        description: 'Filtro Combustible BOSCH F026402065',
        supplier: 'Repuestos Toyota',
        unitPrice: 55000,
        quantity: 1,
        totalCost: 55000,
        purchasedBy: manager.id,
        invoiceNumber: 'RT-2024-0912',
        status: 'COMPLETED',
        executionMileage: 60200,
      }
    }),
  ]);

  console.log(`✓ Created ${woItems.length} work order items\n`);

  // INVOICES
  console.log('Creating invoices...');

  const invoice1 = await prisma.invoice.create({
    data: {
      tenantId: TENANT_ID,
      invoiceNumber: 'SHELL-2024-1145',
      invoiceDate: new Date('2024-11-20'),
      dueDate: new Date('2024-12-20'),
      supplierId: providers[1].id, // Lubricantes Shell
      workOrderId: wo_ABC123_45k.id,
      subtotal: 225000,
      taxAmount: 42750,
      totalAmount: 267750,
      currency: 'COP',
      status: 'PAID',
      approvedBy: owner.id,
      approvedAt: new Date('2024-11-21'),
      registeredBy: manager.id,
      notes: 'Pago por transferencia bancaria',
    }
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      tenantId: TENANT_ID,
      invoiceNumber: 'RT-2024-0876',
      invoiceDate: new Date('2024-11-20'),
      dueDate: new Date('2024-12-20'),
      supplierId: providers[0].id, // Repuestos Toyota
      workOrderId: wo_ABC123_45k.id,
      subtotal: 70000,
      taxAmount: 13300,
      totalAmount: 83300,
      currency: 'COP',
      status: 'PAID',
      approvedBy: owner.id,
      approvedAt: new Date('2024-11-21'),
      registeredBy: manager.id,
    }
  });

  const invoice3 = await prisma.invoice.create({
    data: {
      tenantId: TENANT_ID,
      invoiceNumber: 'SHELL-2024-1098',
      invoiceDate: new Date('2024-11-10'),
      dueDate: new Date('2024-12-10'),
      supplierId: providers[1].id,
      workOrderId: wo_DEF456_60k.id,
      subtotal: 290000,
      taxAmount: 55100,
      totalAmount: 345100,
      currency: 'COP',
      status: 'PAID',
      approvedBy: owner.id,
      approvedAt: new Date('2024-11-11'),
      registeredBy: manager.id,
    }
  });

  const invoice4 = await prisma.invoice.create({
    data: {
      tenantId: TENANT_ID,
      invoiceNumber: 'RT-2024-0912',
      invoiceDate: new Date('2024-11-10'),
      dueDate: new Date('2024-12-10'),
      supplierId: providers[0].id,
      workOrderId: wo_DEF456_60k.id,
      subtotal: 87000,
      taxAmount: 16530,
      totalAmount: 103530,
      currency: 'COP',
      status: 'PAID',
      approvedBy: owner.id,
      approvedAt: new Date('2024-11-11'),
      registeredBy: manager.id,
    }
  });

  console.log(`✓ Created 4 invoices\n`);

  // INVOICE ITEMS
  console.log('Creating invoice items...');

  const invoiceItems = await Promise.all([
    // Items invoice1 (Shell - WO ABC-123)
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice1.id,
        masterPartId: masterParts[0].id, // Shell Helix
        workOrderItemId: woItems[0].id,
        description: 'Aceite Shell Helix HX7 10W-40 Semi-Sintético',
        quantity: 5,
        unitPrice: 45000,
        subtotal: 225000,
        taxRate: 19,
        taxAmount: 42750,
        total: 267750,
      }
    }),
    // Items invoice2 (Repuestos Toyota - WO ABC-123)
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice2.id,
        masterPartId: masterParts[3].id, // Filtro aceite BOSCH
        workOrderItemId: woItems[1].id,
        description: 'Filtro Aceite BOSCH 0986AF0134',
        quantity: 1,
        unitPrice: 28000,
        subtotal: 28000,
        taxRate: 19,
        taxAmount: 5320,
        total: 33320,
      }
    }),
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice2.id,
        masterPartId: masterParts[5].id, // Filtro aire BOSCH
        workOrderItemId: woItems[2].id,
        description: 'Filtro Aire BOSCH F026400364',
        quantity: 1,
        unitPrice: 42000,
        subtotal: 42000,
        taxRate: 19,
        taxAmount: 7980,
        total: 49980,
      }
    }),
    // Items invoice3 (Shell - WO DEF-456)
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice3.id,
        masterPartId: masterParts[1].id, // Mobil Super
        workOrderItemId: woItems[3].id,
        description: 'Aceite Mobil Super 3000 5W-40 Sintético',
        quantity: 5,
        unitPrice: 58000,
        subtotal: 290000,
        taxRate: 19,
        taxAmount: 55100,
        total: 345100,
      }
    }),
    // Items invoice4 (Repuestos Toyota - WO DEF-456)
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice4.id,
        masterPartId: masterParts[4].id, // Filtro aceite MANN
        workOrderItemId: woItems[4].id,
        description: 'Filtro Aceite MANN W920/21',
        quantity: 1,
        unitPrice: 32000,
        subtotal: 32000,
        taxRate: 19,
        taxAmount: 6080,
        total: 38080,
      }
    }),
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice4.id,
        masterPartId: masterParts[7].id, // Filtro combustible BOSCH
        workOrderItemId: woItems[5].id,
        description: 'Filtro Combustible BOSCH F026402065',
        quantity: 1,
        unitPrice: 55000,
        subtotal: 55000,
        taxRate: 19,
        taxAmount: 10450,
        total: 65450,
      }
    }),
  ]);

  console.log(`✓ Created ${invoiceItems.length} invoice items\n`);

  // PART PRICE HISTORY
  console.log('Creating part price history...');

  const priceHistory = await Promise.all([
    // Shell Helix - Lubricantes Shell
    prisma.partPriceHistory.create({
      data: {
        tenantId: TENANT_ID,
        masterPartId: masterParts[0].id,
        supplierId: providers[1].id,
        price: 45000,
        quantity: 5,
        recordedAt: new Date('2024-11-20'),
        invoiceId: invoice1.id,
        approvedBy: owner.id,
        purchasedBy: manager.id,
      }
    }),
    // Filtro aceite BOSCH - Repuestos Toyota
    prisma.partPriceHistory.create({
      data: {
        tenantId: TENANT_ID,
        masterPartId: masterParts[3].id,
        supplierId: providers[0].id,
        price: 28000,
        recordedAt: new Date('2024-11-20'),
        invoiceId: invoice2.id,
        approvedBy: owner.id,
        purchasedBy: manager.id,
      }
    }),
    // Mobil Super - Lubricantes Shell
    prisma.partPriceHistory.create({
      data: {
        tenantId: TENANT_ID,
        masterPartId: masterParts[1].id,
        supplierId: providers[1].id,
        price: 58000,
        quantity: 5,
        recordedAt: new Date('2024-11-10'),
        invoiceId: invoice3.id,
        approvedBy: owner.id,
        purchasedBy: manager.id,
      }
    }),
  ]);

  console.log(`✓ Created ${priceHistory.length} price history records\n`);

  console.log('✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log('\n🌍 KNOWLEDGE BASE GLOBAL (tenantId: NULL):');
  console.log(`   - Vehicle Brands: ${globalBrands.length}`);
  console.log(`   - Vehicle Lines: ${globalLines.length}`);
  console.log(`   - Vehicle Types: ${globalTypes.length}`);
  console.log(`   - Maintenance Categories: ${globalCategories.length}`);
  console.log(`   - Maintenance Items: ${globalMantItems.length}`);
  console.log(`   - Maintenance Templates: 3 (Toyota Hilux, Ford Ranger, Chevy D-MAX)`);
  console.log(`   - Template Packages: 7 total`);
  console.log(`   - Master Parts (Catalog): ${masterParts.length}`);

  console.log('\n🏢 TENANT PLATFORM (Fleet Care):');
  console.log(`   - Platform Tenant: 1`);
  console.log(`   - SUPER_ADMIN: 1 (admin@fleetcare.com)`);

  console.log('\n🚛 TENANT CLIENTE (TransLogística del Caribe SAS):');
  console.log(`   - Customer Tenant: 1`);
  console.log(`   - Users: 5 (OWNER, MANAGER, TECHNICIAN, DRIVER x2)`);
  console.log(`   - Vehicles: ${vehicles.length}`);
  console.log(`   - Drivers: ${drivers.length}`);
  console.log(`   - Technicians: ${technicians.length}`);
  console.log(`   - Providers: ${providers.length}`);
  console.log(`   - Vehicle-Driver Assignments: ${vehicleDrivers.length}`);
  console.log(`   - Odometer Logs: ${odometerLogs.length}`);
  console.log(`   - Maintenance Programs: 3`);
  console.log(`   - Program Packages: 8 (3 completed, 2 pending)`);
  console.log(`   - Program Items: ${items_ABC123_50k.length + items_DEF456_65k.length}`);
  console.log(`   - Maintenance Alerts: 1 (MEDIUM)`);
  console.log(`   - Work Orders: 3 (all completed)`);
  console.log(`   - Work Order Items: ${woItems.length}`);
  console.log(`   - Invoices: 4 (all paid)`);
  console.log(`   - Invoice Items: ${invoiceItems.length}`);
  console.log(`   - Price History Records: ${priceHistory.length}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
