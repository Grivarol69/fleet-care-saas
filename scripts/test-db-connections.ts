/**
 * Script de diagnóstico para probar conexiones Prisma-Supabase
 *
 * Uso:
 *   tsx scripts/test-db-connections.ts
 */

import { PrismaClient } from '@prisma/client';

// Colores para consola
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

async function testConnection(
  name: string,
  url: string,
  options: { timeout?: number } = {}
) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testeando: ${name}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
  log(`URL: ${url.replace(/:[^:@]+@/, ':***@')}`, 'blue'); // Ocultar password

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: ['error', 'warn'],
  });

  const results = {
    name,
    connect: false,
    simpleQuery: false,
    complexQuery: false,
    transaction: false,
    preparedStatement: false,
    errors: [] as string[],
  };

  try {
    // Test 1: Conexión básica
    log('\n1. Test conexión básica ($connect)...', 'yellow');
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout conexión')),
          options.timeout || 10000
        )
      ),
    ]);
    results.connect = true;
    log('✅ Conexión establecida', 'green');
  } catch (error) {
    results.errors.push(
      `Connect: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    log(
      `❌ Falló: ${error instanceof Error ? error.message : 'Unknown'}`,
      'red'
    );
  }

  if (!results.connect) {
    await prisma.$disconnect();
    return results;
  }

  try {
    // Test 2: Query simple
    log('\n2. Test query simple (SELECT 1)...', 'yellow');
    await prisma.$queryRaw`SELECT 1 as test`;
    results.simpleQuery = true;
    log('✅ Query simple exitosa', 'green');
  } catch (error) {
    results.errors.push(
      `Simple query: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    log(
      `❌ Falló: ${error instanceof Error ? error.message : 'Unknown'}`,
      'red'
    );
  }

  try {
    // Test 3: Query compleja (contar tenants)
    log('\n3. Test query compleja (COUNT tenants)...', 'yellow');
    const count = await prisma.tenant.count();
    results.complexQuery = true;
    log(`✅ Query compleja exitosa - ${count} tenants encontrados`, 'green');
  } catch (error) {
    results.errors.push(
      `Complex query: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    log(
      `❌ Falló: ${error instanceof Error ? error.message : 'Unknown'}`,
      'red'
    );
  }

  try {
    // Test 4: Transacción
    log('\n4. Test transacción...', 'yellow');
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1`;
      await tx.$queryRaw`SELECT 2`;
    });
    results.transaction = true;
    log('✅ Transacción exitosa', 'green');
  } catch (error) {
    results.errors.push(
      `Transaction: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    log(
      `❌ Falló: ${error instanceof Error ? error.message : 'Unknown'}`,
      'red'
    );
  }

  try {
    // Test 5: Prepared statements (problema común con pgbouncer)
    log('\n5. Test prepared statements...', 'yellow');
    const stmt = prisma.$queryRaw`SELECT $1::int as value`;
    await stmt;
    results.preparedStatement = true;
    log('✅ Prepared statements funcionan', 'green');
  } catch (error) {
    results.errors.push(
      `Prepared stmt: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    log(
      `❌ Falló: ${error instanceof Error ? error.message : 'Unknown'}`,
      'red'
    );
  }

  await prisma.$disconnect();
  return results;
}

async function testMigration(url: string, name: string) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Test migración con: ${name}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');

  const { execSync } = require('child_process');

  try {
    // Crear .env temporal
    const fs = require('fs');
    const envBackup = fs.existsSync('.env')
      ? fs.readFileSync('.env', 'utf8')
      : null;

    fs.writeFileSync('.env.test', `DATABASE_URL="${url}"\nDIRECT_URL="${url}"`);

    log('\n1. Intentando prisma migrate status...', 'yellow');
    const output = execSync(
      'npx prisma migrate status --schema=./prisma/schema.prisma',
      {
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
        stdio: 'pipe',
      }
    );

    log('✅ Comando exitoso', 'green');
    log(`Output:\n${output}`, 'blue');

    // Limpiar
    fs.unlinkSync('.env.test');
    if (envBackup) {
      fs.writeFileSync('.env', envBackup);
    }

    return true;
  } catch (error) {
    log(
      `❌ Falló: ${error instanceof Error ? error.message : 'Unknown'}`,
      'red'
    );
    if (error instanceof Error && 'stderr' in error) {
      log(`Stderr: ${(error as any).stderr}`, 'red');
    }
    return false;
  }
}

async function main() {
  log(
    '\n╔════════════════════════════════════════════════════════════╗',
    'cyan'
  );
  log('║     DIAGNÓSTICO DE CONEXIÓN PRISMA-SUPABASE              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const projectId = 'rvenejfnqodzwpptxppk';
  const password = process.env.DB_PASSWORD || 'etmcFKSW1984';
  const region = 'aws-1-us-east-2';

  // Todas las configuraciones posibles
  const configs = [
    {
      name: 'Pooled (Transaction Mode)',
      url: `postgresql://postgres.${projectId}:${password}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`,
    },
    {
      name: 'Pooled (Session Mode)',
      url: `postgresql://postgres.${projectId}:${password}@${region}.pooler.supabase.com:5432/postgres?pgbouncer=true`,
    },
    {
      name: 'Direct Connection (puerto 5432)',
      url: `postgresql://postgres.${projectId}:${password}@${region}.pooler.supabase.com:5432/postgres`,
    },
    {
      name: 'Direct Connection (db.* host)',
      url: `postgresql://postgres.${projectId}:${password}@db.${projectId}.supabase.co:5432/postgres`,
    },
    {
      name: 'IPv6 Direct',
      url: `postgresql://postgres.${projectId}:${password}@db.${projectId}.supabase.co:6543/postgres`,
    },
  ];

  const results = [];

  for (const config of configs) {
    const result = await testConnection(config.name, config.url, {
      timeout: 15000,
    });
    results.push(result);

    // Pequeña pausa entre tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumen
  log(
    '\n\n╔════════════════════════════════════════════════════════════╗',
    'cyan'
  );
  log('║                    RESUMEN DE RESULTADOS                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  results.forEach(r => {
    log(`\n${r.name}:`, 'yellow');
    log(
      `  Conexión:          ${r.connect ? '✅' : '❌'}`,
      r.connect ? 'green' : 'red'
    );
    log(
      `  Query simple:      ${r.simpleQuery ? '✅' : '❌'}`,
      r.simpleQuery ? 'green' : 'red'
    );
    log(
      `  Query compleja:    ${r.complexQuery ? '✅' : '❌'}`,
      r.complexQuery ? 'green' : 'red'
    );
    log(
      `  Transacciones:     ${r.transaction ? '✅' : '❌'}`,
      r.transaction ? 'green' : 'red'
    );
    log(
      `  Prepared Stmts:    ${r.preparedStatement ? '✅' : '❌'}`,
      r.preparedStatement ? 'green' : 'red'
    );

    if (r.errors.length > 0) {
      log(`  Errores:`, 'red');
      r.errors.forEach(e => log(`    - ${e}`, 'red'));
    }
  });

  // Recomendaciones
  log(
    '\n\n╔════════════════════════════════════════════════════════════╗',
    'cyan'
  );
  log('║                    RECOMENDACIONES                        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const workingConfigs = results.filter(
    r => r.connect && r.simpleQuery && r.complexQuery
  );

  if (workingConfigs.length === 0) {
    log('\n❌ NINGUNA configuración funcionó completamente', 'red');
    log('\nPosibles causas:', 'yellow');
    log('  1. Firewall/red bloqueando puertos 5432/6543', 'yellow');
    log('  2. Credenciales incorrectas', 'yellow');
    log('  3. IP no autorizada en Supabase', 'yellow');
    log('  4. Proyecto pausado/suspendido', 'yellow');
    log('\nAcciones recomendadas:', 'cyan');
    log(
      '  1. Verificar que el proyecto esté activo en Supabase Dashboard',
      'cyan'
    );
    log('  2. Verificar IP allowlist en Settings > Database', 'cyan');
    log('  3. Intentar desde otra red (4G, VPN)', 'cyan');
  } else {
    log(
      `\n✅ ${workingConfigs.length} configuración(es) funcionando:`,
      'green'
    );
    workingConfigs.forEach(c => {
      log(`\n  - ${c.name}`, 'green');
      log(
        `    Usar para migraciones: ${c.transaction ? 'SÍ' : 'NO'}`,
        c.transaction ? 'green' : 'yellow'
      );
      log(
        `    Usar para seed: ${c.preparedStatement ? 'SÍ' : 'NO'}`,
        c.preparedStatement ? 'green' : 'yellow'
      );
    });
  }

  // Test de migraciones
  if (workingConfigs.length > 0) {
    log(
      '\n\n╔════════════════════════════════════════════════════════════╗',
      'cyan'
    );
    log(
      '║              TEST DE MIGRACIONES PRISMA                   ║',
      'cyan'
    );
    log(
      '╚════════════════════════════════════════════════════════════╝',
      'cyan'
    );

    for (const config of workingConfigs) {
      const configData = configs.find(c => c.name === config.name);
      if (configData) {
        await testMigration(configData.url, config.name);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  log('\n\n✅ Diagnóstico completo', 'green');
  log('\nGuardar este output y compartirlo para analizar.', 'yellow');
}

main()
  .catch(e => {
    console.error('Error fatal:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
