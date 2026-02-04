import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DIRECT_URL must be defined');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  console.log('🌱 Creando datos básicos para testing...');

  // 1. Crear tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'mvp-default-tenant' },
    create: {
      id: 'mvp-default-tenant',
      name: 'Fleet Care MVP',
      slug: 'mvp',
    },
    update: {}
  });
  console.log('✅ Tenant creado:', tenant.name);

  // 2. Crear marcas y líneas
  await prisma.vehicleBrand.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      tenantId: 'mvp-default-tenant',
      name: 'Toyota',
    },
    update: {}
  });

  await prisma.vehicleLine.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      tenantId: 'mvp-default-tenant',
      brandId: 1,
      name: 'Hilux',
    },
    update: {}
  });

  // 3. Crear tipo de vehículo
  await prisma.vehicleType.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      tenantId: 'mvp-default-tenant',
      name: 'Pickup',
    },
    update: {}
  });

  // 4. Crear vehículos de prueba
  await prisma.vehicle.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      tenantId: 'mvp-default-tenant',
      licensePlate: 'ABC-123',
      year: 2023,
      color: 'Blanco',
      mileage: 15000,
      brandId: 1,
      lineId: 1,
      typeId: 1,
      status: 'ACTIVE',
    },
    update: {}
  });

  await prisma.vehicle.upsert({
    where: { id: 2 },
    create: {
      id: 2,
      tenantId: 'mvp-default-tenant',
      licensePlate: 'XYZ-789',
      year: 2022,
      color: 'Rojo',
      mileage: 32000,
      brandId: 1,
      lineId: 1,
      typeId: 1,
      status: 'ACTIVE',
    },
    update: {}
  });

  // 5. Crear categoría de mantenimiento
  await prisma.mantCategory.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      tenantId: 'mvp-default-tenant',
      name: 'Motor',
    },
    update: {}
  });

  // 6. Crear items de mantenimiento
  await prisma.mantItem.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      tenantId: 'mvp-default-tenant',
      name: 'Cambio de aceite',
      description: 'Cambio de aceite motor',
      mantType: 'PREVENTIVE',
      categoryId: 1,
    },
    update: {}
  });

  await prisma.mantItem.upsert({
    where: { id: 2 },
    create: {
      id: 2,
      tenantId: 'mvp-default-tenant',
      name: 'Cambio filtro aire',
      description: 'Reemplazo filtro de aire',
      mantType: 'PREVENTIVE',
      categoryId: 1,
    },
    update: {}
  });

  // 7. Crear template de prueba
  await prisma.maintenanceTemplate.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      tenantId: 'mvp-default-tenant',
      name: 'Toyota Hilux Standard',
      description: 'Template estándar Toyota Hilux',
      vehicleBrandId: 1,
      vehicleLineId: 1,
      version: '1.0',
      isDefault: true,
    },
    update: {}
  });

  // 8. Crear package en template
  await prisma.maintenancePackage.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      templateId: 1,
      name: 'Mantenimiento 15,000 km',
      triggerKm: 15000,
      description: 'Mantenimiento cada 15,000 km',
      estimatedCost: 105.00,
      estimatedTime: 2.0,
      priority: 'MEDIUM',
      packageType: 'PREVENTIVE',
    },
    update: {}
  });

  // 9. Crear items en package
  await prisma.packageItem.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      packageId: 1,
      mantItemId: 1,
      order: 1,
      triggerKm: 15000,
      priority: 'MEDIUM',
      estimatedTime: 1.5,
      status: 'ACTIVE',
    },
    update: {}
  });

  await prisma.packageItem.upsert({
    where: { id: 2 },
    create: {
      id: 2,
      packageId: 1,
      mantItemId: 2,
      order: 2,
      triggerKm: 15000,
      priority: 'MEDIUM',
      estimatedTime: 0.5,
      status: 'ACTIVE',
    },
    update: {}
  });

  console.log('🎉 Datos de prueba creados exitosamente!');
  console.log('📋 Resumen:');
  console.log('  - Tenant: mvp-default-tenant');
  console.log('  - Vehículos: 2 (ABC-123, XYZ-789)');
  console.log('  - Template: Toyota Hilux Standard');
  console.log('  - Package: 15,000 km (2 items)');
}

main()
  .catch((e) => {
    console.error('❌ Error creando datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });