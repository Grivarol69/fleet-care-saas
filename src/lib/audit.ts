import { prisma } from './prisma';
import type { AuditAction } from '@prisma/client';

export type LogPlatformAdminAccessParams = {
  actorId: string;
  tenantId: string; // TARGET tenant — where the audit row lives
  action: AuditAction; // e.g. 'USER_ROLE_CHANGED', 'MODIFIED'
  resource: string; // e.g. 'User', 'Tenant'
  resourceId?: string;
  changes?: Record<string, unknown>;
};

/**
 * Records a platform-admin (SUPER_ADMIN scoped to PLATFORM_TENANT_ID)
 * touching a tenant's data. The row is stored in the TARGET tenant so
 * the tenant's own audit history surfaces it.
 *
 * Marks the changes payload with performedBy: 'PLATFORM_ADMIN' so
 * downstream consumers can distinguish from tenant-internal mutations.
 */
export async function logPlatformAdminAccess(
  params: LogPlatformAdminAccessParams
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      changes: {
        ...(params.changes ?? {}),
        performedBy: 'PLATFORM_ADMIN',
      },
    },
  });
}
