import { currentUser, auth } from '@clerk/nextjs/server'

import { prisma } from '@/lib/prisma'
import { User, UserRole } from '@prisma/client'

// Platform Tenant ID para SUPER_ADMIN
const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000'

// Tipo extendido de User que incluye info de SUPER_ADMIN
export type UserWithSuperAdmin = User & {
  isSuperAdmin: boolean
}

/**
 * Mapea roles de Clerk a roles de Prisma
 */
function mapClerkRoleToPrisma(clerkRole: string | undefined | null): UserRole {
  // Clerk devuelve roles con prefijo "org:" (ej: "org:admin")
  // Necesitamos limpiar el prefijo
  const role = clerkRole?.replace('org:', '') || ''

  switch (role) {
    case 'admin':
      return 'OWNER'
    case 'manager':
      return 'MANAGER'
    case 'technician':
      return 'TECHNICIAN'
    case 'purchaser':
      return 'PURCHASER'
    case 'driver':
      return 'DRIVER'
    default:
      return 'MANAGER' // Default seguro
  }
}

/**
 * Obtiene el usuario autenticado actual
 *
 * IMPORTANTE: Esta función abstrae la lógica de autenticación.
 * Soporta DUAL MODE: Clerk (prioritario) + Supabase (fallback)
 *
 * SUPER_ADMIN: Si el email existe en el Platform Tenant con rol SUPER_ADMIN,
 * el usuario tendrá isSuperAdmin = true aunque opere en otro tenant.
 *
 * @returns User de Prisma con información completa (incluido role, tenantId, isSuperAdmin)
 */
export async function getCurrentUser(): Promise<UserWithSuperAdmin | null> {
  try {
    // ========================================
    // CLERK AUTHENTICATION
    // ========================================

    // Usamos auth() para obtener orgId y orgRole directamente
    const { userId, orgId, orgRole } = await auth()

    if (userId) {
      // Obtener info completa del usuario
      const clerkUser = await currentUser()
      if (!clerkUser) {
        return null
      }

      const email = clerkUser.emailAddresses[0]?.emailAddress
      if (!email) {
        return null
      }

      // ========================================
      // VERIFICAR SI ES SUPER_ADMIN
      // ========================================
      // Buscar si el email existe en el Platform Tenant con rol SUPER_ADMIN
      const superAdminUser = await prisma.user.findFirst({
        where: {
          email,
          tenantId: PLATFORM_TENANT_ID,
          role: 'SUPER_ADMIN',
        },
      })
      const isSuperAdmin = !!superAdminUser

      // Si no tiene org pero es SUPER_ADMIN, retornar usuario del Platform Tenant
      // Esto permite acceso a /admin sin necesidad de organización en Clerk
      if (!orgId) {
        if (isSuperAdmin && superAdminUser) {
          return {
            ...superAdminUser,
            isSuperAdmin: true,
          }
        }
        // No es SUPER_ADMIN y no tiene org - no puede acceder
        return null
      }

      // Asegurar que el Tenant existe
      let tenant = await prisma.tenant.findUnique({
        where: { id: orgId },
      })

      if (!tenant) {
        // Obtener nombre de la organización desde Clerk
        // Definimos una interfaz mínima para lo que necesitamos de Clerk
        interface ClerkOrgMembership {
          organization: {
            id: string;
            name: string;
          };
        }

        // Usamos unknown primero para evitar el error de linter, luego cast a nuestra interfaz
        const clerkUserUnknown = clerkUser as unknown;
        const memberships = (clerkUserUnknown as { organizationMemberships: ClerkOrgMembership[] }).organizationMemberships;

        const orgName = memberships?.find((m) => m.organization.id === orgId)?.organization?.name || 'Mi Organización'

        tenant = await prisma.tenant.create({
          data: {
            id: orgId,
            name: orgName,
            slug: orgId.toLowerCase(),
            domain: `${orgId}.localhost`, // Domain temporal
            subscriptionStatus: 'ACTIVE',
          },
        })
      }

      // Buscar usuario en Prisma por email + tenantId
      let user = await prisma.user.findFirst({
        where: {
          email,
          tenantId: orgId,
        },
      })

      // Auto-crear usuario si no existe
      if (!user) {
        const firstName = clerkUser.firstName || null
        const lastName = clerkUser.lastName || null
        // Si es SUPER_ADMIN, asignar rol OWNER en el tenant cliente también
        const role = isSuperAdmin ? 'OWNER' : mapClerkRoleToPrisma(orgRole)

        user = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            role,
            tenantId: orgId,
          },
        })
      }

      // Retornar usuario con flag de SUPER_ADMIN
      return {
        ...user,
        isSuperAdmin,
      }
    }

    return null
  } catch (error) {
    console.error('[AUTH ERROR] Error obteniendo usuario:', error)
    return null
  }
}

/**
 * Obtiene el usuario autenticado o lanza excepción
 * Útil para APIs que REQUIEREN autenticación
 */
export async function requireCurrentUser(): Promise<UserWithSuperAdmin> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('No autenticado')
  }

  return user
}

/**
 * Verifica si el usuario actual es SUPER_ADMIN
 * Útil para verificaciones rápidas de permisos
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.isSuperAdmin ?? false
}

/**
 * Obtiene el tenantId del usuario actual
 * Útil para queries que necesitan filtrar por tenant
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.tenantId || null
}
