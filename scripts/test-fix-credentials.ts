import { PrismaClient } from '@prisma/client';

async function testURL(name: string, url: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 ${name}`);
  console.log('='.repeat(60));
  console.log(`URL: ${url.replace(/:[^:@]+@/, ':***@')}\n`);

  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error', 'warn'],
  });

  try {
    console.log('1. Conectando...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa!\n');

    console.log('2. Probando query...');
    const count = await prisma.tenant.count();
    console.log(`✅ Query exitosa - ${count} tenants encontrados\n`);

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

async function main() {
  console.log(
    '\n╔════════════════════════════════════════════════════════════╗'
  );
  console.log('║        TEST FIX CREDENCIALES SUPABASE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const password = 'etmcFKSW1984';
  const region = 'aws-1-us-east-2';

  // Test 1: Formato CORRECTO - Usuario simple "postgres"
  const test1 = await testURL(
    'Formato CORRECTO: postgres (sin project ID)',
    `postgresql://postgres:${password}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
  );

  // Test 2: Session Mode
  if (!test1) {
    await testURL(
      'Formato CORRECTO: postgres + Session Mode (puerto 5432)',
      `postgresql://postgres:${password}@${region}.pooler.supabase.com:5432/postgres?pgbouncer=true`
    );
  }

  // Test 3: Sin pooler
  if (!test1) {
    await testURL(
      'Formato CORRECTO: postgres + Sin pooler',
      `postgresql://postgres:${password}@${region}.pooler.supabase.com:5432/postgres`
    );
  }

  console.log(
    '\n╔════════════════════════════════════════════════════════════╗'
  );
  console.log('║                  FIN DEL TEST                             ║');
  console.log(
    '╚════════════════════════════════════════════════════════════╝\n'
  );
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
