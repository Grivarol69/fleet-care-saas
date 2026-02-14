import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManagePurchases } from '@/lib/permissions';

// GET: Listar items de inventario del tenant
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const masterPartId = searchParams.get('masterPartId');

    const whereClause: any = {
      tenantId: user.tenantId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (masterPartId) {
      whereClause.masterPartId = masterPartId;
    }

    if (search) {
      whereClause.OR = [
        {
          masterPart: {
            description: { contains: search, mode: 'insensitive' },
          },
        },
        {
          masterPart: {
            code: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        masterPart: true,
      },
      orderBy: {
        quantity: 'desc',
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// POST: Crear nuevo item de inventario (Stock Inicial)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canManagePurchases(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      masterPartId,
      warehouse,
      quantity,
      minStock,
      maxStock,
      unitCost,
      location,
    } = body;

    if (!masterPartId || quantity === undefined || !unitCost) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const totalValue = Number(quantity) * Number(unitCost);

    // Usamos una transacción para asegurar consistencia
    const result = await prisma.$transaction(async tx => {
      // 1. Crear el Item de Inventario
      const newItem = await tx.inventoryItem.create({
        data: {
          tenantId: user.tenantId,
          masterPartId,
          warehouse: warehouse || 'PRINCIPAL',
          location,
          quantity,
          minStock: minStock || 0,
          maxStock: maxStock,
          averageCost: unitCost, // Al inicio, el costo promedio es el costo unitario
          totalValue,
          status: Number(quantity) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
        },
      });

      // 2. Registrar el Movimiento (INITIAL_STOCK o ADJUSTMENT_IN)
      await tx.inventoryMovement.create({
        data: {
          tenantId: user.tenantId,
          inventoryItemId: newItem.id,
          movementType: 'ADJUSTMENT_IN', // Stock inicial se considera un ajuste de entrada
          quantity,
          unitCost,
          totalCost: totalValue,
          previousStock: 0,
          newStock: quantity,
          previousAvgCost: 0,
          newAvgCost: unitCost,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: 'INITIAL_LOAD',
          performedBy: user.id,
        },
      });

      return newItem;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
