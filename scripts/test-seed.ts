/**
 * Script de test para validar que el seed funciona con diferentes conexiones
 *
 * Uso:
 *   DATABASE_URL="..." DIRECT_URL="..." tsx scripts/test-seed.ts
 */

import { PrismaClient } from '@prisma/client';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testSeedOperations() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║            TEST DE OPERACIONES TIPO SEED                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  const testTenantId = `test-${Date.now()}`;
  let success = true;

  try {
    // Test 1: Conexión básica
    log('\n1. Conectando a DB...', 'yellow');
    await prisma.$connect();
    log('✅ Conexión establecida', 'green');

    // Test 2: Query simple
    log('\n2. Query simple (SELECT)...', 'yellow');
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    log(`✅ Query exitosa: ${JSON.stringify(result)}`, 'green');

    // Test 3: Crear registro (similar a seed)
    log('\n3. Crear tenant de prueba...', 'yellow');
    const tenant = await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: 'Test Tenant',
        slug: `test-${Date.now()}`,
        subscriptionStatus: 'TRIAL',
      },
    });
    log(`✅ Tenant creado: ${tenant.id}`, 'green');

    // Test 4: Transacción compleja (similar a seeds reales)
    log('\n4. Transacción compleja (múltiples inserts)...', 'yellow');
    await prisma.$transaction(async (tx) => {
      // Crear VehicleBrand
      const brand = await tx.vehicleBrand.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Brand',
        },
      });

      // Crear VehicleType
      await tx.vehicleType.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Type',
        },
      });

      // Crear VehicleLine
      await tx.vehicleLine.create({
        data: {
          tenantId: testTenantId,
          brandId: brand.id,
          name: 'Test Line',
        },
      });

      log('  - Brand creado', 'blue');
      log('  - Type creado', 'blue');
      log('  - Line creada', 'blue');
    });
    log('✅ Transacción exitosa', 'green');

    // Test 5: Batch insert (upsert múltiples)
    log('\n5. Batch upsert (como seed de MantCategories)...', 'yellow');
    const categories = ['Test Cat 1', 'Test Cat 2', 'Test Cat 3'];

    for (const cat of categories) {
      await prisma.mantCategory.upsert({
        where: {
          tenantId_name: {
            tenantId: testTenantId,
            name: cat,
          },
        },
        update: {},
        create: {
          tenantId: testTenantId,
          name: cat,
          description: `Test category ${cat}`,
        },
      });
    }
    log(`✅ ${categories.length} categorías upsert exitoso`, 'green');

    // Test 6: Query con relaciones (read complejo)
    log('\n6. Query con includes (relaciones)...', 'yellow');
    const tenantWithRelations = await prisma.tenant.findUnique({
      where: { id: testTenantId },
      include: {
        vehicleBrands: true,
        vehicleTypes: true,
        vehicleLines: true,
        mantCategories: true,
      },
    });

    if (!tenantWithRelations) {
      throw new Error('Tenant no encontrado');
    }

    log(`✅ Tenant con relaciones:`, 'green');
    log(`  - Brands: ${tenantWithRelations.vehicleBrands.length}`, 'blue');
    log(`  - Types: ${tenantWithRelations.vehicleTypes.length}`, 'blue');
    log(`  - Lines: ${tenantWithRelations.vehicleLines.length}`, 'blue');
    log(`  - Categories: ${tenantWithRelations.mantCategories.length}`, 'blue');

    // Test 7: Delete cascade (cleanup)
    log('\n7. Limpieza (delete cascade)...', 'yellow');
    await prisma.tenant.delete({
      where: { id: testTenantId },
    });
    log('✅ Cleanup exitoso (cascade delete funcionó)', 'green');
  } catch (error) {
    success = false;
    log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown'}`, 'red');

    if (error instanceof Error && error.stack) {
      log(`\nStack trace:`, 'red');
      log(error.stack, 'red');
    }

    // Intentar limpiar
    try {
      log('\nIntentando limpiar tenant de prueba...', 'yellow');
      await prisma.tenant.deleteMany({
        where: {
          id: {
            startsWith: 'test-',
          },
        },
      });
      log('✅ Cleanup exitoso', 'green');
    } catch (cleanupError) {
      log('❌ Cleanup falló (no crítico)', 'yellow');
    }
  } finally {
    await prisma.$disconnect();
  }

  // Resumen
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                        RESUMEN                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  if (success) {
    log('\n✅ TODAS las operaciones tipo seed funcionaron correctamente', 'green');
    log('\nEsta configuración es APTA para seeds.', 'green');
    return 0;
  } else {
    log('\n❌ Algunas operaciones fallaron', 'red');
    log('\nEsta configuración NO es apta para seeds.', 'red');
    log('Prueba con otra configuración de URLs.', 'yellow');
    return 1;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  if (!databaseUrl || !directUrl) {
    log('❌ ERROR: Variables DATABASE_URL y DIRECT_URL son requeridas', 'red');
    log('\nUso:', 'yellow');
    log('  DATABASE_URL="..." DIRECT_URL="..." tsx scripts/test-seed.ts', 'cyan');
    process.exit(1);
  }

  log('\nUsando configuración:', 'blue');
  log(`DATABASE_URL: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`, 'blue');
  log(`DIRECT_URL: ${directUrl.replace(/:[^:@]+@/, ':***@')}`, 'blue');

  const exitCode = await testSeedOperations();
  process.exit(exitCode);
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
