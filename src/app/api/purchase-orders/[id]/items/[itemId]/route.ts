import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import {
  canManagePurchases,
  isSuperAdmin,
  isOwner,
  isManager,
} from '@/lib/permissions';
import { AuditAction } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

const LOCKED_STATUSES = new Set(['COMPLETED', 'CANCELLED']);
const OVERRIDE_REQUIRED_STATUSES = new Set(['APPROVED', 'SENT', 'PARTIAL']);

/**
 * PATCH - Actualizar precio/cantidad/descripción de un ítem de OC.
 *
 * - DRAFT: cualquier usuario con canManagePurchases puede editar.
 * - APPROVED / SENT / PARTIAL: solo OWNER o MANAGER, con nota obligatoria.
 *   Genera AuditLog con before/after + razón.
 * - COMPLETED / CANCELLED: bloqueado.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManagePurchases(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id, itemId } = await params;
    const body = await request.json();
    const { unitPrice, quantity, description, notes } = body;

    // Fetch PO with the specific item
    const purchaseOrder = await tenantPrisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { where: { id: itemId } },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    const item = purchaseOrder.items[0];
    if (!item) {
      return NextResponse.json(
        { error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    if (LOCKED_STATUSES.has(purchaseOrder.status)) {
      return NextResponse.json(
        {
          error: `No se puede modificar una OC en estado ${purchaseOrder.status}`,
        },
        { status: 400 }
      );
    }

    const requiresOverride = OVERRIDE_REQUIRED_STATUSES.has(
      purchaseOrder.status
    );
    if (requiresOverride) {
      if (!isSuperAdmin(user) && !isOwner(user) && !isManager(user)) {
        return NextResponse.json(
          {
            error:
              'Solo OWNER o MANAGER pueden modificar precios después de la aprobación',
          },
          { status: 403 }
        );
      }
      if (!notes?.trim()) {
        return NextResponse.json(
          {
            error:
              'Se requiere nota explicativa para modificar precios en una OC aprobada',
          },
          { status: 400 }
        );
      }
    }

    const newUnitPrice =
      unitPrice !== undefined ? Number(unitPrice) : Number(item.unitPrice);
    const newQuantity =
      quantity !== undefined ? Number(quantity) : Number(item.quantity);
    const newItemTotal = newUnitPrice * newQuantity;

    const result = await tenantPrisma.$transaction(async tx => {
      const updatedItem = await tx.purchaseOrderItem.update({
        where: { id: itemId },
        data: {
          ...(unitPrice !== undefined && { unitPrice: newUnitPrice }),
          ...(quantity !== undefined && { quantity: newQuantity }),
          ...(description !== undefined && { description }),
          total: newItemTotal,
        },
      });

      // Recalculate PO totals
      const allItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
        select: { total: true },
      });
      const newSubtotal = allItems.reduce((sum, i) => sum + Number(i.total), 0);
      const newTaxAmount = newSubtotal * (Number(purchaseOrder.taxRate) / 100);
      const newPoTotal = newSubtotal + newTaxAmount;

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          taxAmount: newTaxAmount,
          total: newPoTotal,
        },
      });

      // AuditLog only for post-approval overrides
      if (requiresOverride) {
        await tx.auditLog.create({
          data: {
            tenantId: user.tenantId,
            actorId: user.id,
            action: AuditAction.MODIFIED,
            resource: 'PurchaseOrderItem',
            resourceId: itemId,
            changes: {
              before: {
                unitPrice: Number(item.unitPrice),
                quantity: Number(item.quantity),
                total: Number(item.total),
              },
              after: {
                unitPrice: newUnitPrice,
                quantity: newQuantity,
                total: newItemTotal,
              },
              reason: notes,
              purchaseOrderId: id,
              purchaseOrderStatus: purchaseOrder.status,
            },
          },
        });
      }

      return updatedItem;
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[PO_ITEM_PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
