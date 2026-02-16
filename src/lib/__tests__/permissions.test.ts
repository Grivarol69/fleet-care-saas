import { describe, it, expect } from 'vitest';
import { User } from '@prisma/client';
import {
  isSuperAdmin,
  isOwner,
  isManager,
  isTechnician,
  isPurchaser,
  isDriver,
  canManageMasterData,
  canViewCosts,
  canCreateWorkOrders,
  canExecuteWorkOrders,
  canManageUsers,
  canApproveInvoices,
  canViewDashboard,
  canRegisterOdometer,
  canManageMaintenancePrograms,
  canViewAlerts,
  canManageVehicles,
  canDeleteVehicles,
  canManagePurchases,
  canManageProviders,
  canCreateMantItems,
  canResolveMantItemRequests,
  canManageGlobalKnowledgeBase,
  canViewGlobalKnowledgeBase,
  canManageTenantData,
  requireAuthenticated,
  requireManagementRole,
  requireMasterDataMutationPermission,
} from '@/lib/permissions';
import type { UserWithSuperAdmin } from '@/lib/auth';

// Helper to create a mock user with a given role
function mockUser(role: string, tenantId = 'tenant-1'): User {
  return {
    id: 'user-1',
    tenantId,
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: role as User['role'],
    avatar: null,
    phone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mockUserWithSuperAdmin(
  role: string,
  isSuperAdminFlag: boolean,
  tenantId = 'tenant-1'
): UserWithSuperAdmin {
  return {
    ...mockUser(role, tenantId),
    isSuperAdmin: isSuperAdminFlag,
  };
}

const ALL_ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN', 'PURCHASER', 'DRIVER'] as const;

// ========================================
// INDIVIDUAL ROLE VALIDATORS
// ========================================

describe('Individual Role Validators', () => {
  it('isSuperAdmin returns true only for SUPER_ADMIN', () => {
    expect(isSuperAdmin(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(isSuperAdmin(mockUser('OWNER'))).toBe(false);
    expect(isSuperAdmin(mockUser('MANAGER'))).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
  });

  it('isOwner returns true only for OWNER', () => {
    expect(isOwner(mockUser('OWNER'))).toBe(true);
    expect(isOwner(mockUser('MANAGER'))).toBe(false);
    expect(isOwner(null)).toBe(false);
  });

  it('isManager returns true only for MANAGER', () => {
    expect(isManager(mockUser('MANAGER'))).toBe(true);
    expect(isManager(mockUser('OWNER'))).toBe(false);
    expect(isManager(null)).toBe(false);
  });

  it('isTechnician returns true only for TECHNICIAN', () => {
    expect(isTechnician(mockUser('TECHNICIAN'))).toBe(true);
    expect(isTechnician(mockUser('DRIVER'))).toBe(false);
    expect(isTechnician(null)).toBe(false);
  });

  it('isPurchaser returns true only for PURCHASER', () => {
    expect(isPurchaser(mockUser('PURCHASER'))).toBe(true);
    expect(isPurchaser(mockUser('TECHNICIAN'))).toBe(false);
    expect(isPurchaser(null)).toBe(false);
  });

  it('isDriver returns true only for DRIVER', () => {
    expect(isDriver(mockUser('DRIVER'))).toBe(true);
    expect(isDriver(mockUser('OWNER'))).toBe(false);
    expect(isDriver(null)).toBe(false);
  });
});

// ========================================
// COMPOSITE PERMISSIONS
// ========================================

describe('canManageMasterData', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER', () => {
    expect(canManageMasterData(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canManageMasterData(mockUser('OWNER'))).toBe(true);
    expect(canManageMasterData(mockUser('MANAGER'))).toBe(true);
  });

  it('denies TECHNICIAN, PURCHASER, DRIVER', () => {
    expect(canManageMasterData(mockUser('TECHNICIAN'))).toBe(false);
    expect(canManageMasterData(mockUser('PURCHASER'))).toBe(false);
    expect(canManageMasterData(mockUser('DRIVER'))).toBe(false);
  });

  it('denies null user', () => {
    expect(canManageMasterData(null)).toBe(false);
  });
});

describe('canViewCosts', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER, PURCHASER', () => {
    expect(canViewCosts(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canViewCosts(mockUser('OWNER'))).toBe(true);
    expect(canViewCosts(mockUser('MANAGER'))).toBe(true);
    expect(canViewCosts(mockUser('PURCHASER'))).toBe(true);
  });

  it('denies TECHNICIAN, DRIVER', () => {
    expect(canViewCosts(mockUser('TECHNICIAN'))).toBe(false);
    expect(canViewCosts(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canCreateWorkOrders', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER', () => {
    expect(canCreateWorkOrders(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canCreateWorkOrders(mockUser('OWNER'))).toBe(true);
    expect(canCreateWorkOrders(mockUser('MANAGER'))).toBe(true);
  });

  it('denies TECHNICIAN, PURCHASER, DRIVER', () => {
    expect(canCreateWorkOrders(mockUser('TECHNICIAN'))).toBe(false);
    expect(canCreateWorkOrders(mockUser('PURCHASER'))).toBe(false);
    expect(canCreateWorkOrders(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canExecuteWorkOrders', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN', () => {
    expect(canExecuteWorkOrders(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canExecuteWorkOrders(mockUser('OWNER'))).toBe(true);
    expect(canExecuteWorkOrders(mockUser('MANAGER'))).toBe(true);
    expect(canExecuteWorkOrders(mockUser('TECHNICIAN'))).toBe(true);
  });

  it('denies PURCHASER, DRIVER', () => {
    expect(canExecuteWorkOrders(mockUser('PURCHASER'))).toBe(false);
    expect(canExecuteWorkOrders(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canManageUsers', () => {
  it('allows only SUPER_ADMIN and OWNER', () => {
    expect(canManageUsers(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canManageUsers(mockUser('OWNER'))).toBe(true);
  });

  it('denies MANAGER, TECHNICIAN, PURCHASER, DRIVER', () => {
    expect(canManageUsers(mockUser('MANAGER'))).toBe(false);
    expect(canManageUsers(mockUser('TECHNICIAN'))).toBe(false);
    expect(canManageUsers(mockUser('PURCHASER'))).toBe(false);
    expect(canManageUsers(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canApproveInvoices', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER, PURCHASER', () => {
    expect(canApproveInvoices(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canApproveInvoices(mockUser('OWNER'))).toBe(true);
    expect(canApproveInvoices(mockUser('MANAGER'))).toBe(true);
    expect(canApproveInvoices(mockUser('PURCHASER'))).toBe(true);
  });

  it('denies TECHNICIAN, DRIVER', () => {
    expect(canApproveInvoices(mockUser('TECHNICIAN'))).toBe(false);
    expect(canApproveInvoices(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canManagePurchases', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER, PURCHASER', () => {
    expect(canManagePurchases(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canManagePurchases(mockUser('OWNER'))).toBe(true);
    expect(canManagePurchases(mockUser('MANAGER'))).toBe(true);
    expect(canManagePurchases(mockUser('PURCHASER'))).toBe(true);
  });

  it('denies TECHNICIAN, DRIVER', () => {
    expect(canManagePurchases(mockUser('TECHNICIAN'))).toBe(false);
    expect(canManagePurchases(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canManageProviders', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER, PURCHASER', () => {
    expect(canManageProviders(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canManageProviders(mockUser('OWNER'))).toBe(true);
    expect(canManageProviders(mockUser('MANAGER'))).toBe(true);
    expect(canManageProviders(mockUser('PURCHASER'))).toBe(true);
  });

  it('denies TECHNICIAN, DRIVER', () => {
    expect(canManageProviders(mockUser('TECHNICIAN'))).toBe(false);
    expect(canManageProviders(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canManageVehicles / canDeleteVehicles', () => {
  it('canManageVehicles allows SUPER_ADMIN, OWNER, MANAGER', () => {
    expect(canManageVehicles(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canManageVehicles(mockUser('OWNER'))).toBe(true);
    expect(canManageVehicles(mockUser('MANAGER'))).toBe(true);
  });

  it('canManageVehicles denies TECHNICIAN, PURCHASER, DRIVER', () => {
    expect(canManageVehicles(mockUser('TECHNICIAN'))).toBe(false);
    expect(canManageVehicles(mockUser('PURCHASER'))).toBe(false);
    expect(canManageVehicles(mockUser('DRIVER'))).toBe(false);
  });

  it('canDeleteVehicles allows only SUPER_ADMIN, OWNER', () => {
    expect(canDeleteVehicles(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canDeleteVehicles(mockUser('OWNER'))).toBe(true);
    expect(canDeleteVehicles(mockUser('MANAGER'))).toBe(false);
  });
});

describe('canViewDashboard', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER', () => {
    expect(canViewDashboard(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canViewDashboard(mockUser('OWNER'))).toBe(true);
    expect(canViewDashboard(mockUser('MANAGER'))).toBe(true);
  });

  it('denies TECHNICIAN, PURCHASER, DRIVER', () => {
    expect(canViewDashboard(mockUser('TECHNICIAN'))).toBe(false);
    expect(canViewDashboard(mockUser('PURCHASER'))).toBe(false);
    expect(canViewDashboard(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canRegisterOdometer', () => {
  it('allows any authenticated user', () => {
    for (const role of ALL_ROLES) {
      expect(canRegisterOdometer(mockUser(role))).toBe(true);
    }
  });

  it('denies null user', () => {
    expect(canRegisterOdometer(null)).toBe(false);
  });
});

describe('canManageMaintenancePrograms', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER', () => {
    expect(canManageMaintenancePrograms(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canManageMaintenancePrograms(mockUser('OWNER'))).toBe(true);
    expect(canManageMaintenancePrograms(mockUser('MANAGER'))).toBe(true);
  });

  it('denies TECHNICIAN, PURCHASER, DRIVER', () => {
    expect(canManageMaintenancePrograms(mockUser('TECHNICIAN'))).toBe(false);
    expect(canManageMaintenancePrograms(mockUser('PURCHASER'))).toBe(false);
    expect(canManageMaintenancePrograms(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canViewAlerts', () => {
  it('allows SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN', () => {
    expect(canViewAlerts(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canViewAlerts(mockUser('OWNER'))).toBe(true);
    expect(canViewAlerts(mockUser('MANAGER'))).toBe(true);
    expect(canViewAlerts(mockUser('TECHNICIAN'))).toBe(true);
  });

  it('denies PURCHASER, DRIVER', () => {
    expect(canViewAlerts(mockUser('PURCHASER'))).toBe(false);
    expect(canViewAlerts(mockUser('DRIVER'))).toBe(false);
  });
});

describe('canCreateMantItems / canResolveMantItemRequests', () => {
  it('TECHNICIAN cannot create mant items directly', () => {
    expect(canCreateMantItems(mockUser('TECHNICIAN'))).toBe(false);
  });

  it('OWNER and MANAGER can create mant items', () => {
    expect(canCreateMantItems(mockUser('OWNER'))).toBe(true);
    expect(canCreateMantItems(mockUser('MANAGER'))).toBe(true);
  });

  it('OWNER and MANAGER can resolve mant item requests', () => {
    expect(canResolveMantItemRequests(mockUser('OWNER'))).toBe(true);
    expect(canResolveMantItemRequests(mockUser('MANAGER'))).toBe(true);
  });

  it('TECHNICIAN cannot resolve requests', () => {
    expect(canResolveMantItemRequests(mockUser('TECHNICIAN'))).toBe(false);
  });
});

describe('Knowledge Base Permissions', () => {
  it('only SUPER_ADMIN can manage global KB', () => {
    expect(canManageGlobalKnowledgeBase(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canManageGlobalKnowledgeBase(mockUser('OWNER'))).toBe(false);
  });

  it('all authenticated users can view global KB', () => {
    for (const role of ALL_ROLES) {
      expect(canViewGlobalKnowledgeBase(mockUser(role))).toBe(true);
    }
    expect(canViewGlobalKnowledgeBase(null)).toBe(false);
  });

  it('SUPER_ADMIN, OWNER, MANAGER can manage tenant data', () => {
    expect(canManageTenantData(mockUser('SUPER_ADMIN'))).toBe(true);
    expect(canManageTenantData(mockUser('OWNER'))).toBe(true);
    expect(canManageTenantData(mockUser('MANAGER'))).toBe(true);
    expect(canManageTenantData(mockUser('TECHNICIAN'))).toBe(false);
  });
});

// ========================================
// REQUIRE VALIDATORS (throw on failure)
// ========================================

describe('requireAuthenticated', () => {
  it('does not throw for authenticated user', () => {
    expect(() => requireAuthenticated(mockUser('DRIVER'))).not.toThrow();
  });

  it('throws for null user', () => {
    expect(() => requireAuthenticated(null)).toThrow('No autenticado');
  });
});

describe('requireManagementRole', () => {
  it('does not throw for SUPER_ADMIN, OWNER, MANAGER', () => {
    expect(() => requireManagementRole(mockUser('SUPER_ADMIN'))).not.toThrow();
    expect(() => requireManagementRole(mockUser('OWNER'))).not.toThrow();
    expect(() => requireManagementRole(mockUser('MANAGER'))).not.toThrow();
  });

  it('throws for TECHNICIAN, PURCHASER, DRIVER', () => {
    expect(() => requireManagementRole(mockUser('TECHNICIAN'))).toThrow();
    expect(() => requireManagementRole(mockUser('PURCHASER'))).toThrow();
    expect(() => requireManagementRole(mockUser('DRIVER'))).toThrow();
  });
});

describe('requireMasterDataMutationPermission', () => {
  it('allows SUPER_ADMIN to modify global items', () => {
    const user = mockUserWithSuperAdmin('SUPER_ADMIN', true);
    const item = { isGlobal: true, tenantId: null };
    expect(() => requireMasterDataMutationPermission(user, item)).not.toThrow();
  });

  it('denies OWNER from modifying global items', () => {
    const user = mockUserWithSuperAdmin('OWNER', false);
    const item = { isGlobal: true, tenantId: null };
    expect(() => requireMasterDataMutationPermission(user, item)).toThrow(
      'Solo el administrador de plataforma puede modificar datos globales'
    );
  });

  it('allows OWNER to modify own tenant items', () => {
    const user = mockUserWithSuperAdmin('OWNER', false, 'tenant-1');
    const item = { isGlobal: false, tenantId: 'tenant-1' };
    expect(() => requireMasterDataMutationPermission(user, item)).not.toThrow();
  });

  it('denies OWNER from modifying other tenant items', () => {
    const user = mockUserWithSuperAdmin('OWNER', false, 'tenant-1');
    const item = { isGlobal: false, tenantId: 'tenant-2' };
    expect(() => requireMasterDataMutationPermission(user, item)).toThrow(
      'Este item pertenece a otro tenant'
    );
  });

  it('denies TECHNICIAN from modifying tenant items', () => {
    const user = mockUserWithSuperAdmin('TECHNICIAN', false, 'tenant-1');
    const item = { isGlobal: false, tenantId: 'tenant-1' };
    expect(() => requireMasterDataMutationPermission(user, item)).toThrow(
      'Se requiere rol OWNER o MANAGER'
    );
  });
});
