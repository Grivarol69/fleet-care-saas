import twilio from 'twilio';
import { MessageUtils } from './message-templates';

// Tipos para el servicio WhatsApp
export interface WhatsAppMessage {
  to: string;
  body: string;
  from?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  to: string;
}

export interface WhatsAppBatchResponse {
  successful: WhatsAppResponse[];
  failed: WhatsAppResponse[];
  totalSent: number;
  totalFailed: number;
}

export class WhatsAppService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    // Validar variables de entorno
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error('Missing Twilio configuration. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment variables.');
    }

    this.client = twilio(accountSid, authToken);
    this.fromNumber = phoneNumber;
  }

  /**
   * Envía un mensaje WhatsApp individual
   */
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      // Validar y formatear número de teléfono
      const formattedPhone = MessageUtils.formatWhatsAppNumber(message.to);
      
      if (!MessageUtils.validateWhatsAppNumber(formattedPhone)) {
        return {
          success: false,
          error: `Invalid phone number format: ${message.to}`,
          to: message.to
        };
      }

      // Truncar mensaje si es muy largo
      const truncatedMessage = MessageUtils.truncateMessage(message.body);

      // Enviar mensaje vía Twilio
      const twilioMessage = await this.client.messages.create({
        body: truncatedMessage,
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${formattedPhone}`
      });

      console.log(`✅ WhatsApp sent to ${formattedPhone}: ${twilioMessage.sid}`);

      return {
        success: true,
        messageId: twilioMessage.sid,
        to: formattedPhone
      };

    } catch (error: unknown) {
      console.error(`❌ WhatsApp failed to ${message.to}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        to: message.to
      };
    }
  }

  /**
   * Envía múltiples mensajes WhatsApp
   */
  async sendBatchMessages(messages: WhatsAppMessage[]): Promise<WhatsAppBatchResponse> {
    const results = await Promise.allSettled(
      messages.map(message => this.sendMessage(message))
    );

    const successful: WhatsAppResponse[] = [];
    const failed: WhatsAppResponse[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successful.push(result.value);
        } else {
          failed.push(result.value);
        }
      } else {
        failed.push({
          success: false,
          error: result.reason?.message || 'Promise rejected',
          to: 'unknown'
        });
      }
    });

    const response: WhatsAppBatchResponse = {
      successful,
      failed,
      totalSent: successful.length,
      totalFailed: failed.length
    };

    console.log(`📊 Batch WhatsApp Summary: ${response.totalSent} sent, ${response.totalFailed} failed`);

    return response;
  }

  /**
   * Envía mensaje de prueba
   */
  async sendTestMessage(phoneNumber: string, tenantName: string = "Fleet Care"): Promise<WhatsAppResponse> {
    const testMessage: WhatsAppMessage = {
      to: phoneNumber,
      body: `🧪 *Mensaje de Prueba - Sistema de Alertas*\n\nEl sistema de alertas de mantenimiento está funcionando correctamente para ${tenantName}.\n\n_Mensaje de prueba automático_`
    };

    return this.sendMessage(testMessage);
  }

  /**
   * Valida la configuración de Twilio
   */
  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Intentar obtener información de la cuenta
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      console.log(`✅ Twilio configuration valid. Account: ${account.friendlyName}`);
      
      return { valid: true };
    } catch (error: unknown) {
      console.error('❌ Twilio configuration invalid:', error);

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid Twilio configuration'
      };
    }
  }

  /**
   * Obtiene el estado de un mensaje enviado
   */
  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    try {
      const message = await this.client.messages(messageId).fetch();
      return { status: message.status };
    } catch (error: unknown) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch message status'
      };
    }
  }
}

// Instancia singleton del servicio
let whatsappService: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!whatsappService) {
    whatsappService = new WhatsAppService();
  }
  return whatsappService;
}

// Export por defecto para facilitar importación
export default WhatsAppService;