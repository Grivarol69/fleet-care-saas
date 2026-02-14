import { User } from '@prisma/client';
import type { UserWithSuperAdmin } from '@/lib/auth';

// ========================================
// VALIDADORES DE ROL INDIVIDUAL
// ========================================

export function isSuperAdmin(user: User | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}

export function isOwner(user: User | null): boolean {
  return user?.role === 'OWNER';
}

export function isManager(user: User | null): boolean {
  return user?.role === 'MANAGER';
}

export function isTechnician(user: User | null): boolean {
  return user?.role === 'TECHNICIAN';
}

export function isPurchaser(user: User | null): boolean {
  return user?.role === 'PURCHASER';
}

export function isDriver(user: User | null): boolean {
  return user?.role === 'DRIVER';
}

// ========================================
// PERMISOS COMPUESTOS (LÓGICA DE NEGOCIO)
// ========================================

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden gestionar tablas maestras de su tenant.
 * SUPER_ADMIN además puede gestionar datos globales (isGlobal=true).
 */
export function canManageMasterData(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, PURCHASER pueden ver costos reales
 * TECHNICIAN, DRIVER NO pueden ver costos
 */
export function canViewCosts(user: User | null): boolean {
  return (
    isSuperAdmin(user) || isOwner(user) || isManager(user) || isPurchaser(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden crear Work Orders
 */
export function canCreateWorkOrders(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN pueden ejecutar Work Orders
 */
export function canExecuteWorkOrders(user: User | null): boolean {
  return (
    isSuperAdmin(user) || isOwner(user) || isManager(user) || isTechnician(user)
  );
}

/**
 * Solo SUPER_ADMIN y OWNER pueden gestionar usuarios de su tenant
 */
export function canManageUsers(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user);
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, PURCHASER pueden gestionar facturas
 */
export function canApproveInvoices(user: User | null): boolean {
  return (
    isSuperAdmin(user) || isOwner(user) || isManager(user) || isPurchaser(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden ver dashboard con métricas de costos
 */
export function canViewDashboard(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * Todos pueden registrar odómetro
 */
export function canRegisterOdometer(user: User | null): boolean {
  return !!user; // Cualquier usuario autenticado
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden gestionar programas de mantenimiento
 */
export function canManageMaintenancePrograms(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN pueden ver alertas
 */
export function canViewAlerts(user: User | null): boolean {
  return (
    isSuperAdmin(user) || isOwner(user) || isManager(user) || isTechnician(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden enviar CV de vehículos
 */
export function canSendVehicleCV(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden crear/editar vehículos
 */
export function canManageVehicles(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * SUPER_ADMIN y OWNER pueden eliminar vehículos
 */
export function canDeleteVehicles(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user);
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, PURCHASER pueden gestionar compras e inventario
 */
export function canManagePurchases(user: User | null): boolean {
  return (
    isSuperAdmin(user) || isOwner(user) || isManager(user) || isPurchaser(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, PURCHASER pueden gestionar proveedores
 */
export function canManageProviders(user: User | null): boolean {
  return (
    isSuperAdmin(user) || isOwner(user) || isManager(user) || isPurchaser(user)
  );
}

// ========================================
// VALIDADORES CON EXCEPCIÓN (para APIs)
// ========================================

export function requireSuperAdmin(user: User | null): void {
  if (!isSuperAdmin(user)) {
    throw new Error('Acceso denegado: Se requiere rol SUPER_ADMIN');
  }
}

export function requireManagementRole(user: User | null): void {
  if (!isSuperAdmin(user) && !isOwner(user) && !isManager(user)) {
    throw new Error('Acceso denegado: Se requiere rol OWNER o MANAGER');
  }
}

export function requireAuthenticated(user: User | null): void {
  if (!user) {
    throw new Error('No autenticado');
  }
}

/**
 * Valida permisos para editar/eliminar datos maestros.
 * - Items globales (isGlobal=true): solo SUPER_ADMIN (vía isSuperAdmin flag)
 * - Items del tenant (isGlobal=false): OWNER o MANAGER del mismo tenant
 */
export function requireMasterDataMutationPermission(
  user: UserWithSuperAdmin,
  item: { isGlobal: boolean; tenantId: string | null }
): void {
  if (item.isGlobal) {
    if (!user.isSuperAdmin && user.role !== 'SUPER_ADMIN') {
      throw new Error(
        'Solo el administrador de plataforma puede modificar datos globales'
      );
    }
  } else {
    if (item.tenantId !== user.tenantId) {
      throw new Error('Este item pertenece a otro tenant');
    }
    if (
      !user.isSuperAdmin &&
      user.role !== 'OWNER' &&
      user.role !== 'MANAGER'
    ) {
      throw new Error('Se requiere rol OWNER o MANAGER');
    }
  }
}

// ========================================
// MASTER DATA MANAGEMENT PERMISSIONS
// ========================================

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden crear MantItems directamente.
 * TECHNICIAN y PURCHASER deben usar el flujo de solicitud (MantItemRequest).
 */
export function canCreateMantItems(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden aprobar/rechazar solicitudes de items.
 */
export function canResolveMantItemRequests(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

// ========================================
// KNOWLEDGE BASE PERMISSIONS
// ========================================

/**
 * Solo SUPER_ADMIN puede crear/modificar Knowledge Base global
 * (isGlobal = true)
 */
export function canManageGlobalKnowledgeBase(user: User | null): boolean {
  return isSuperAdmin(user);
}

/**
 * Todos los usuarios autenticados pueden VER Knowledge Base global
 * (lectura de datos con isGlobal = true)
 */
export function canViewGlobalKnowledgeBase(user: User | null): boolean {
  return !!user; // Cualquier usuario autenticado
}

/**
 * OWNER y MANAGER pueden crear datos custom en su tenant
 * (isGlobal = false, tenantId = su tenant)
 */
export function canManageTenantData(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

// ========================================
// CONSTANTES
// ========================================

// Re-export de la constante centralizada en auth.ts
export { PLATFORM_TENANT_ID } from '@/lib/auth';
