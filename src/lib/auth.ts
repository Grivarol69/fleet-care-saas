import { currentUser, auth } from '@clerk/nextjs/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { User, UserRole } from '@prisma/client'

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
 * @returns User de Prisma con información completa (incluido role y tenantId)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // ========================================
    // MODO DUAL: CLERK PRIMERO, SUPABASE FALLBACK
    // ========================================

    // 1. INTENTAR AUTENTICACIÓN CON CLERK
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

      // Si no tiene org, no puede acceder (será redirigido a /onboarding por middleware)
      if (!orgId) {
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
        const role = mapClerkRoleToPrisma(orgRole)

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

      return user
    }

    // 2. FALLBACK: AUTENTICACIÓN CON SUPABASE (Legacy)
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser?.email) {
      return null
    }

    // Obtener User de Prisma
    const user = await prisma.user.findFirst({
      where: { email: authUser.email },
    })

    // Auto-crear usuario si no existe (modo MVP)
    if (!user) {
      // NOTA: En producción esto debería fallar si no hay tenant, pero para MVP legacy
      // podríamos necesitar una estrategia diferente. Por ahora, si no hay tenant, fallamos.
      // Eliminamos el hardcoded tenant ID.
      return null
    }

    return user
  } catch (error) {
    console.error('[AUTH ERROR] Error obteniendo usuario:', error)
    return null
  }
}

/**
 * Obtiene el usuario autenticado o lanza excepción
 * Útil para APIs que REQUIEREN autenticación
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('No autenticado')
  }

  return user
}

/**
 * Obtiene el tenantId del usuario actual
 * Útil para queries que necesitan filtrar por tenant
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.tenantId || null
}
