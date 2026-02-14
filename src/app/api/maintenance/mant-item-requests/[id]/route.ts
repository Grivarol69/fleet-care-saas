import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isOwner, isManager, isSuperAdmin } from '@/lib/permissions';

/**
 * GET /api/maintenance/mant-item-requests/:id
 * Obtener detalle de una solicitud
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const itemRequest = await prisma.mantItemRequest.findFirst({
      where: { id: requestId, tenantId: user.tenantId },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    if (!itemRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(itemRequest);
  } catch (error) {
    console.error('[MANT_ITEM_REQUEST_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/maintenance/mant-item-requests/:id
 * Aprobar o rechazar solicitud. Solo OWNER/MANAGER.
 * Al aprobar, crea el MantItem automáticamente.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!isSuperAdmin(user) && !isOwner(user) && !isManager(user)) {
      return NextResponse.json(
        { error: 'Solo OWNER o MANAGER pueden resolver solicitudes' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { action, rejectionReason } = await req.json();

    if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida. Use APPROVED o REJECTED' },
        { status: 400 }
      );
    }

    // Verificar que la solicitud existe y está pendiente
    const itemRequest = await prisma.mantItemRequest.findFirst({
      where: { id: requestId, tenantId: user.tenantId },
    });

    if (!itemRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    if (itemRequest.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: `La solicitud ya fue ${itemRequest.status === 'APPROVED' ? 'aprobada' : 'rechazada'}`,
        },
        { status: 409 }
      );
    }

    if (action === 'REJECTED') {
      if (!rejectionReason || rejectionReason.trim().length < 3) {
        return NextResponse.json(
          { error: 'Debe proporcionar un motivo de rechazo' },
          { status: 400 }
        );
      }

      const rejected = await prisma.mantItemRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          resolvedBy: user.id,
          resolvedAt: new Date(),
          rejectionReason: rejectionReason.trim(),
        },
        include: {
          category: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json(rejected);
    }

    // APPROVED: crear MantItem + actualizar solicitud en transacción
    const result = await prisma.$transaction(async tx => {
      // Verificar duplicado exacto antes de crear
      const existing = await tx.mantItem.findFirst({
        where: {
          tenantId: user.tenantId,
          name: itemRequest.suggestedName,
        },
      });

      if (existing) {
        throw new Error(
          `Ya existe un item con el nombre "${itemRequest.suggestedName}". Rechace la solicitud e indique al usuario que use el item existente (#${existing.id}).`
        );
      }

      // Crear el MantItem
      const newItem = await tx.mantItem.create({
        data: {
          name: itemRequest.suggestedName,
          description: itemRequest.description,
          mantType: itemRequest.mantType,
          categoryId: itemRequest.categoryId,
          type: itemRequest.type,
          tenantId: user.tenantId,
          isGlobal: false,
        },
        include: {
          category: { select: { id: true, name: true } },
        },
      });

      // Actualizar solicitud
      const approved = await tx.mantItemRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          resolvedBy: user.id,
          resolvedAt: new Date(),
          createdMantItemId: newItem.id,
        },
        include: {
          category: { select: { id: true, name: true } },
        },
      });

      return { request: approved, createdItem: newItem };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[MANT_ITEM_REQUEST_PATCH]', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = message.includes('Ya existe') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
