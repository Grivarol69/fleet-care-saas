import { User } from "@prisma/client";

// ========================================
// VALIDADORES DE ROL INDIVIDUAL
// ========================================

export function isSuperAdmin(user: User | null): boolean {
  return user?.role === "SUPER_ADMIN";
}

export function isOwner(user: User | null): boolean {
  return user?.role === "OWNER";
}

export function isManager(user: User | null): boolean {
  return user?.role === "MANAGER";
}

export function isTechnician(user: User | null): boolean {
  return user?.role === "TECHNICIAN";
}

export function isDriver(user: User | null): boolean {
  return user?.role === "DRIVER";
}

// ========================================
// PERMISOS COMPUESTOS (LÓGICA DE NEGOCIO)
// ========================================

/**
 * Solo SUPER_ADMIN puede modificar tablas maestras
 * (Brands, Lines, Types, MantCategories, MantItems)
 */
export function canManageMasterData(user: User | null): boolean {
  return isSuperAdmin(user);
}

/**
 * SUPER_ADMIN, OWNER, MANAGER pueden ver costos reales
 * TECHNICIAN, DRIVER NO pueden ver costos
 */
export function canViewCosts(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
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
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
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
 * SUPER_ADMIN, OWNER, MANAGER pueden aprobar facturas
 */
export function canApproveInvoices(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
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
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isTechnician(user)
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

// ========================================
// VALIDADORES CON EXCEPCIÓN (para APIs)
// ========================================

export function requireSuperAdmin(user: User | null): void {
  if (!isSuperAdmin(user)) {
    throw new Error("Acceso denegado: Se requiere rol SUPER_ADMIN");
  }
}

export function requireManagementRole(user: User | null): void {
  if (!isSuperAdmin(user) && !isOwner(user) && !isManager(user)) {
    throw new Error("Acceso denegado: Se requiere rol OWNER o MANAGER");
  }
}

export function requireAuthenticated(user: User | null): void {
  if (!user) {
    throw new Error("No autenticado");
  }
}

// ========================================
// CONSTANTES
// ========================================

// Definir después de crear tenant super admin en seed
export const SUPER_ADMIN_TENANT_ID = "super-admin-tenant-uuid";
