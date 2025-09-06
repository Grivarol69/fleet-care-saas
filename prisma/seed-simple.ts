import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Iniciando seed simplificado...')

    // Verificar conexión
    try {
        await prisma.$connect()
        console.log('✅ Conexión a la base de datos exitosa')
    } catch (error) {
        console.error('❌ Error de conexión a la base de datos:', error)
        return
    }

    // 1. TENANT
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
    console.log('✅ Tenant creado')

    // 2. TIPOS DE VEHÍCULOS
    await prisma.vehicleType.createMany({
        data: [
            { tenantId: defaultTenant.id, name: 'Pickup' },
            { tenantId: defaultTenant.id, name: 'Automóvil' },
            { tenantId: defaultTenant.id, name: 'Camioneta' },
        ],
        skipDuplicates: true
    })
    console.log('✅ Tipos de vehículos creados')

    // 3. MARCAS Y LÍNEAS
    const toyota = await prisma.vehicleBrand.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Toyota' } },
        update: {},
        create: { tenantId: defaultTenant.id, name: 'Toyota' }
    })

    const chevrolet = await prisma.vehicleBrand.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Chevrolet' } },
        update: {},
        create: { tenantId: defaultTenant.id, name: 'Chevrolet' }
    })

    const ford = await prisma.vehicleBrand.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Ford' } },
        update: {},
        create: { tenantId: defaultTenant.id, name: 'Ford' }
    })

    // Líneas Toyota
    const hilux = await prisma.vehicleLine.upsert({
        where: { tenantId_brandId_name: { tenantId: defaultTenant.id, brandId: toyota.id, name: 'Hilux' } },
        update: {},
        create: { tenantId: defaultTenant.id, brandId: toyota.id, name: 'Hilux' }
    })

    const corolla = await prisma.vehicleLine.upsert({
        where: { tenantId_brandId_name: { tenantId: defaultTenant.id, brandId: toyota.id, name: 'Corolla' } },
        update: {},
        create: { tenantId: defaultTenant.id, brandId: toyota.id, name: 'Corolla' }
    })

    // Líneas Chevrolet
    const dmax = await prisma.vehicleLine.upsert({
        where: { tenantId_brandId_name: { tenantId: defaultTenant.id, brandId: chevrolet.id, name: 'D-Max' } },
        update: {},
        create: { tenantId: defaultTenant.id, brandId: chevrolet.id, name: 'D-Max' }
    })

    const cruze = await prisma.vehicleLine.upsert({
        where: { tenantId_brandId_name: { tenantId: defaultTenant.id, brandId: chevrolet.id, name: 'Cruze' } },
        update: {},
        create: { tenantId: defaultTenant.id, brandId: chevrolet.id, name: 'Cruze' }
    })

    // Líneas Ford
    const ranger = await prisma.vehicleLine.upsert({
        where: { tenantId_brandId_name: { tenantId: defaultTenant.id, brandId: ford.id, name: 'Ranger' } },
        update: {},
        create: { tenantId: defaultTenant.id, brandId: ford.id, name: 'Ranger' }
    })

    const focus = await prisma.vehicleLine.upsert({
        where: { tenantId_brandId_name: { tenantId: defaultTenant.id, brandId: ford.id, name: 'Focus' } },
        update: {},
        create: { tenantId: defaultTenant.id, brandId: ford.id, name: 'Focus' }
    })

    console.log('✅ Marcas y líneas creadas')

    // 4. CATEGORÍAS
    const motorCategory = await prisma.mantCategory.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Motor' } },
        update: {},
        create: { tenantId: defaultTenant.id, name: 'Motor', description: 'Mantenimiento del sistema motor' }
    })

    const frenosCategory = await prisma.mantCategory.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Frenos' } },
        update: {},
        create: { tenantId: defaultTenant.id, name: 'Frenos', description: 'Sistema de frenado' }
    })

    const filtrosCategory = await prisma.mantCategory.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Filtros' } },
        update: {},
        create: { tenantId: defaultTenant.id, name: 'Filtros', description: 'Filtros del vehículo' }
    })

    console.log('✅ Categorías creadas')

    // 5. ITEMS DE MANTENIMIENTO
    const aceiteItem = await prisma.mantItem.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Cambio de Aceite Motor' } },
        update: {},
        create: {
            tenantId: defaultTenant.id,
            name: 'Cambio de Aceite Motor',
            description: 'Cambio de aceite y filtro de aceite',
            mantType: 'PREVENTIVE',
            estimatedTime: 1.5,
            categoryId: motorCategory.id
        }
    })

    const pastillasItem = await prisma.mantItem.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Cambio de Pastillas de Freno' } },
        update: {},
        create: {
            tenantId: defaultTenant.id,
            name: 'Cambio de Pastillas de Freno',
            description: 'Reemplazo de pastillas de freno',
            mantType: 'PREVENTIVE',
            estimatedTime: 2.5,
            categoryId: frenosCategory.id
        }
    })

    const filtroAireItem = await prisma.mantItem.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Cambio Filtro de Aire' } },
        update: {},
        create: {
            tenantId: defaultTenant.id,
            name: 'Cambio Filtro de Aire',
            description: 'Reemplazo del filtro de aire',
            mantType: 'PREVENTIVE',
            estimatedTime: 0.5,
            categoryId: filtrosCategory.id
        }
    })

    console.log('✅ Items de mantenimiento creados')

    // 6. TÉCNICOS
    const tecnico1 = await prisma.technician.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Carlos Rodríguez' } },
        update: {},
        create: {
            tenantId: defaultTenant.id,
            name: 'Carlos Rodríguez',
            email: 'carlos@email.com',
            phone: '3001234567',
            specialty: 'Motor y Transmisión'
        }
    })

    const tecnico2 = await prisma.technician.upsert({
        where: { tenantId_name: { tenantId: defaultTenant.id, name: 'María González' } },
        update: {},
        create: {
            tenantId: defaultTenant.id,
            name: 'María González',
            email: 'maria@email.com',
            phone: '3007654321',
            specialty: 'Sistema Eléctrico'
        }
    })

    console.log('✅ Técnicos creados')

    // 7. OBTENER TIPOS
    const types = await prisma.vehicleType.findMany({ where: { tenantId: defaultTenant.id } })
    const pickupType = types.find(t => t.name === 'Pickup')
    const autoType = types.find(t => t.name === 'Automóvil')

    // 8. VEHÍCULOS DE MUESTRA
    if (pickupType && autoType) {
        const vehicleData = [
            { licensePlate: 'ABC-123', brand: toyota, line: hilux, type: pickupType, year: 2022, color: 'Blanco', mileage: 15000, photo: '/images/hilux.jpg' },
            { licensePlate: 'DEF-456', brand: chevrolet, line: dmax, type: pickupType, year: 2021, color: 'Gris', mileage: 25000, photo: '/images/chevrolet_dmax.jpg' },
            { licensePlate: 'GHI-789', brand: ford, line: ranger, type: pickupType, year: 2023, color: 'Azul', mileage: 8000, photo: '/images/ford_ranger.jpg' },
            { licensePlate: 'QRS-345', brand: toyota, line: corolla, type: autoType, year: 2023, color: 'Plata', mileage: 4000, photo: '/images/hilux.jpg' },
            { licensePlate: 'TUV-678', brand: chevrolet, line: cruze, type: autoType, year: 2022, color: 'Negro', mileage: 16000, photo: '/images/chevrolet_cyz.jpg' },
            { licensePlate: 'WXY-901', brand: ford, line: focus, type: autoType, year: 2021, color: 'Azul', mileage: 29000, photo: '/images/ford_ranger.jpg' }
        ]

        for (const vData of vehicleData) {
            await prisma.vehicle.upsert({
                where: { tenantId_licensePlate: { tenantId: defaultTenant.id, licensePlate: vData.licensePlate } },
                update: {},
                create: {
                    tenantId: defaultTenant.id,
                    licensePlate: vData.licensePlate,
                    brandId: vData.brand.id,
                    lineId: vData.line.id,
                    typeId: vData.type.id,
                    year: vData.year,
                    color: vData.color,
                    mileage: vData.mileage,
                    photo: vData.photo,
                    status: 'ACTIVE',
                    situation: 'AVAILABLE'
                }
            })
        }
    }

    console.log('✅ Vehículos creados')

    // 9. PLAN DE MANTENIMIENTO
    const planHilux = await prisma.mantPlan.upsert({
        where: { 
            tenantId_vehicleBrandId_vehicleLineId_name: {
                tenantId: defaultTenant.id,
                vehicleBrandId: toyota.id,
                vehicleLineId: hilux.id,
                name: 'Plan Básico Toyota Hilux'
            }
        },
        update: {},
        create: {
            tenantId: defaultTenant.id,
            name: 'Plan Básico Toyota Hilux',
            description: 'Plan básico para Toyota Hilux',
            vehicleBrandId: toyota.id,
            vehicleLineId: hilux.id
        }
    })

    // Agregar tareas al plan
    await prisma.planTask.upsert({
        where: { planId_mantItemId: { planId: planHilux.id, mantItemId: aceiteItem.id } },
        update: {},
        create: { planId: planHilux.id, mantItemId: aceiteItem.id, triggerKm: 5000 }
    })

    await prisma.planTask.upsert({
        where: { planId_mantItemId: { planId: planHilux.id, mantItemId: pastillasItem.id } },
        update: {},
        create: { planId: planHilux.id, mantItemId: pastillasItem.id, triggerKm: 25000 }
    })

    await prisma.planTask.upsert({
        where: { planId_mantItemId: { planId: planHilux.id, mantItemId: filtroAireItem.id } },
        update: {},
        create: { planId: planHilux.id, mantItemId: filtroAireItem.id, triggerKm: 15000 }
    })

    console.log('✅ Plan de mantenimiento creado')

    // 10. ASIGNAR PLAN A VEHÍCULOS
    const vehicles = await prisma.vehicle.findMany({
        where: { tenantId: defaultTenant.id, brandId: toyota.id, lineId: hilux.id }
    })

    for (const vehicle of vehicles) {
        const vehiclePlan = await prisma.vehicleMantPlan.upsert({
            where: { vehicleId_mantPlanId: { vehicleId: vehicle.id, mantPlanId: planHilux.id } },
            update: {},
            create: {
                tenantId: defaultTenant.id,
                vehicleId: vehicle.id,
                mantPlanId: planHilux.id,
                assignedAt: new Date(),
                lastKmCheck: vehicle.mileage
            }
        })

        // Crear items de mantenimiento
        const planTasks = await prisma.planTask.findMany({
            where: { planId: planHilux.id }
        })

        for (const task of planTasks) {
            const currentKm = vehicle.mileage
            const cycles = Math.floor(currentKm / task.triggerKm)
            
            // Crear algunos items con diferentes estados
            for (let cycle = cycles; cycle <= cycles + 2; cycle++) {
                const executionMileage = (cycle + 1) * task.triggerKm
                let status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' = 'PENDING'
                let startDate = null
                let endDate = null
                let technicianId = null
                
                if (executionMileage <= currentKm) {
                    if (Math.random() < 0.7) {
                        status = 'COMPLETED'
                        startDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
                        endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)
                        technicianId = Math.random() > 0.5 ? tecnico1.id : tecnico2.id
                    } else if (Math.random() < 0.9) {
                        status = 'IN_PROGRESS'
                        startDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
                        technicianId = Math.random() > 0.5 ? tecnico1.id : tecnico2.id
                    }
                }

                try {
                    await prisma.vehicleMantPlanItem.create({
                        data: {
                            vehicleMantPlanId: vehiclePlan.id,
                            mantItemId: task.mantItemId,
                            executionMileage,
                            status,
                            startDate,
                            endDate,
                            technicianId,
                            cost: status === 'COMPLETED' ? Math.floor(Math.random() * 300000 + 100000) : null
                        }
                    })
                } catch (error) {
                    // Ignorar duplicados
                }
            }
        }
    }

    console.log('✅ Items de mantenimiento asignados')
    
    console.log('🎉 Seed simplificado completado exitosamente!')
    console.log(`📊 Se crearon datos básicos de demostración`)
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })