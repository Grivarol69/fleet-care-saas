import { PrismaClient } from '@prisma/client';

async function testPooler() {
  // Usando CONNECTION POOLER (puerto 6543 que ahora está abierto)
  const poolerUrl =
    'postgresql://postgres.qazrjmkfbjgdjfvfylqx:etmcFKSW1984@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';

  console.log('\n🔧 Testeando CONNECTION POOLER (puerto 6543)...\n');
  console.log('Host: aws-1-us-east-2.pooler.supabase.com:6543\n');

  const prisma = new PrismaClient({
    datasources: { db: { url: poolerUrl } },
    log: ['query', 'error', 'warn'],
  });

  try {
    console.log('1. Conectando...');
    await prisma.$connect();
    console.log('✅ CONEXIÓN EXITOSA!\n');

    console.log('2. Query simple...');
    const result =
      await prisma.$queryRaw`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Query exitosa:', result);

    console.log('\n3. Contar tenants...');
    const count = await prisma.tenant.count();
    console.log(`✅ ${count} tenants encontrados\n`);

    console.log('4. Test transacción...');
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1`;
      await tx.$queryRaw`SELECT 2`;
    });
    console.log('✅ Transacción exitosa\n');

    console.log('═══════════════════════════════════════');
    console.log('✅ TODAS LAS PRUEBAS PASARON');
    console.log('═══════════════════════════════════════\n');

    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error(
      '❌ Error:',
      error instanceof Error ? error.message : 'Unknown'
    );
    await prisma.$disconnect();
    return false;
  }
}

testPooler().then(success => process.exit(success ? 0 : 1));
