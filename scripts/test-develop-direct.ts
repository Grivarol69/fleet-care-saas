import { PrismaClient } from '@prisma/client';

async function test() {
  // Usando DIRECT_URL de .env.local (db.* host)
  const url = "postgresql://postgres:etmcFKSW1984@db.qazrjmkfbjgdjfvfylqx.supabase.co:5432/postgres";

  console.log('\n🔧 Testeando DIRECT CONNECTION (db.* host)...\n');
  console.log('Host: db.qazrjmkfbjgdjfvfylqx.supabase.co:5432\n');

  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['query', 'error', 'warn']
  });

  try {
    console.log('1. Conectando...');
    await prisma.$connect();
    console.log('✅ CONEXIÓN EXITOSA!\n');

    console.log('2. Query simple...');
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Query exitosa:', result);

    console.log('\n3. Contar tenants...');
    const count = await prisma.tenant.count();
    console.log(`✅ ${count} tenants encontrados\n`);

    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown');
    if (error instanceof Error && error.stack) {
      console.error('\nStack:', error.stack);
    }
    await prisma.$disconnect();
    return false;
  }
}

test().then(success => process.exit(success ? 0 : 1));
