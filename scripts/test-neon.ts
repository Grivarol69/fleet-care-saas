import { PrismaClient } from '@prisma/client';

async function testNeon() {
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    console.log('\n🔧 Testeando NEON.TECH...\n');

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

    console.log('4. Listar tablas creadas...');
    const tables: any[] = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    console.log(`✅ ${tables.length} tablas creadas en Neon:`);
    console.log(
      tables
        .slice(0, 15)
        .map((t: any) => `  - ${t.tablename}`)
        .join('\n')
    );

    console.log('\n═══════════════════════════════════════');
    console.log('✅ NEON FUNCIONANDO PERFECTAMENTE');
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

testNeon().then(success => process.exit(success ? 0 : 1));
