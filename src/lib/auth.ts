import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { User } from '@prisma/client';

/**
 * Obtiene el usuario autenticado actual
 *
 * IMPORTANTE: Esta función abstrae la lógica de autenticación.
 * Al migrar a Clerk, solo se modifica esta función, no todas las APIs.
 *
 * @returns User de Prisma con información completa (incluido role y tenantId)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // ========================================
    // VERSIÓN ACTUAL: SUPABASE AUTH
    // ========================================
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser?.email) {
      return null;
    }

    // Obtener User de Prisma (con role y tenantId)
    // Usamos findFirst porque el constraint es (tenantId, email), no solo email
    let user = await prisma.user.findFirst({
      where: { email: authUser.email }
    });

    // ========================================
    // AUTO-CREACIÓN DE USUARIO (MVP)
    // ========================================
    // Si el usuario no existe en nuestra DB, crearlo automáticamente
    // Esto permite que cualquier usuario que se registre en Supabase
    // pueda acceder al sistema inmediatamente
    //
    // NOTA: En producción, esto se reemplazará por:
    // - Webhook de Supabase que crea el usuario con rol específico
    // - O un proceso de onboarding que asigne roles manualmente
    if (!user) {
      console.log(`[AUTO-CREATE] Creando usuario automáticamente: ${authUser.email}`);

      user = await prisma.user.create({
        data: {
          email: authUser.email,
          role: 'MANAGER', // Por defecto MANAGER para demos - ve dashboard, puede gestionar pero NO modifica tablas maestras
          tenantId: 'cf68b103-12fd-4208-a352-42379ef3b6e1', // Tenant hardcoded para MVP
        }
      });

      console.log(`[AUTO-CREATE] Usuario creado exitosamente: ${user.email} con rol ${user.role}`);
    }

    return user;

    // ========================================
    // VERSIÓN FUTURA: CLERK (comentado por ahora)
    // ========================================
    // import { currentUser } from "@clerk/nextjs/server";
    //
    // const clerkUser = await currentUser();
    //
    // if (!clerkUser) {
    //   return null;
    // }
    //
    // const user = await prisma.user.findUnique({
    //   where: {
    //     email: clerkUser.emailAddresses[0].emailAddress
    //   }
    // });
    //
    // return user;

  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Obtiene el usuario autenticado o lanza excepción
 * Útil para APIs que REQUIEREN autenticación
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  return user;
}
