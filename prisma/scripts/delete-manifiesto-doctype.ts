import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const manifiesto = await prisma.documentTypeConfig.findFirst({
    where: { code: 'MANIFIESTO', isGlobal: true },
  });

  if (!manifiesto) {
    console.log('MANIFIESTO DocumentTypeConfig no encontrado. Nada que hacer.');
    return;
  }

  // DocumentRequirements already deleted by previous cleanup script.
  // Documents uploaded by tenants referencing this type will cascade-delete
  // only if onDelete: Cascade is set — otherwise we check first.
  const docs = await prisma.document.count({
    where: { documentTypeId: manifiesto.id },
  });
  if (docs > 0) {
    console.log(
      `ADVERTENCIA: ${docs} documento(s) subido(s) referencian MANIFIESTO.`
    );
    console.log('Eliminá esos documentos primero o resolvé la FK manualmente.');
    process.exit(1);
  }

  await prisma.documentTypeConfig.delete({ where: { id: manifiesto.id } });
  console.log(
    `DocumentTypeConfig MANIFIESTO eliminado (id: ${manifiesto.id}).`
  );
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
