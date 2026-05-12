import { PrismaClient } from '@prisma/client';
import { seedTenantDocumentRequirements } from '../seeds/document-templates';

const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  const prisma = new PrismaClient();
  try {
    const tenants = await prisma.tenant.findMany({
      where: { id: { not: PLATFORM_TENANT_ID } },
      select: { id: true, name: true, country: true },
    });

    console.log(`[BACKFILL] Found ${tenants.length} tenants to process`);

    let totalCreated = 0;
    for (const t of tenants) {
      const country = t.country ?? 'CO';
      const { created } = await seedTenantDocumentRequirements(
        prisma,
        t.id,
        country
      );
      console.log(
        `[BACKFILL] ${t.name} (${t.id}, ${country}): ${created} requirements created`
      );
      totalCreated += created;
    }

    console.log(`[BACKFILL] Done. Total inserted: ${totalCreated}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
