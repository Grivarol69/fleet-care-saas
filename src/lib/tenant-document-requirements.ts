import { PrismaClient, Prisma } from '@prisma/client';

export async function seedTenantDocumentRequirements(
  prisma: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  countryCode: string
): Promise<{ created: number }> {
  const templates = await prisma.documentRequirement.findMany({
    where: {
      tenantId: null,
      documentType: { isGlobal: true, countryCode, status: 'ACTIVE' },
      vehicleType: { isGlobal: true, status: 'ACTIVE' },
    },
    select: { documentTypeId: true, vehicleTypeId: true },
  });

  if (templates.length === 0) return { created: 0 };

  const result = await prisma.documentRequirement.createMany({
    data: templates.map(t => ({
      tenantId,
      documentTypeId: t.documentTypeId,
      vehicleTypeId: t.vehicleTypeId,
    })),
    skipDuplicates: true,
  });

  return { created: result.count };
}
