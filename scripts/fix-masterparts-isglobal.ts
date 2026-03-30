import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.staging', override: true });

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL or DIRECT_URL must be defined');

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

async function main() {
  const result = await prisma.masterPart.updateMany({
    where: { tenantId: null, isGlobal: false },
    data: { isGlobal: true },
  });
  console.log(`✓ ${result.count} MasterParts actualizados → isGlobal: true`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
