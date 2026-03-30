import {
  TIRE_USEFUL_LIFE_ALERT_THRESHOLD,
  TIRE_TREAD_DEPTH_MIN_MM,
  EXTINGUISHER_INSPECTION_WARNING_DAYS,
} from '@/lib/serialized-asset-constants';
import type { TenantPrismaClient } from '@/lib/tenant-prisma';

export async function evaluateAndCreateAlerts(
  itemId: string,
  specs: Record<string, unknown>,
  tenantId: string,
  vehicleId: string | null,
  tenantPrisma: TenantPrismaClient
): Promise<void> {
  // --- usefulLifePct alerts ---
  if (typeof specs.usefulLifePct === 'number') {
    if (specs.usefulLifePct < TIRE_USEFUL_LIFE_ALERT_THRESHOLD) {
      const existing = await tenantPrisma.serializedItemAlert.findFirst({
        where: {
          serializedItemId: itemId,
          alertType: 'LOW_USEFUL_LIFE',
          status: 'ACTIVE',
        },
      });
      if (!existing) {
        await tenantPrisma.serializedItemAlert.create({
          data: {
            tenantId,
            serializedItemId: itemId,
            vehicleId,
            alertType: 'LOW_USEFUL_LIFE',
            status: 'ACTIVE',
            message: 'Vida útil del activo por debajo del 30%',
          },
        });
      }
    } else {
      await tenantPrisma.serializedItemAlert.updateMany({
        where: {
          serializedItemId: itemId,
          alertType: 'LOW_USEFUL_LIFE',
          status: 'ACTIVE',
        },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    }
  }

  // --- treadDepthMm alerts ---
  if (typeof specs.treadDepthMm === 'number') {
    if (specs.treadDepthMm < TIRE_TREAD_DEPTH_MIN_MM) {
      const existing = await tenantPrisma.serializedItemAlert.findFirst({
        where: {
          serializedItemId: itemId,
          alertType: 'LOW_TREAD',
          status: 'ACTIVE',
        },
      });
      if (!existing) {
        await tenantPrisma.serializedItemAlert.create({
          data: {
            tenantId,
            serializedItemId: itemId,
            vehicleId,
            alertType: 'LOW_TREAD',
            status: 'ACTIVE',
            message: 'Profundidad de surco del neumático por debajo de 4mm',
          },
        });
      }
    } else {
      await tenantPrisma.serializedItemAlert.updateMany({
        where: {
          serializedItemId: itemId,
          alertType: 'LOW_TREAD',
          status: 'ACTIVE',
        },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    }
  }

  // --- nextInspectionDue alerts ---
  if (typeof specs.nextInspectionDue === 'string') {
    const inspectionDate = new Date(specs.nextInspectionDue);
    const now = new Date();
    const warningCutoff = new Date(
      now.getTime() + EXTINGUISHER_INSPECTION_WARNING_DAYS * 24 * 60 * 60 * 1000
    );
    const isDueSoon = inspectionDate <= warningCutoff;

    if (isDueSoon) {
      const existing = await tenantPrisma.serializedItemAlert.findFirst({
        where: {
          serializedItemId: itemId,
          alertType: 'INSPECTION_DUE',
          status: 'ACTIVE',
        },
      });
      if (!existing) {
        await tenantPrisma.serializedItemAlert.create({
          data: {
            tenantId,
            serializedItemId: itemId,
            vehicleId,
            alertType: 'INSPECTION_DUE',
            status: 'ACTIVE',
            message: 'Inspección del extintor próxima a vencer',
          },
        });
      }
    } else {
      await tenantPrisma.serializedItemAlert.updateMany({
        where: {
          serializedItemId: itemId,
          alertType: 'INSPECTION_DUE',
          status: 'ACTIVE',
        },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    }
  }
}
