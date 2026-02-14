/**
 * Script para crear el tenant MVP por defecto en desarrollo
 * Ejecutar con: node scripts/setup-mvp-tenant.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMVPTenant() {
  console.log('🔍 Verificando si existe tenant mvp-default-tenant...');

  try {
    // Verificar si existe el tenant
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: 'mvp-default-tenant' },
    });

    if (existingTenant) {
      console.log('✅ El tenant mvp-default-tenant ya existe:', {
        id: existingTenant.id,
        name: existingTenant.name,
        slug: existingTenant.slug,
      });
      return existingTenant;
    }

    console.log('📝 Creando tenant mvp-default-tenant...');

    // Crear el tenant MVP
    const tenant = await prisma.tenant.create({
      data: {
        id: 'mvp-default-tenant',
        name: 'Fleet Care MVP',
        slug: 'mvp-default-tenant',
        billingEmail: 'admin@fleetcare.dev',
        subscriptionStatus: 'ACTIVE',
      },
    });

    console.log('🎉 Tenant creado exitosamente!');

    // Crear datos básicos del tenant
    console.log('📋 Creando datos básicos...');
    await createBasicTenantData(tenant.id);

    console.log('✅ Setup completo del tenant MVP!');
    return tenant;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

async function createBasicTenantData(tenantId) {
  // Crear tipos de vehículos básicos
  await prisma.vehicleType.createMany({
    data: [
      { tenantId, name: 'Camión' },
      { tenantId, name: 'Camioneta' },
      { tenantId, name: 'Automóvil' },
      { tenantId, name: 'Motocicleta' },
      { tenantId, name: 'Maquinaria Pesada' },
    ],
    skipDuplicates: true,
  });

  // Crear marcas básicas
  const toyotaBrand = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId, name: 'Toyota' } },
    update: {},
    create: { tenantId, name: 'Toyota' },
  });

  const chevroletBrand = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId, name: 'Chevrolet' } },
    update: {},
    create: { tenantId, name: 'Chevrolet' },
  });

  const fordBrand = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId, name: 'Ford' } },
    update: {},
    create: { tenantId, name: 'Ford' },
  });

  // Crear líneas básicas
  await prisma.vehicleLine.createMany({
    data: [
      // Toyota
      { tenantId, name: 'Hilux', brandId: toyotaBrand.id },
      { tenantId, name: 'Prado', brandId: toyotaBrand.id },
      { tenantId, name: 'Corolla', brandId: toyotaBrand.id },

      // Chevrolet
      { tenantId, name: 'D-Max', brandId: chevroletBrand.id },
      { tenantId, name: 'Captiva', brandId: chevroletBrand.id },
      { tenantId, name: 'Aveo', brandId: chevroletBrand.id },

      // Ford
      { tenantId, name: 'Ranger', brandId: fordBrand.id },
      { tenantId, name: 'Explorer', brandId: fordBrand.id },
      { tenantId, name: 'Fiesta', brandId: fordBrand.id },
    ],
    skipDuplicates: true,
  });

  // Crear categorías de mantenimiento básicas
  const oilCategory = await prisma.mantCategory.upsert({
    where: { tenantId_name: { tenantId, name: 'Aceites y Lubricantes' } },
    update: {},
    create: {
      tenantId,
      name: 'Aceites y Lubricantes',
      description: 'Cambios de aceite y lubricantes',
    },
  });

  const filtersCategory = await prisma.mantCategory.upsert({
    where: { tenantId_name: { tenantId, name: 'Filtros' } },
    update: {},
    create: {
      tenantId,
      name: 'Filtros',
      description: 'Filtros de aire, aceite, combustible',
    },
  });

  const brakesCategory = await prisma.mantCategory.upsert({
    where: { tenantId_name: { tenantId, name: 'Frenos' } },
    update: {},
    create: {
      tenantId,
      name: 'Frenos',
      description: 'Sistema de frenos completo',
    },
  });

  // Crear items de mantenimiento básicos
  await prisma.mantItem.createMany({
    data: [
      // Aceites
      {
        tenantId,
        name: 'Cambio aceite motor',
        categoryId: oilCategory.id,
        mantType: 'PREVENTIVE',
        estimatedCost: 45000,
        estimatedTime: 0.5,
      },
      {
        tenantId,
        name: 'Cambio aceite transmisión',
        categoryId: oilCategory.id,
        mantType: 'PREVENTIVE',
        estimatedCost: 85000,
        estimatedTime: 1.0,
      },

      // Filtros
      {
        tenantId,
        name: 'Cambio filtro aceite',
        categoryId: filtersCategory.id,
        mantType: 'PREVENTIVE',
        estimatedCost: 25000,
        estimatedTime: 0.3,
      },
      {
        tenantId,
        name: 'Cambio filtro aire',
        categoryId: filtersCategory.id,
        mantType: 'PREVENTIVE',
        estimatedCost: 35000,
        estimatedTime: 0.2,
      },
      {
        tenantId,
        name: 'Cambio filtro combustible',
        categoryId: filtersCategory.id,
        mantType: 'PREVENTIVE',
        estimatedCost: 40000,
        estimatedTime: 0.4,
      },

      // Frenos
      {
        tenantId,
        name: 'Cambio pastillas freno',
        categoryId: brakesCategory.id,
        mantType: 'CORRECTIVE',
        estimatedCost: 120000,
        estimatedTime: 2.0,
      },
      {
        tenantId,
        name: 'Revisión sistema frenos',
        categoryId: brakesCategory.id,
        mantType: 'PREVENTIVE',
        estimatedCost: 25000,
        estimatedTime: 0.5,
      },
    ],
    skipDuplicates: true,
  });

  // Crear técnico por defecto
  await prisma.technician.upsert({
    where: { tenantId_name: { tenantId, name: 'Técnico General' } },
    update: {},
    create: {
      tenantId,
      name: 'Técnico General',
      phone: null,
      email: null,
      specialty: 'GENERAL',
    },
  });

  console.log('✅ Datos básicos creados exitosamente');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createMVPTenant()
    .then(() => {
      console.log('🎯 Setup MVP completo!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error en setup:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

module.exports = { createMVPTenant };
