import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const manifiesto = await prisma.documentTypeConfig.findFirst({
    where: { code: 'MANIFIESTO', isGlobal: true },
  });

  if (!manifiesto) {
    console.log(
      'No se encontró DocumentTypeConfig con code MANIFIESTO. Nada que limpiar.'
    );
    return;
  }

  const deleted = await prisma.documentRequirement.deleteMany({
    where: { documentTypeId: manifiesto.id },
  });

  console.log(
    `Eliminados ${deleted.count} DocumentRequirement(s) para MANIFIESTO.`
  );
  console.log(
    'El DocumentTypeConfig se conserva (los usuarios pueden seguir cargando manifiestos manualmente).'
  );
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
