import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Iniciando seed de la base de datos...')

    const defaultTenant = await prisma.tenant.upsert({
        where: { slug: 'mvp-default' },
        update: {},
        create: {
            id: 'mvp-default-tenant',
            name: 'Fleet Care MVP',
            slug: 'mvp-default',
            billingEmail: 'admin@fleetcare.com',
            subscriptionStatus: 'TRIAL',
        }
    })

    console.log('Tenant por defecto creado:', defaultTenant.name)

    const vehicleTypes = await prisma.vehicleType.createMany({
        data: [
            { tenantId: defaultTenant.id, name: 'Camion' },
            { tenantId: defaultTenant.id, name: 'Camioneta' },
            { tenantId: defaultTenant.id, name: 'Automovil' },
            { tenantId: defaultTenant.id, name: 'Motocicleta' },
            { tenantId: defaultTenant.id, name: 'Maquinaria Pesada' }
        ],
        skipDuplicates: true
    })

    console.log('Tipos de vehiculos creados')

    const brands = await prisma.vehicleBrand.createMany({
        data: [
            { tenantId: defaultTenant.id, name: 'Toyota' },
            { tenantId: defaultTenant.id, name: 'Chevrolet' },
            { tenantId: defaultTenant.id, name: 'Ford' },
            { tenantId: defaultTenant.id, name: 'Nissan' },
            { tenantId: defaultTenant.id, name: 'Mazda' }
        ],
        skipDuplicates: true
    })

    console.log('Marcas basicas creadas')

    console.log('Seed completado exitosamente')
}

main()
    .catch((e) => {
        console.error('Error en seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })