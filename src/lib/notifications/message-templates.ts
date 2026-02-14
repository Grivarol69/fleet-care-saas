// Templates para mensajes de WhatsApp de alertas de mantenimiento

export interface MaintenanceAlert {
  vehiclePlate: string;
  mantItemDescription: string;
  currentKm: number;
  executionKm: number;
  kmToMaintenance: number;
  state: 'YELLOW' | 'RED';
  brandName: string;
  lineName: string;
  driverName?: string;
}

export interface AlertSummary {
  tenantName: string;
  alerts: MaintenanceAlert[];
  totalAlerts: number;
  criticalAlerts: number; // RED alerts
}

export class WhatsAppTemplates {
  /**
   * Mensaje resumen para supervisores (múltiples alertas)
   */
  static getSupervisorSummaryMessage(summary: AlertSummary): string {
    const header = `🚨 *Resumen de Alertas de Mantenimiento para ${summary.tenantName}:*\n\n`;

    let alertsList = '';
    summary.alerts.forEach(alert => {
      const emoji = alert.state === 'RED' ? '🔴' : '🟡';
      const urgency =
        alert.state === 'RED'
          ? `(URGENTE - ${alert.kmToMaintenance} km)`
          : `(${alert.kmToMaintenance} km)`;

      alertsList += `${emoji} *Vehículo ${alert.vehiclePlate}:* ${alert.mantItemDescription} ${urgency}.\n`;
    });

    const footer = `\n📊 *Total:* ${summary.totalAlerts} alertas | *Críticas:* ${summary.criticalAlerts}`;

    return header + alertsList + footer;
  }

  /**
   * Mensaje individual para conductor específico
   */
  static getDriverMessage(
    alert: MaintenanceAlert,
    tenantName: string,
    driverName?: string
  ): string {
    const greeting = driverName ? `Hola ${driverName},\n\n` : 'Hola,\n\n';
    const emoji = alert.state === 'RED' ? '🔴' : '🟡';
    const urgency = alert.state === 'RED' ? '*URGENTE*' : 'Próximo';

    const message = `${greeting}${emoji} *Alerta de Mantenimiento ${urgency}*

🚗 *Vehículo:* ${alert.vehiclePlate} (${alert.brandName} ${alert.lineName})
🔧 *Servicio:* ${alert.mantItemDescription}
📊 *Kilometraje actual:* ${alert.currentKm.toLocaleString()} km
⚠️ *Mantenimiento en:* ${alert.executionKm.toLocaleString()} km
📍 *Faltan:* ${alert.kmToMaintenance.toLocaleString()} km

${
  alert.state === 'RED'
    ? '⚠️ *ATENCIÓN:* Este mantenimiento es crítico. Programa la cita lo antes posible.'
    : '📋 Programa el mantenimiento pronto para evitar problemas.'
}

_Mensaje automático de ${tenantName}_`;

    return message;
  }

  /**
   * Mensaje de prueba para desarrollo
   */
  static getTestMessage(tenantName: string): string {
    return `🧪 *Mensaje de Prueba - Sistema de Alertas*\n\nEl sistema de alertas de mantenimiento está funcionando correctamente para ${tenantName}.\n\n_Mensaje de prueba automático_`;
  }

  /**
   * Mensaje de error para debugging
   */
  static getErrorMessage(error: string, context?: string): string {
    return `❌ *Error en Sistema de Alertas*\n\nError: ${error}\n${context ? `Contexto: ${context}` : ''}\n\n_Mensaje automático de debugging_`;
  }

  /**
   * Mensaje para notificar que no hay alertas
   */
  static getNoAlertsMessage(tenantName: string): string {
    return `✅ *Sin Alertas de Mantenimiento*\n\nTodos los vehículos de ${tenantName} están al día con sus mantenimientos.\n\n_Reporte automático_`;
  }
}

// Utilidades para formateo
export class MessageUtils {
  /**
   * Valida que el número de teléfono tenga formato WhatsApp válido
   */
  static validateWhatsAppNumber(phone: string): boolean {
    // Formato: +573001234567 (debe incluir código de país)
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Formatea número de teléfono para WhatsApp
   */
  static formatWhatsAppNumber(phone: string): string {
    // Remover espacios y caracteres especiales
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Si no tiene +, agregar +57 (Colombia) por defecto
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+57' + cleanPhone;
    }

    return cleanPhone;
  }

  /**
   * Trunca mensaje si es muy largo (WhatsApp tiene límite)
   */
  static truncateMessage(message: string, maxLength: number = 1600): string {
    if (message.length <= maxLength) return message;

    return message.substring(0, maxLength - 50) + '\n\n..._Mensaje truncado_';
  }
}
