import { User } from '@prisma/client';

/**
 * Platform Tenant ID para SUPER_ADMIN (ID reservado para gestión global)
 */
export const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Tipo extendido de User que incluye la bandera isSuperAdmin calculada
 */
export type UserWithSuperAdmin = User & {
    isSuperAdmin: boolean;
};
