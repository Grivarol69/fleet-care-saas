import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canApproveWorkOrder } from '@/lib/permissions';

/**
 * GET — List all WO notification recipients for the current tenant.
 */
export async function GET(_request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canApproveWorkOrder(user)) {
      return NextResponse.json(
        {
          error: 'No tienes permisos para ver destinatarios de notificaciones',
        },
        { status: 403 }
      );
    }

    const recipients = await tenantPrisma.wONotificationRecipient.findMany({
      where: { tenantId: user.tenantId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(recipients);
  } catch (error: unknown) {
    console.error('[WO_RECIPIENTS_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * POST — Create or update (upsert) a WO notification recipient.
 * Body: { userId: string, phone: string, events: string[] }
 * Upserts on @@unique([tenantId, userId]).
 */
export async function POST(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canApproveWorkOrder(user)) {
      return NextResponse.json(
        {
          error:
            'No tienes permisos para gestionar destinatarios de notificaciones',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, phone, events } = body as {
      userId?: string;
      phone?: string;
      events?: string[];
    };

    if (!userId || !phone || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Los campos userId, phone y events son requeridos' },
        { status: 400 }
      );
    }

    const recipient = await tenantPrisma.wONotificationRecipient.upsert({
      where: {
        tenantId_userId: {
          tenantId: user.tenantId,
          userId,
        },
      },
      create: {
        tenantId: user.tenantId,
        userId,
        phone,
        events,
        isActive: true,
      },
      update: {
        phone,
        events,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json(recipient, { status: 201 });
  } catch (error: unknown) {
    console.error('[WO_RECIPIENTS_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Update a recipient's phone, events, or isActive by userId.
 * Body: { userId: string, phone?: string, events?: string[], isActive?: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canApproveWorkOrder(user)) {
      return NextResponse.json(
        {
          error:
            'No tienes permisos para gestionar destinatarios de notificaciones',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, phone, events, isActive } = body as {
      userId?: string;
      phone?: string;
      events?: string[];
      isActive?: boolean;
    };

    if (!userId) {
      return NextResponse.json(
        { error: 'El campo userId es requerido' },
        { status: 400 }
      );
    }

    const existing = await tenantPrisma.wONotificationRecipient.findUnique({
      where: { tenantId_userId: { tenantId: user.tenantId, userId } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Destinatario no encontrado' },
        { status: 404 }
      );
    }

    const updateData: {
      phone?: string;
      events?: string[];
      isActive?: boolean;
    } = {};
    if (phone !== undefined) updateData.phone = phone;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await tenantPrisma.wONotificationRecipient.update({
      where: { tenantId_userId: { tenantId: user.tenantId, userId } },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[WO_RECIPIENTS_PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Soft-delete a recipient (isActive = false) by userId.
 * Body: { userId: string }  OR  ?userId=... in query params
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canApproveWorkOrder(user)) {
      return NextResponse.json(
        {
          error:
            'No tienes permisos para gestionar destinatarios de notificaciones',
        },
        { status: 403 }
      );
    }

    // Support both body and query param
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');

    if (!userId) {
      try {
        const body = await request.json();
        userId = body?.userId ?? null;
      } catch {
        // no body — userId stays null
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'El campo userId es requerido' },
        { status: 400 }
      );
    }

    const existing = await tenantPrisma.wONotificationRecipient.findUnique({
      where: { tenantId_userId: { tenantId: user.tenantId, userId } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Destinatario no encontrado' },
        { status: 404 }
      );
    }

    await tenantPrisma.wONotificationRecipient.update({
      where: { tenantId_userId: { tenantId: user.tenantId, userId } },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Destinatario desactivado' });
  } catch (error: unknown) {
    console.error('[WO_RECIPIENTS_DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
