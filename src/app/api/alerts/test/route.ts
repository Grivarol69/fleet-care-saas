import { NextRequest, NextResponse } from "next/server";
import { getNotificationService } from "@/lib/notifications/notification-service";
import { getWhatsAppService } from "@/lib/notifications/whatsapp";
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'send';
    const phone = searchParams.get('phone');
    const urgent = searchParams.get('urgent') === 'true';

    const notificationService = getNotificationService();

    switch (action) {
      case 'config':
        // Verificar configuración de Twilio
        const whatsappService = getWhatsAppService();
        const configResult = await whatsappService.validateConfiguration();

        return NextResponse.json({
          success: configResult.valid,
          message: configResult.valid ? 'Twilio configuration is valid' : 'Twilio configuration is invalid',
          error: configResult.error,
          environment: {
            hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
            hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
            hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
            fromNumber: process.env.TWILIO_PHONE_NUMBER
          }
        });

      case 'test-message':
        // Enviar mensaje de prueba a un número específico
        if (!phone) {
          return NextResponse.json({
            success: false,
            error: 'Phone number is required for test message. Use ?action=test-message&phone=+573001234567'
          }, { status: 400 });
        }

        const testResult = await notificationService.sendTestAlert(phone, user.tenantId);

        return NextResponse.json({
          success: testResult.success,
          message: testResult.success ? 'Test message sent successfully' : 'Failed to send test message',
          error: testResult.error,
          phone: phone
        });

      case 'alerts':
        // Obtener alertas sin enviar
        const alerts = await notificationService.getMaintenanceAlerts(user.tenantId, urgent);

        return NextResponse.json({
          success: true,
          message: `Found ${alerts.length} maintenance alerts`,
          data: {
            tenantId: user.tenantId,
            totalAlerts: alerts.length,
            criticalAlerts: alerts.filter(a => a.state === 'RED').length,
            urgentOnly: urgent,
            alerts: alerts
          }
        });

      case 'recipients':
        // Obtener destinatarios sin enviar
        const recipients = await notificationService.getNotificationRecipients(user.tenantId);

        return NextResponse.json({
          success: true,
          message: `Found ${recipients.length} notification recipients`,
          data: {
            tenantId: user.tenantId,
            totalRecipients: recipients.length,
            supervisors: recipients.filter(r => r.type === 'SUPERVISOR').length,
            drivers: recipients.filter(r => r.type === 'DRIVER').length,
            recipients: recipients.map(r => ({
              name: r.name,
              type: r.type,
              phone: r.phone.replace(/(\d{3})(\d{3})(\d{4})/, '+57$1***$3'), // Ocultar parte del teléfono
              vehicleId: r.vehicleId
            }))
          }
        });

      case 'send':
      default:
        // Enviar alertas reales (acción por defecto)
        const result = await notificationService.sendMaintenanceAlerts(user.tenantId, urgent);

        if (result.alertsProcessed === 0) {
          return NextResponse.json({
            success: true,
            message: '✅ No maintenance alerts to send',
            data: result
          });
        }

        return NextResponse.json({
          success: result.messagesSent > 0,
          message: result.messagesSent > 0
            ? `✅ Sent ${result.messagesSent}/${result.messagesAttempted} alerts successfully`
            : `❌ Failed to send any alerts (${result.messagesFailed} failures)`,
          data: {
            ...result,
            // Ocultar información sensible en respuesta
            whatsappResponse: undefined,
            recipients: result.recipients.map(r => ({
              name: r.name,
              type: r.type,
              vehicleId: r.vehicleId
            }))
          }
        });
    }

  } catch (error: unknown) {
    console.error("[ALERTS_TEST] Error:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to process alert test request'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { phone, message } = body;

    if (!phone) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    const whatsappService = getWhatsAppService();

    // Si se proporciona un mensaje personalizado, enviarlo directamente
    if (message) {
      const result = await whatsappService.sendMessage({
        to: phone,
        body: message
      });

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Custom message sent successfully' : 'Failed to send custom message',
        error: result.error,
        messageId: result.messageId
      });
    }

    // Si no, enviar mensaje de prueba estándar
    const notificationService = getNotificationService();
    const result = await notificationService.sendTestAlert(phone, user.tenantId);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test alert sent successfully' : 'Failed to send test alert',
      error: result.error
    });

  } catch (error: unknown) {
    console.error("[ALERTS_TEST_POST] Error:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/*
USAGE EXAMPLES:

1. Verificar configuración de Twilio:
   GET /api/alerts/test?action=config

2. Ver alertas disponibles:
   GET /api/alerts/test?action=alerts
   GET /api/alerts/test?action=alerts&urgent=true

3. Ver destinatarios:
   GET /api/alerts/test?action=recipients

4. Enviar mensaje de prueba:
   GET /api/alerts/test?action=test-message&phone=+573001234567

5. Enviar alertas reales:
   GET /api/alerts/test
   GET /api/alerts/test?urgent=true

6. Enviar mensaje personalizado (POST):
   POST /api/alerts/test
   {
     "phone": "+573001234567",
     "message": "Mensaje personalizado de prueba"
   }
*/