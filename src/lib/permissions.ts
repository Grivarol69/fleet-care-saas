import type { User } from '@prisma/client';
import { PLATFORM_TENANT_ID, type UserWithSuperAdmin } from './auth-constants';

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

export function isCoordinator(user: User | null): boolean {
  return user?.role === 'COORDINATOR';
}

// ========================================
// PERMISOS COMPUESTOS (LÓGICA DE NEGOCIO)
// ========================================

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden gestionar tablas maestras de su tenant.
 * SUPER_ADMIN además puede gestionar datos globales (isGlobal=true).
 */
export function canManageMasterData(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, PURCHASER pueden ver costos reales
 * TECHNICIAN, DRIVER NO pueden ver costos
 */
export function canViewCosts(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user) ||
    isPurchaser(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden crear Work Orders
 */
export function canCreateWorkOrders(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user) ||
    isTechnician(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN pueden ejecutar Work Orders
 */
export function canExecuteWorkOrders(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user) ||
    isTechnician(user)
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
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user) ||
    isPurchaser(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden ver dashboard con métricas de costos
 */
export function canViewDashboard(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
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
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN pueden ver alertas
 */
export function canViewAlerts(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user) ||
    isTechnician(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden enviar CV de vehículos
 */
export function canSendVehicleCV(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden crear/editar vehículos
 */
export function canManageVehicles(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
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
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user) ||
    isPurchaser(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden gestionar centros de costos
 */
export function canManageCostCenters(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, PURCHASER pueden gestionar proveedores
 */
export function canManageProviders(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user) ||
    isPurchaser(user)
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
  if (
    !isSuperAdmin(user) &&
    !isOwner(user) &&
    !isManager(user) &&
    !isCoordinator(user)
  ) {
    throw new Error(
      'Acceso denegado: Se requiere rol OWNER, MANAGER o COORDINATOR'
    );
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
      user.role !== 'MANAGER' &&
      user.role !== 'COORDINATOR'
    ) {
      throw new Error('Se requiere rol OWNER, MANAGER o COORDINATOR');
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
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden aprobar/rechazar solicitudes de items.
 */
export function canResolveMantItemRequests(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
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
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
}

// ========================================
// WORK ORDER LIFECYCLE PERMISSIONS
// ========================================

/**
 * OWNER y MANAGER pueden aprobar/rechazar Work Orders.
 * TECHNICIAN NO puede aprobar — solo ejecutar.
 */
export function canApproveWorkOrder(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
}

/**
 * Solo OWNER y SUPER_ADMIN pueden anular el freeze de precios en una OT aprobada.
 */
export function canOverrideWorkOrderFreeze(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user);
}

/**
 * OWNER y MANAGER pueden cerrar Work Orders (mover a COMPLETED).
 * TECHNICIAN puede marcar trabajo terminado pero NO cerrar.
 */
export function canCloseWorkOrder(user: User | null): boolean {
  // El COORDINATOR puede cerrar OTs? Depende de la política.
  // Por ahora lo habilitamos como soporte administrativo.
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user)
  );
}

/**
 * SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN pueden acceder a la vista "Mi Taller".
 * PURCHASER y DRIVER NO tienen acceso.
 */
export function canAccessTaller(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isCoordinator(user) ||
    isTechnician(user)
  );
}

// ========================================
// FUEL VOUCHER PERMISSIONS
// ========================================

export const FUEL_VOUCHER_MANAGE_ROLES = ['OWNER', 'MANAGER'] as const;
export const FUEL_VOUCHER_CREATE_ROLES = [
  'OWNER',
  'MANAGER',
  'PURCHASER',
] as const;
export const FUEL_VOUCHER_VIEW_ROLES = [
  'OWNER',
  'MANAGER',
  'PURCHASER',
] as const;

export function canManageFuelVouchers(role: string): boolean {
  return (FUEL_VOUCHER_MANAGE_ROLES as readonly string[]).includes(role);
}

export function canCreateFuelVouchers(role: string): boolean {
  return (FUEL_VOUCHER_CREATE_ROLES as readonly string[]).includes(role);
}

export function canViewFuelVouchers(role: string): boolean {
  return (FUEL_VOUCHER_VIEW_ROLES as readonly string[]).includes(role);
}

// ========================================
// SERIALIZED ASSET PERMISSIONS
// ========================================

export const SERIALIZED_ASSET_VIEW_ROLES = [
  'OWNER',
  'MANAGER',
  'PURCHASER',
  'TECHNICIAN',
] as const;

export const SERIALIZED_ASSET_CREATE_ROLES = [
  'OWNER',
  'MANAGER',
  'PURCHASER',
] as const;

export const SERIALIZED_ASSET_MANAGE_ROLES = ['OWNER', 'MANAGER'] as const;

export const SERIALIZED_ASSET_OPERATE_ROLES = [
  'OWNER',
  'MANAGER',
  'TECHNICIAN',
] as const;

export function canViewSerializedAssets(role: string): boolean {
  return (SERIALIZED_ASSET_VIEW_ROLES as readonly string[]).includes(role);
}

export function canCreateSerializedAssets(role: string): boolean {
  return (SERIALIZED_ASSET_CREATE_ROLES as readonly string[]).includes(role);
}

export function canManageSerializedAssets(role: string): boolean {
  return (SERIALIZED_ASSET_MANAGE_ROLES as readonly string[]).includes(role);
}

export function canOperateSerializedAssets(role: string): boolean {
  return (SERIALIZED_ASSET_OPERATE_ROLES as readonly string[]).includes(role);
}

// ========================================
// CONSTANTES
// ========================================

export { PLATFORM_TENANT_ID };
