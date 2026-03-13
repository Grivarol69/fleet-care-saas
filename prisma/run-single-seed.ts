import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedInternational7400WorkStar } from './seeds/international-7400-workstar';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- Verificando que la categoría Refrigeración exista ---');
    let refCat = await prisma.mantCategory.findFirst({
        where: { name: 'Refrigeracion', isGlobal: true }
    });

    if (!refCat) {
        refCat = await prisma.mantCategory.create({
            data: {
                name: 'Refrigeracion',
                description: 'Sistema de enfriamiento de motor',
                isGlobal: true,
                tenantId: null,
            }
        });
        console.log('Categoría Refrigeración creada con éxito.');
    } else {
        console.log('La categoría Refrigeración ya existe.');
    }

    console.log('\n--- Ejecutando Seed: International 7400 WorkStar ---');
    await seedInternational7400WorkStar(prisma);
    console.log('\n--- Seed completado exitosamente ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
