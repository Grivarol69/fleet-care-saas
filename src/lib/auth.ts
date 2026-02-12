import { currentUser, auth } from '@clerk/nextjs/server'

import { prisma } from '@/lib/prisma'
import { User } from '@prisma/client'

// Platform Tenant ID para SUPER_ADMIN (único lugar de definición)
export const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000'

// Tipo extendido de User que incluye info de SUPER_ADMIN
export type UserWithSuperAdmin = User & {
  isSuperAdmin: boolean
}

/**
 * Obtiene el usuario autenticado actual
 *
 * IMPORTANTE: Esta función abstrae la lógica de autenticación vía Clerk.
 *
 * SUPER_ADMIN: Si el email existe en el Platform Tenant con rol SUPER_ADMIN,
 * el usuario tendrá isSuperAdmin = true aunque opere en otro tenant.
 *
 * @returns User de Prisma con información completa (incluido role, tenantId, isSuperAdmin)
 */
export async function getCurrentUser(): Promise<UserWithSuperAdmin | null> {
  try {
    const { userId, orgId } = await auth()

    if (userId) {
      // Obtener info completa del usuario de Clerk (solo para email si es necesario)
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
      const superAdminUser = await prisma.user.findFirst({
        where: {
          email,
          tenantId: PLATFORM_TENANT_ID,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      })
      const isSuperAdmin = !!superAdminUser

      // Si no tiene org pero es SUPER_ADMIN, retornar usuario del Platform Tenant
      if (!orgId) {
        if (isSuperAdmin && superAdminUser) {
          return {
            ...superAdminUser,
            isSuperAdmin: true,
          }
        }
        return null
      }

      // ========================================
      // AUTH STANDARD (WEBHOOK SYNC DEPENDENCY)
      // ========================================

      // Buscar usuario en Prisma por email + tenantId.
      // Con Webhooks, confiamos en que Clerk ya sincronizó los datos.
      let user = await prisma.user.findFirst({
        where: {
          email,
          tenantId: orgId,
          isActive: true,
        },
      })

      // Fallback JIT: si el usuario no existe, el webhook puede estar en tránsito.
      // Esperamos brevemente y reintentamos una vez antes de rendirse.
      if (!user) {
        console.warn(`[AUTH] User ${email} not found in DB for tenant ${orgId}. Retrying in 1.5s (webhook latency)...`)
        await new Promise((resolve) => setTimeout(resolve, 1500))
        user = await prisma.user.findFirst({
          where: {
            email,
            tenantId: orgId,
            isActive: true,
          },
        })
      }

      if (!user) {
        console.warn(`[AUTH] User ${email} still not found after retry for tenant ${orgId}. Webhook may have failed.`)
        return null
      }

      // Retornar usuario
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
