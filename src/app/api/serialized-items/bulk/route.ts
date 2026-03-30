import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canCreateSerializedAssets } from '@/lib/permissions';
import { SERIALIZED_ITEM_TYPES } from '@/lib/serialized-asset-constants';

// POST /api/serialized-items/bulk
export async function POST(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canCreateSerializedAssets(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { invoiceItemId, type, batchNumber, items } = body;

    // Validate type
    if (!Object.values(SERIALIZED_ITEM_TYPES).includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items must be a non-empty array' },
        { status: 400 }
      );
    }

    // Verify invoiceItem belongs to tenant
    const invoiceItem = await tenantPrisma.invoiceItem.findFirst({
      where: { id: invoiceItemId },
    });
    if (!invoiceItem)
      return NextResponse.json(
        { error: 'InvoiceItem not found' },
        { status: 404 }
      );

    // Check quantity limit
    const quantity = Number(invoiceItem.quantity);
    if (items.length > quantity) {
      return NextResponse.json({ error: 'EXCEEDS_QUANTITY' }, { status: 422 });
    }

    // Check for duplicates within request
    const serialNumbers: string[] = items.map(
      (i: { serialNumber: string }) => i.serialNumber
    );
    const uniqueSerials = new Set(serialNumbers);
    if (uniqueSerials.size !== serialNumbers.length) {
      return NextResponse.json(
        { error: 'DUPLICATE_SERIAL_IN_REQUEST' },
        { status: 422 }
      );
    }

    // Check for existing serial numbers in tenant
    const existing = await tenantPrisma.serializedItem.findMany({
      where: { serialNumber: { in: serialNumbers } },
      select: { serialNumber: true },
    });
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'DUPLICATE_SERIAL',
          duplicates: existing.map(e => e.serialNumber),
        },
        { status: 422 }
      );
    }

    // Transaction: create items + ALTA events
    const result = await tenantPrisma.$transaction(async tx => {
      const created: string[] = [];
      for (const item of items as Array<{
        serialNumber: string;
        specs?: Record<string, unknown>;
      }>) {
        const serializedItem = await tx.serializedItem.create({
          data: {
            tenantId: user.tenantId,
            invoiceItemId,
            type,
            batchNumber: batchNumber ?? null,
            serialNumber: item.serialNumber,
            specs: item.specs
              ? (item.specs as import('@prisma/client').Prisma.InputJsonObject)
              : undefined,
            status: 'IN_STOCK',
          },
        });
        await tx.serializedItemEvent.create({
          data: {
            tenantId: user.tenantId,
            serializedItemId: serializedItem.id,
            eventType: 'ALTA',
            performedById: user.id,
          },
        });
        created.push(serializedItem.id);
      }
      return created;
    });

    return NextResponse.json(
      { created: result.length, ids: result },
      { status: 201 }
    );
  } catch (error) {
    console.error('[SERIALIZED_ITEMS_BULK_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
