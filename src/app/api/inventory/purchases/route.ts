import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { AlertType, AlertLevel, AlertStatus } from '@prisma/client';
import { canManagePurchases } from '@/lib/permissions';

// Schema validation
const purchaseSchema = z.object({
  invoiceNumber: z.string().min(1),
  supplierId: z.string(),
  invoiceDate: z.string(), // ISO Date
  items: z.array(
    z.object({
      masterPartId: z.string(),
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().min(0),
      taxRate: z.number().default(0),
    })
  ),
});

export async function POST(req: Request) {
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

    const json = await req.json();
    const body = purchaseSchema.parse(json);

    // Calculate totals
    const subtotal = body.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = body.items.reduce(
      (sum, item) =>
        sum + item.quantity * item.unitPrice * (item.taxRate / 100),
      0
    );
    const totalAmount = subtotal + taxAmount;

    // Transaction: Invoice + Inventory Updates + Movements + Price History
    const result = await tenantPrisma.$transaction(async tx => {
      // 1. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          tenantId: user.tenantId,
          invoiceNumber: body.invoiceNumber,
          supplierId: body.supplierId,
          invoiceDate: new Date(body.invoiceDate),
          status: 'APPROVED', // Direct purchase implies approval usually, or PENDING if workflow requires it. Let's say APPROVED for simplicity of stock entry.
          subtotal,
          taxAmount,
          totalAmount,
          registeredBy: user.id,
        },
      });

      // 2. Process Items
      for (const item of body.items) {
        const lineTotal =
          item.quantity * item.unitPrice * (1 + item.taxRate / 100);

        // 2.1 Create InvoiceItem
        await tx.invoiceItem.create({
          data: {
            tenantId: user.tenantId,
            invoiceId: invoice.id,
            masterPartId: item.masterPartId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
            taxRate: item.taxRate,
            taxAmount: item.quantity * item.unitPrice * (item.taxRate / 100),
            total: lineTotal,
          },
        });

        // 2.2 Update Inventory (Stock Ingress)
        // Find existing inventory item or create
        let invItem = await tx.inventoryItem.findFirst({
          where: {
            masterPartId: item.masterPartId,
            warehouse: 'PRINCIPAL', // Default warehouse
          },
        });

        let previousStock = 0;
        let previousAvgCost = 0;

        if (invItem) {
          previousStock = Number(invItem.quantity);
          previousAvgCost = Number(invItem.averageCost);

          // Calculate new Weighted Average Cost
          const currentTotalValue = Number(invItem.totalValue);
          const ingressTotalValue = item.quantity * item.unitPrice; // Use NET price for valuation usually
          const newTotalQuantity = previousStock + item.quantity;
          const newTotalValue = currentTotalValue + ingressTotalValue;
          const newAvgCost =
            newTotalQuantity > 0 ? newTotalValue / newTotalQuantity : 0;

          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: {
              quantity: newTotalQuantity,
              totalValue: newTotalValue,
              averageCost: newAvgCost,
            },
          });

          // Update the object in memory so Movement gets the new value
          invItem.quantity = newTotalQuantity as any; // any because Prisma Decimal vs JS number/type
          invItem.averageCost = newAvgCost as any;
        } else {
          // Create new
          invItem = await tx.inventoryItem.create({
            data: {
              tenantId: user.tenantId,
              masterPartId: item.masterPartId,
              warehouse: 'PRINCIPAL',
              quantity: item.quantity,
              averageCost: item.unitPrice,
              totalValue: item.quantity * item.unitPrice,
            },
          });
        }

        // 2.3 Create Movement
        await tx.inventoryMovement.create({
          data: {
            tenantId: user.tenantId,
            inventoryItemId: invItem.id,
            movementType: 'PURCHASE',
            quantity: item.quantity,
            unitCost: item.unitPrice,
            totalCost: item.quantity * item.unitPrice,
            previousStock: previousStock,
            newStock: previousStock + item.quantity,
            previousAvgCost: previousAvgCost,
            newAvgCost: invItem.averageCost
              ? Number(invItem.averageCost)
              : item.unitPrice,
            referenceType: 'INVOICE',
            referenceId: invoice.id,
            performedBy: user.id,
          },
        });

        // 2.4 Update Price History (for Analytics)
        await tx.partPriceHistory.create({
          data: {
            tenantId: user.tenantId,
            masterPartId: item.masterPartId,
            supplierId: body.supplierId,
            price: item.unitPrice,
            quantity: item.quantity,
            invoiceId: invoice.id,
            purchasedBy: user.id,
          },
        });

        // 2.5 Watchdog (Price Alert)
        const masterPart = await tx.masterPart.findUnique({
          where: { id: item.masterPartId },
        });
        if (masterPart && masterPart.referencePrice) {
          const refPrice = Number(masterPart.referencePrice);
          if (item.unitPrice > refPrice * 1.1) {
            // 10% tolerance
            await tx.financialAlert.create({
              data: {
                tenantId: user.tenantId,
                invoiceId: invoice.id,
                masterPartId: item.masterPartId,
                type: AlertType.PRICE_DEVIATION,
                severity: AlertLevel.FINANCIAL,
                message: `Precio de compra (${item.unitPrice}) excede referencia (${refPrice}) en >10%`,
                details: {
                  expected: refPrice,
                  actual: item.unitPrice,
                  deviation: item.unitPrice - refPrice,
                },
                status: AlertStatus.PENDING,
              },
            });
          }
        }
      }

      return invoice;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }
    console.error('[INVENTORY_PURCHASE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const supplierId = searchParams.get('supplierId');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const purchases = await tenantPrisma.invoice.findMany({
      where: {
        tenantId: user.tenantId,
        ...(includeDeleted ? {} : { status: { not: 'CANCELLED' } }),
        ...(search
          ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
          : {}),
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        supplier: true,
        items: {
          include: {
            masterPart: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error('[INVENTORY_PURCHASE_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
