import { prisma } from '@/lib/prisma';
import {
  getWhatsAppService,
  WhatsAppMessage,
  WhatsAppBatchResponse,
} from './whatsapp';
import {
  WhatsAppTemplates,
  MaintenanceAlert,
  AlertSummary,
} from './message-templates';

// Tipos para el servicio de notificaciones
export interface NotificationRecipient {
  phone: string;
  name: string;
  type: 'DRIVER' | 'SUPERVISOR';
  vehicleId?: string;
}

export interface AlertNotificationResult {
  alertsProcessed: number;
  messagesAttempted: number;
  messagesSent: number;
  messagesFailed: number;
  recipients: NotificationRecipient[];
  errors: string[];
  whatsappResponse?: WhatsAppBatchResponse;
}

export class NotificationService {
  private whatsappService = getWhatsAppService();

  /**
   * Obtiene alertas de mantenimiento próximas para un tenant
   */
  async getMaintenanceAlerts(
    tenantId: string,
    urgentOnly: boolean = false
  ): Promise<MaintenanceAlert[]> {
    try {
      const whereClause = {
        tenantId: tenantId,
        status: 'PENDING' as const,
        package: {
          program: {
            status: 'ACTIVE' as const,
            isActive: true,
          },
        },
        scheduledKm: { not: null },
      };

      const maintenanceItems = await prisma.vehicleProgramItem.findMany({
        where: whereClause,
        include: {
          package: {
            include: {
              program: {
                include: {
                  vehicle: {
                    include: {
                      brand: true,
                      line: true,
                    },
                  },
                },
              },
            },
          },
          mantItem: true,
        },
        orderBy: {
          scheduledKm: 'asc',
        },
      });

      const alerts: MaintenanceAlert[] = maintenanceItems.map(item => {
        const vehicle = item.package.program.vehicle;
        const currentKm = vehicle.mileage;
        const executionKm = item.scheduledKm!;
        const kmToMaintenance = executionKm - currentKm;

        let state: 'YELLOW' | 'RED' = 'YELLOW';
        if (kmToMaintenance <= 500) {
          state = 'RED';
        } else if (kmToMaintenance <= 2000) {
          state = 'YELLOW';
        }

        return {
          vehiclePlate: vehicle.licensePlate,
          mantItemDescription: item.mantItem.name,
          currentKm: currentKm,
          executionKm: executionKm,
          kmToMaintenance: Math.max(0, kmToMaintenance),
          state: state,
          brandName: vehicle.brand.name,
          lineName: vehicle.line.name,
        };
      });

      // Filtrar solo alertas próximas o urgentes
      const filteredAlerts = alerts.filter(alert => {
        if (urgentOnly) {
          return alert.state === 'RED'; // Solo críticas
        }
        return alert.kmToMaintenance <= 3000; // Próximas y críticas
      });

      return filteredAlerts.sort(
        (a, b) => a.kmToMaintenance - b.kmToMaintenance
      );
    } catch (error) {
      console.error(
        '[NOTIFICATION_SERVICE] Error getting maintenance alerts:',
        error
      );
      throw new Error('Failed to fetch maintenance alerts');
    }
  }

  /**
   * Obtiene destinatarios para las alertas (conductores + supervisores)
   */
  async getNotificationRecipients(
    tenantId: string,
    vehicleIds?: string[]
  ): Promise<NotificationRecipient[]> {
    try {
      const recipients: NotificationRecipient[] = [];

      // 1. Obtener supervisores del tenant
      const supervisors = await prisma.user.findMany({
        where: {
          tenantId: tenantId,
          role: 'MANAGER',
          phone: { not: null },
          isActive: true,
        },
      });

      supervisors.forEach(supervisor => {
        if (supervisor.phone) {
          recipients.push({
            phone: supervisor.phone,
            name:
              `${supervisor.firstName} ${supervisor.lastName}`.trim() ||
              supervisor.email,
            type: 'SUPERVISOR',
          });
        }
      });

      // 2. Obtener conductores principales de los vehículos (si se especifican)
      if (vehicleIds && vehicleIds.length > 0) {
        const driverShifts = await prisma.driverShift.findMany({
          where: {
            tenantId: tenantId,
            vehicleId: { in: vehicleIds },
            status: 'ACTIVE',
          },
          include: {
            driver: { select: { phone: true, name: true } },
          },
        });

        driverShifts.forEach(ds => {
          if (ds.driver.phone) {
            recipients.push({
              phone: ds.driver.phone,
              name: ds.driver.name,
              type: 'DRIVER',
              vehicleId: ds.vehicleId,
            });
          }
        });
      }

      console.log(
        `📋 Found ${recipients.length} recipients: ${recipients.filter(r => r.type === 'SUPERVISOR').length} supervisors, ${recipients.filter(r => r.type === 'DRIVER').length} drivers`
      );

      return recipients;
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE] Error getting recipients:', error);
      throw new Error('Failed to fetch notification recipients');
    }
  }

  /**
   * Envía alertas de mantenimiento para un tenant específico
   */
  async sendMaintenanceAlerts(
    tenantId: string,
    urgentOnly: boolean = false
  ): Promise<AlertNotificationResult> {
    try {
      // 1. Obtener información del tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // 2. Obtener alertas de mantenimiento
      const alerts = await this.getMaintenanceAlerts(tenantId, urgentOnly);

      if (alerts.length === 0) {
        console.log(`📭 No maintenance alerts found for tenant ${tenant.name}`);
        return {
          alertsProcessed: 0,
          messagesAttempted: 0,
          messagesSent: 0,
          messagesFailed: 0,
          recipients: [],
          errors: [],
        };
      }

      // 3. Obtener vehículos con alertas para encontrar conductores
      const vehicleIds = alerts.map(alert => {
        // Necesitamos encontrar el vehicleId desde la placa
        return alert.vehiclePlate;
      });

      // Buscar IDs de vehículos por placas
      const vehicles = await prisma.vehicle.findMany({
        where: {
          tenantId: tenantId,
          licensePlate: { in: vehicleIds },
        },
        select: { id: true, licensePlate: true },
      });

      const vehicleIdMap = vehicles.reduce(
        (map, vehicle) => {
          map[vehicle.licensePlate] = vehicle.id;
          return map;
        },
        {} as Record<string, string>
      );

      const actualVehicleIds = Object.values(vehicleIdMap);

      // 4. Obtener destinatarios
      const recipients = await this.getNotificationRecipients(
        tenantId,
        actualVehicleIds
      );

      if (recipients.length === 0) {
        console.log(`📭 No recipients found for tenant ${tenant.name}`);
        return {
          alertsProcessed: alerts.length,
          messagesAttempted: 0,
          messagesSent: 0,
          messagesFailed: 0,
          recipients: [],
          errors: ['No recipients with phone numbers found'],
        };
      }

      // 5. Preparar mensajes
      const messages: WhatsAppMessage[] = [];

      const criticalAlerts = alerts.filter(a => a.state === 'RED').length;
      const alertSummary: AlertSummary = {
        tenantName: tenant.name,
        alerts: alerts,
        totalAlerts: alerts.length,
        criticalAlerts: criticalAlerts,
      };

      // Mensajes para supervisores (resumen)
      const supervisors = recipients.filter(r => r.type === 'SUPERVISOR');
      supervisors.forEach(supervisor => {
        messages.push({
          to: supervisor.phone,
          body: WhatsAppTemplates.getSupervisorSummaryMessage(alertSummary),
        });
      });

      // Mensajes individuales para conductores
      const drivers = recipients.filter(r => r.type === 'DRIVER');
      drivers.forEach(driver => {
        if (driver.vehicleId) {
          // Encontrar alertas específicas para este vehículo
          const vehicle = vehicles.find(v => v.id === driver.vehicleId);
          if (vehicle) {
            const vehicleAlerts = alerts.filter(
              a => a.vehiclePlate === vehicle.licensePlate
            );

            vehicleAlerts.forEach(alert => {
              messages.push({
                to: driver.phone,
                body: WhatsAppTemplates.getDriverMessage(
                  alert,
                  tenant.name,
                  driver.name
                ),
              });
            });
          }
        }
      });

      // 6. Enviar mensajes
      const whatsappResponse =
        await this.whatsappService.sendBatchMessages(messages);

      console.log(`📊 Alert notification summary for ${tenant.name}:`);
      console.log(`   - Alerts processed: ${alerts.length}`);
      console.log(`   - Messages attempted: ${messages.length}`);
      console.log(`   - Messages sent: ${whatsappResponse.totalSent}`);
      console.log(`   - Messages failed: ${whatsappResponse.totalFailed}`);

      return {
        alertsProcessed: alerts.length,
        messagesAttempted: messages.length,
        messagesSent: whatsappResponse.totalSent,
        messagesFailed: whatsappResponse.totalFailed,
        recipients: recipients,
        errors: whatsappResponse.failed.map(f => f.error || 'Unknown error'),
        whatsappResponse: whatsappResponse,
      };
    } catch (error: unknown) {
      console.error(
        '[NOTIFICATION_SERVICE] Error sending maintenance alerts:',
        error
      );
      throw new Error(
        `Failed to send maintenance alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Envía mensaje de prueba a un número específico
   */
  async sendTestAlert(
    phoneNumber: string,
    tenantId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let tenantName = 'Fleet Care';

      if (tenantId) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
        });
        if (tenant) {
          tenantName = tenant.name;
        }
      }

      const result = await this.whatsappService.sendTestMessage(
        phoneNumber,
        tenantName
      );

      return {
        success: result.success,
        ...(result.error && { error: result.error }),
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Instancia singleton
let notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
}

export default NotificationService;
