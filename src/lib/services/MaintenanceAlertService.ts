import { prisma } from '@/lib/prisma';
import {
  Prisma,
  AlertLevel,
  AlertType,
  AlertCategory,
  Priority,
} from '@prisma/client';

// Umbrales para generar alertas (en km)
const ALERT_THRESHOLDS = {
  EARLY_WARNING: 2000, // Aviso temprano
  MEDIUM: 1000, // Atención
  HIGH: 500, // Próximo
  CRITICAL: 0, // Vencido
};

export class MaintenanceAlertService {
  /**
   * Verifica y genera alertas para un vehículo cuando se actualiza el odómetro
   */
  static async checkAndGenerateAlerts(
    vehicleId: number,
    currentKm: number,
    tenantId: string
  ): Promise<void> {
    // Added tenantId param
    try {
      // 1. Obtener programa activo del vehículo
      const program = await prisma.vehicleMantProgram.findFirst({
        where: {
          vehicleId,
          isActive: true,
          status: 'ACTIVE',
        },
        include: {
          packages: {
            where: { status: 'PENDING' },
            include: {
              items: {
                where: {
                  status: 'PENDING',
                  scheduledKm: { not: null },
                },
                include: { mantItem: true },
              },
            },
          },
        },
      });

      if (!program) {
        console.log(
          `[MaintenanceAlertService] No active program found for vehicle ${vehicleId}`
        );
        return;
      }

      // 2. Procesar cada item de cada paquete
      for (const pkg of program.packages) {
        for (const item of pkg.items) {
          if (!item.scheduledKm) continue;

          const kmToMaintenance = item.scheduledKm - currentKm;

          // Solo generar alerta si está dentro del umbral EARLY_WARNING
          if (kmToMaintenance <= ALERT_THRESHOLDS.EARLY_WARNING) {
            await this.createOrUpdateAlert(
              vehicleId,
              item.id,
              item.mantItem.name,
              pkg.name,
              item.scheduledKm,
              currentKm,
              kmToMaintenance,
              item.estimatedCost ? Number(item.estimatedCost) : null,
              item.estimatedTime ? Number(item.estimatedTime) : null,
              this.determineCategory(item.mantItem.name),
              tenantId
            );
          }
        }
      }
    } catch (error) {
      console.error('[MaintenanceAlertService] Error checking alerts:', error);
      // No lanzar error para no bloquear el guardado del odómetro
    }
  }

  /**
   * Crea o actualiza una alerta de mantenimiento
   */
  private static async createOrUpdateAlert(
    vehicleId: number,
    programItemId: number,
    itemName: string,
    packageName: string,
    scheduledKm: number,
    currentKm: number,
    kmToMaintenance: number,
    estimatedCost: number | null,
    estimatedDuration: number | null,
    category: AlertCategory,
    tenantId: string
  ): Promise<void> {
    // Verificar si ya existe alerta activa para este item
    const existingAlert = await prisma.maintenanceAlert.findFirst({
      where: {
        programItemId,
        status: { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] },
      },
    });

    const alertLevel = this.calculateAlertLevel(kmToMaintenance);
    const priority = this.calculatePriority(kmToMaintenance, category);
    const priorityScore = this.calculatePriorityScore(
      kmToMaintenance,
      category
    );
    const type = this.determineAlertType(kmToMaintenance);
    const alertThresholdKm = this.getAlertThreshold(kmToMaintenance);

    if (existingAlert) {
      // ACTUALIZAR alerta existente
      await prisma.maintenanceAlert.update({
        where: { id: existingAlert.id },
        data: {
          currentKm,
          kmToMaintenance,
          alertLevel,
          priority,
          priorityScore,
          type,
          updatedAt: new Date(),
        },
      });

      console.log(
        `[MaintenanceAlertService] Updated alert ${existingAlert.id} for ${itemName}`
      );
    } else {
      // CREAR nueva alerta
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: tenantId,
          vehicleId,
          programItemId,
          type,
          category,
          itemName,
          packageName,
          description: `Mantenimiento programado: ${itemName}`,
          estimatedCost,
          estimatedDuration,
          scheduledKm,
          currentKmAtCreation: currentKm,
          currentKm,
          kmToMaintenance,
          alertThresholdKm,
          priority,
          alertLevel,
          priorityScore,
          status: 'PENDING',
          viewedBy: [],
        },
      });

      console.log(
        `[MaintenanceAlertService] Created new alert for ${itemName} (${kmToMaintenance} km remaining)`
      );
    }
  }

  /**
   * Calcula el nivel de alerta (semáforo) basado en km faltantes
   */
  private static calculateAlertLevel(kmToMaintenance: number): AlertLevel {
    if (kmToMaintenance <= ALERT_THRESHOLDS.CRITICAL) return 'CRITICAL'; // Vencido
    if (kmToMaintenance <= ALERT_THRESHOLDS.HIGH) return 'HIGH'; // < 500 km
    if (kmToMaintenance <= ALERT_THRESHOLDS.MEDIUM) return 'MEDIUM'; // < 1000 km
    return 'LOW'; // < 2000 km
  }

  /**
   * Determina el tipo de alerta
   */
  private static determineAlertType(kmToMaintenance: number): AlertType {
    if (kmToMaintenance <= 0) return 'OVERDUE'; // Vencido
    if (kmToMaintenance > ALERT_THRESHOLDS.MEDIUM) return 'EARLY_WARNING'; // Aviso temprano
    return 'PREVENTIVE'; // Normal
  }

  /**
   * Calcula prioridad basada en km faltantes y categoría
   */
  private static calculatePriority(
    kmToMaintenance: number,
    category: AlertCategory
  ): Priority {
    // Si es crítico de seguridad, siempre alta prioridad cuando está cerca
    if (category === 'CRITICAL_SAFETY') {
      if (kmToMaintenance <= ALERT_THRESHOLDS.HIGH) return 'URGENT';
      if (kmToMaintenance <= ALERT_THRESHOLDS.MEDIUM) return 'HIGH';
      return 'MEDIUM';
    }

    // Para componentes mayores
    if (category === 'MAJOR_COMPONENT') {
      if (kmToMaintenance <= 0) return 'URGENT';
      if (kmToMaintenance <= ALERT_THRESHOLDS.HIGH) return 'HIGH';
      if (kmToMaintenance <= ALERT_THRESHOLDS.MEDIUM) return 'MEDIUM';
      return 'LOW';
    }

    // Para mantenimiento rutinario
    if (kmToMaintenance <= 0) return 'HIGH';
    if (kmToMaintenance <= ALERT_THRESHOLDS.HIGH) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calcula score de prioridad (0-100)
   */
  private static calculatePriorityScore(
    kmToMaintenance: number,
    category: AlertCategory
  ): number {
    let score = 0;

    // FACTOR 1: Urgencia por km (40 puntos)
    const kmFactor = Math.max(0, 40 - kmToMaintenance / 50);
    score += kmFactor;

    // FACTOR 2: Criticidad del mantenimiento (30 puntos)
    const categoryScore =
      {
        CRITICAL_SAFETY: 30,
        MAJOR_COMPONENT: 20,
        ROUTINE: 10,
        MINOR: 5,
      }[category] || 10;
    score += categoryScore;

    // FACTOR 3: Si está vencido (30 puntos extra)
    if (kmToMaintenance <= 0) {
      score += 30;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Determina categoría del mantenimiento basado en el nombre del item
   */
  private static determineCategory(itemName: string): AlertCategory {
    const nameLower = itemName.toLowerCase();

    // Críticos de seguridad
    if (
      nameLower.includes('freno') ||
      nameLower.includes('neumático') ||
      nameLower.includes('llanta') ||
      nameLower.includes('dirección') ||
      nameLower.includes('suspensión')
    ) {
      return 'CRITICAL_SAFETY';
    }

    // Componentes mayores
    if (
      nameLower.includes('motor') ||
      nameLower.includes('transmisión') ||
      nameLower.includes('caja') ||
      nameLower.includes('embrague') ||
      nameLower.includes('turbo')
    ) {
      return 'MAJOR_COMPONENT';
    }

    // Rutinario
    if (
      nameLower.includes('aceite') ||
      nameLower.includes('filtro') ||
      nameLower.includes('lubricante') ||
      nameLower.includes('líquido') ||
      nameLower.includes('liquido')
    ) {
      return 'ROUTINE';
    }

    // Menor por defecto
    return 'MINOR';
  }

  /**
   * Obtiene el umbral que disparó la alerta
   */
  private static getAlertThreshold(kmToMaintenance: number): number {
    if (kmToMaintenance <= ALERT_THRESHOLDS.CRITICAL)
      return ALERT_THRESHOLDS.CRITICAL;
    if (kmToMaintenance <= ALERT_THRESHOLDS.HIGH) return ALERT_THRESHOLDS.HIGH;
    if (kmToMaintenance <= ALERT_THRESHOLDS.MEDIUM)
      return ALERT_THRESHOLDS.MEDIUM;
    return ALERT_THRESHOLDS.EARLY_WARNING;
  }

  /**
   * Actualiza todas las alertas activas (llamado por cron diario)
   */
  static async updateAllActiveAlerts(): Promise<number> {
    try {
      // Obtener todas las alertas activas
      const alerts = await prisma.maintenanceAlert.findMany({
        where: {
          status: { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] },
        },
        include: {
          vehicle: true,
        },
      });

      let updated = 0;

      for (const alert of alerts) {
        const currentKm = alert.vehicle.mileage;
        const kmToMaintenance = alert.scheduledKm - currentKm;

        const alertLevel = this.calculateAlertLevel(kmToMaintenance);
        const priority = this.calculatePriority(
          kmToMaintenance,
          alert.category
        );
        const type = this.determineAlertType(kmToMaintenance);

        await prisma.maintenanceAlert.update({
          where: { id: alert.id },
          data: {
            currentKm,
            kmToMaintenance,
            alertLevel,
            priority,
            type,
            updatedAt: new Date(),
          },
        });

        updated++;
      }

      console.log(`[MaintenanceAlertService] Updated ${updated} active alerts`);
      return updated;
    } catch (error) {
      console.error('[MaintenanceAlertService] Error updating alerts:', error);
      throw error;
    }
  }

  /**
   * Cierra una alerta cuando se completa el mantenimiento
   */
  static async closeAlert(
    alertId: number,
    workOrderId: number,
    actualCost?: number
  ): Promise<void> {
    const alert = await prisma.maintenanceAlert.findUnique({
      where: { id: alertId },
      include: { programItem: true },
    });

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    const responseTimeMinutes = alert.workOrderCreatedAt
      ? Math.round(
          (alert.workOrderCreatedAt.getTime() - alert.createdAt.getTime()) /
            1000 /
            60
        )
      : null;

    const completionTimeHours = alert.workOrderCreatedAt
      ? Math.round(
          (new Date().getTime() - alert.workOrderCreatedAt.getTime()) /
            1000 /
            60 /
            60
        )
      : null;

    const wasOnTime = alert.kmToMaintenance >= 0;

    const costVariance =
      actualCost && alert.estimatedCost
        ? actualCost - Number(alert.estimatedCost)
        : null;

    const updateData: Prisma.MaintenanceAlertUpdateInput = {
      status: 'CLOSED',
      workOrder: { connect: { id: workOrderId } },
      wasOnTime,
      closedAt: new Date(),
    };

    if (actualCost !== undefined) updateData.actualCost = actualCost;
    if (costVariance !== null) updateData.costVariance = costVariance;
    if (responseTimeMinutes !== null)
      updateData.responseTimeMinutes = responseTimeMinutes;
    if (completionTimeHours !== null)
      updateData.completionTimeHours = completionTimeHours;

    await prisma.maintenanceAlert.update({
      where: { id: alertId },
      data: updateData,
    });

    console.log(
      `[MaintenanceAlertService] Closed alert ${alertId} for WO ${workOrderId}`
    );
  }
}
