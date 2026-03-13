import { currentUser, auth, clerkClient } from '@clerk/nextjs/server';

import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { UserRole } from '@prisma/client';
import { PLATFORM_TENANT_ID, UserWithSuperAdmin } from './auth-constants';

export { PLATFORM_TENANT_ID };
export type { UserWithSuperAdmin };

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
    // Timeout de 15s para evitar que la página se cuelgue si Neon tiene cold start
    const result = await Promise.race([
      getCurrentUserInternal(),
      new Promise<null>((_, reject) => {
        setTimeout(() => {
          console.error(
            '[AUTH] getCurrentUser() timeout after 15s - possible DB cold start'
          );
          reject(new Error('DATABASE_TIMEOUT'));
        }, 15000);
      }),
    ]);
    return result;
  } catch (error: any) {
    if (error.message === 'DATABASE_TIMEOUT') {
      throw error;
    }
    console.error('[AUTH ERROR] Error obteniendo usuario:', error);
    return null;
  }
}

async function getCurrentUserInternal(): Promise<UserWithSuperAdmin | null> {
  try {
    const { userId, orgId } = await auth();

    if (userId) {
      // Obtener info completa del usuario de Clerk (solo para email si es necesario)
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return null;
      }

      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        return null;
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
      });
      const isSuperAdmin = !!superAdminUser;

      // Si no tiene org pero es SUPER_ADMIN, retornar usuario del Platform Tenant
      if (!orgId) {
        if (isSuperAdmin && superAdminUser) {
          return {
            ...superAdminUser,
            isSuperAdmin: true,
          };
        }
        return null;
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
      });

      // Fallback JIT: si el usuario no existe, el webhook puede estar en tránsito o falló.
      // Lo creamos de manera proactiva utilizando los datos de session de Clerk.
      if (!user) {
        console.warn(
          `[AUTH] User ${email} not found in DB for tenant ${orgId}. Webhook delayed/failed. Creating JIT...`
        );

        const firstName = clerkUser.firstName || 'User';
        const lastName = clerkUser.lastName || '';

        // Resolve org membership via Clerk Backend API.
        // currentUser() does NOT include organizationMemberships — we must call the API.
        let jitOrgName: string | undefined;
        let dbRole: UserRole = 'OWNER'; // safest fallback for the first user of a new org

        try {
          const client = await clerkClient();
          const memberships = await client.organizations.getOrganizationMembershipList({
            organizationId: orgId,
          });
          const membership = memberships.data.find(
            (m) => m.publicUserData?.identifier === email
          );
          if (membership) {
            jitOrgName = membership.organization.name;
            const roleName = membership.role.replace('org:', '');
            const jitRoleMapping: Record<string, UserRole> = {
              admin: 'OWNER',
              manager: 'MANAGER',
              technician: 'TECHNICIAN',
              purchaser: 'PURCHASER',
              driver: 'DRIVER',
            };
            dbRole = jitRoleMapping[roleName] ?? 'DRIVER';
          }
        } catch (clerkApiErr) {
          console.error('[AUTH] Failed to fetch org membership from Clerk API, defaulting to OWNER:', clerkApiErr);
        }

        // Validar que el Tenant también exista antes de crear el usuario
        let tenant = await prisma.tenant.findUnique({ where: { id: orgId } });

        if (!tenant) {
          console.warn(`[AUTH] Tenant ${orgId} not found in DB. Webhook delayed/failed. Creating JIT...`);
          tenant = await prisma.tenant.create({
            data: {
              id: orgId,
              name: jitOrgName ?? 'Empresa (Auto-creada)',
              slug: orgId.toLowerCase(),
              onboardingStatus: 'PENDING',
            }
          });
        }

        user = await prisma.user.create({
          data: {
            id: clerkUser.id, // Reusamos el ID de clerk si queremos compatibilidad total
            email,
            firstName,
            lastName,
            tenantId: orgId,
            role: dbRole,
            isActive: true,
          }
        });
        console.log(`[AUTH] JIT User created successfully:`, user.id);
      }

      // Retornar usuario
      return {
        ...user,
        isSuperAdmin,
      };
    }

    return null;
  } catch (error) {
    console.error('[AUTH ERROR] Error obteniendo usuario:', error);
    return null;
  }
}

/**
 * Obtiene el usuario autenticado o lanza excepción
 * Útil para APIs que REQUIEREN autenticación
 */
export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, tenantPrisma: prisma as any };
  }

  // Si es SUPER_ADMIN (operando globalmente en Platform Tenant) usa el prisma base
  // De lo contrario usa el prisma con extensión de asilamiento por tenant
  const tenantPrisma = (user.isSuperAdmin
    ? prisma
    : getTenantPrisma(user.tenantId)) as ReturnType<typeof getTenantPrisma>;

  return { user, tenantPrisma };
}

/**
 * Verifica si el usuario actual es SUPER_ADMIN
 * Útil para verificaciones rápidas de permisos
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.isSuperAdmin ?? false;
}

/**
 * Obtiene el tenantId del usuario actual
 * Útil para queries que necesitan filtrar por tenant
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.tenantId || null;
}
