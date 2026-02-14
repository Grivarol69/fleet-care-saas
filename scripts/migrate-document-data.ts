/**
 * Script para migrar datos existentes de Document
 * Copia fileName → documentNumber para mantener los números de documento existentes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateDocumentData() {
  try {
    console.log('🔄 Iniciando migración de datos de Document...\n');

    // 1. Contar documentos existentes
    const totalDocuments = await prisma.document.count();
    console.log(`📊 Total de documentos: ${totalDocuments}`);

    if (totalDocuments === 0) {
      console.log('✅ No hay documentos para migrar.\n');
      return;
    }

    // 2. Obtener documentos que tienen fileName pero no documentNumber
    const documentsToMigrate = await prisma.document.findMany({
      where: {
        documentNumber: null,
      },
      select: {
        id: true,
        fileName: true,
        documentTypeId: true,
      },
    });

    console.log(`📋 Documentos a migrar: ${documentsToMigrate.length}\n`);

    if (documentsToMigrate.length === 0) {
      console.log('✅ Todos los documentos ya tienen documentNumber.\n');
      return;
    }

    // 3. Migrar datos: fileName → documentNumber
    let migrated = 0;
    for (const doc of documentsToMigrate) {
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          documentNumber: doc.fileName, // Copiar fileName a documentNumber
        },
      });
      migrated++;

      if (migrated % 10 === 0) {
        console.log(
          `   ✓ Migrados ${migrated}/${documentsToMigrate.length} documentos...`
        );
      }
    }

    console.log(`\n✅ Migración completada exitosamente!`);
    console.log(`   📊 Total migrados: ${migrated} documentos\n`);

    // 4. Verificación
    const afterMigration = await prisma.document.count({
      where: {
        documentNumber: null,
      },
    });

    console.log(`🔍 Verificación:`);
    console.log(`   - Documentos sin documentNumber: ${afterMigration}`);
    console.log(
      `   - Documentos con documentNumber: ${totalDocuments - afterMigration}\n`
    );
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateDocumentData()
  .then(() => {
    console.log('✨ Script completado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
