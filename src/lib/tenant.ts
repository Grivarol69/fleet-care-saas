import { prisma } from './prisma'
import { Prisma, UserRole } from '@prisma/client'

export interface CreateTenantData {
    name: string
    userId: string
    userEmail: string
    firstName?: string
    lastName?: string
}

export const tenantService = {
    /**
     * Crear tenant automáticamente al registrarse
     */
    async createTenantForUser(data: CreateTenantData) {
        const { name, userId, userEmail, firstName, lastName } = data

        // Generar slug único
        const slug = await this.generateUniqueSlug(name)

        try {
            // Transacción para crear tenant + usuario admin
            const result = await prisma.$transaction(async (tx) => {
                // 1. Crear el tenant
                const tenant = await tx.tenant.create({
                    data: {
                        name: name.trim(),
                        slug: slug,
                        billingEmail: userEmail,
                        // Los demás campos opcionales se pueden completar después
                    }
                })

                // 2. Crear el usuario admin
                const user = await tx.user.create({
                    data: {
                        id: userId,
                        tenantId: tenant.id,
                        email: userEmail,
                        firstName: firstName || null,
                        lastName: lastName || null,
                        role: UserRole.ADMIN, // Primer usuario es admin
                    }
                })

                // 3. Crear datos iniciales del tenant
                await this.createInitialTenantData(tx, tenant.id)

                return { tenant, user }
            })

            return {
                success: true,
                tenant: result.tenant,
                user: result.user,
                slug: slug
            }
        } catch (error) {
            console.error('Error creating tenant:', error)
            return {
                success: false,
                error: 'Error al crear la organización'
            }
        }
    },

    /**
     * Obtener tenant del usuario
     */
    async getUserTenant(userId: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    tenant: true
                }
            })

            if (!user || !user.tenant) {
                return { success: false, error: 'Usuario o tenant no encontrado' }
            }

            return {
                success: true,
                tenant: user.tenant,
                user: user
            }
        } catch (error) {
            console.error('Error getting user tenant:', error)
            return { success: false, error: 'Error al obtener tenant' }
        }
    },

    /**
     * Generar slug único
     */
    async generateUniqueSlug(name: string): Promise<string> {
        // Limpiar nombre para slug
        let baseSlug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, '-')  // Solo letras, números y guiones
            .replace(/-+/g, '-')         // Múltiples guiones → uno solo
            .replace(/^-|-$/g, '')       // Quitar guiones del inicio/final
            .substring(0, 20)            // Máximo 20 caracteres

        if (!baseSlug) {
            baseSlug = 'empresa'
        }

        let slug = baseSlug
        let counter = 1

        // Verificar que el slug sea único
        while (await this.slugExists(slug)) {
            slug = `${baseSlug}-${counter}`
            counter++
        }

        return slug
    },

    /**
     * Verificar si slug existe
     */
    async slugExists(slug: string): Promise<boolean> {
        const existing = await prisma.tenant.findUnique({
            where: { slug: slug }
        })
        return !!existing
    },

    /**
     * Crear datos iniciales del tenant (roles, tipos base, etc.)
     */
    async createInitialTenantData(tx: Prisma.TransactionClient, tenantId: string) {
        // Crear tipos de vehículos básicos
        await tx.vehicleType.createMany({
            data: [
                { tenantId, name: 'Camión' },
                { tenantId, name: 'Camioneta' },
                { tenantId, name: 'Automóvil' },
                { tenantId, name: 'Motocicleta' },
                { tenantId, name: 'Maquinaria Pesada' }
            ]
        })

        // Crear marcas básicas
        const toyotaBrand = await tx.vehicleBrand.create({
            data: { tenantId, name: 'Toyota' }
        })

        const chevroletBrand = await tx.vehicleBrand.create({
            data: { tenantId, name: 'Chevrolet' }
        })

        const fordBrand = await tx.vehicleBrand.create({
            data: { tenantId, name: 'Ford' }
        })

        // Crear líneas básicas
        await tx.vehicleLine.createMany({
            data: [
                // Toyota
                { tenantId, name: 'Hilux', brandId: toyotaBrand.id },
                { tenantId, name: 'Prado', brandId: toyotaBrand.id },
                { tenantId, name: 'Corolla', brandId: toyotaBrand.id },

                // Chevrolet
                { tenantId, name: 'D-Max', brandId: chevroletBrand.id },
                { tenantId, name: 'Captiva', brandId: chevroletBrand.id },
                { tenantId, name: 'Aveo', brandId: chevroletBrand.id },

                // Ford
                { tenantId, name: 'Ranger', brandId: fordBrand.id },
                { tenantId, name: 'Explorer', brandId: fordBrand.id },
                { tenantId, name: 'Fiesta', brandId: fordBrand.id }
            ]
        })

        // Crear técnico por defecto
        await tx.technician.create({
            data: {
                tenantId,
                name: 'Técnico General',
                phone: null,
                email: null,
                specialty: 'GENERAL'
            }
        })
    },

    /**
     * Obtener tenant por slug
     */
    async getTenantBySlug(slug: string) {
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { slug: slug }
            })

            if (!tenant) {
                return { success: false, error: 'Tenant no encontrado' }
            }

            return { success: true, tenant }
        } catch (error) {
            console.error('Error getting tenant by slug:', error)
            return { success: false, error: 'Error al obtener tenant' }
        }
    }
}