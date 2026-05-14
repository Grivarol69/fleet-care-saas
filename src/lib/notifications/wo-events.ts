import { prisma } from '@/lib/prisma';
import { getWhatsAppService } from './whatsapp';

// ========================================
// WO NOTIFICATION EVENTS — const (NOT TS enum, per CLAUDE.md)
// ========================================
export const WO_NOTIFICATION_EVENTS = {
  OPENING: 'OPENING',
  INSPECTION_DONE: 'INSPECTION_DONE',
  VEHICLE_GROUNDED: 'VEHICLE_GROUNDED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTHORIZED: 'AUTHORIZED',
  PO_CREATED: 'PO_CREATED',
} as const;

export type WONotificationEvent =
  (typeof WO_NOTIFICATION_EVENTS)[keyof typeof WO_NOTIFICATION_EVENTS];

// ========================================
// TYPES
// ========================================

export type WOEventContext = {
  workOrderId: string;
  vehiclePlate?: string;
  technicianName?: string;
  openingDate?: Date;
  description?: string;
};

type WOEventError =
  | { kind: 'recipients_empty'; tenantId: string }
  | { kind: 'twilio_failed'; tenantId: string; cause: unknown }
  | { kind: 'invalid_context'; missing: string[] };

// ========================================
// INTERNAL — message builder
// ========================================

function buildMessage(event: WONotificationEvent, ctx: WOEventContext): string {
  const plate = ctx.vehiclePlate ?? '(sin placa)';
  const tech = ctx.technicianName ?? '(sin técnico)';
  const date = ctx.openingDate
    ? ctx.openingDate.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('es-AR');
  const desc = ctx.description ?? '(sin descripción)';

  switch (event) {
    case WO_NOTIFICATION_EVENTS.OPENING:
      return `🔧 *Nueva OT Abierta*\n\n🚗 Vehículo: ${plate}\n📅 Fecha: ${date}\n👨‍🔧 Técnico: ${tech}\n📝 Motivo: ${desc}`;

    case WO_NOTIFICATION_EVENTS.INSPECTION_DONE:
      return `🔍 *Inspección Completada*\n\n🚗 Vehículo: ${plate}\n📋 ${desc}`;

    case WO_NOTIFICATION_EVENTS.VEHICLE_GROUNDED:
      return `🚨 *VEHÍCULO INMOVILIZADO*\n\n🚗 Vehículo: ${plate}\n⚠️ El vehículo ha sido dado de baja de circulación.\n📋 ${desc}`;

    case WO_NOTIFICATION_EVENTS.AUTH_REQUIRED:
      return `⏳ *Autorización Requerida*\n\n🚗 Vehículo: ${plate}\nUna OT está pendiente de autorización.`;

    case WO_NOTIFICATION_EVENTS.AUTHORIZED:
      return `✅ *OT Autorizada*\n\n🚗 Vehículo: ${plate}\nLa orden de trabajo fue autorizada y está lista para ejecutar.`;

    case WO_NOTIFICATION_EVENTS.PO_CREATED:
      return `📦 *Órdenes de Compra Generadas*\n\n🚗 Vehículo: ${plate}\nSe generaron OC para esta OT.`;

    default:
      return `🔔 Evento de OT: ${event}\n\n🚗 Vehículo: ${plate}`;
  }
}

// ========================================
// EXPORTED — getWORecipients
// ========================================

export async function getWORecipients(
  tenantId: string,
  event: WONotificationEvent
): Promise<{ phone: string; userId: string }[]> {
  const recipients = await prisma.wONotificationRecipient.findMany({
    where: {
      tenantId,
      isActive: true,
      events: { has: event },
    },
    select: {
      phone: true,
      userId: true,
    },
  });

  return recipients;
}

// ========================================
// EXPORTED — notifyWOEvent (fire-and-forget safe)
// ========================================

export async function notifyWOEvent(
  tenantId: string,
  event: WONotificationEvent,
  context: WOEventContext
): Promise<void> {
  try {
    const recipients = await getWORecipients(tenantId, event);

    if (recipients.length === 0) {
      const err: WOEventError = { kind: 'recipients_empty', tenantId };
      console.info('[WO_NOTIFY] No recipients configured', {
        workOrderId: context.workOrderId,
        event,
        detail: err,
      });
      return;
    }

    const messageBody = buildMessage(event, context);

    const whatsapp = getWhatsAppService();
    await whatsapp.sendBatchMessages(
      recipients.map(r => ({ to: r.phone, body: messageBody }))
    );
  } catch (cause: unknown) {
    // CRITICAL: errors MUST NOT propagate — fire-and-forget
    const err: WOEventError = { kind: 'twilio_failed', tenantId, cause };
    console.error('[WO_NOTIFY] Notification failed', {
      workOrderId: context.workOrderId,
      event,
      detail: err,
    });
  }
}
