import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isOwner, isManager, isSuperAdmin } from '@/lib/permissions';

/**
 * GET /api/maintenance/mant-item-requests
 * Lista solicitudes de items. OWNER/MANAGER ven todas del tenant.
 * TECHNICIAN/PURCHASER ven solo las propias.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status');
    const canManage = isSuperAdmin(user) || isOwner(user) || isManager(user);

    const where = {
      tenantId: user.tenantId,
      ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' }),
      // Si no es management, solo ve sus propias solicitudes
      ...(!canManage && { requestedBy: user.id }),
    };

    const requests = await prisma.mantItemRequest.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('[MANT_ITEM_REQUESTS_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * POST /api/maintenance/mant-item-requests
 * Crear solicitud de nuevo item (cualquier usuario autenticado).
 * OWNER/MANAGER no deberían usar esto - crean directamente.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { suggestedName, description, mantType, categoryId, type, justification, similarItems } =
      await req.json();

    // Validaciones
    if (!suggestedName || suggestedName.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre sugerido debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    if (!mantType || !['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'].includes(mantType)) {
      return NextResponse.json({ error: 'Tipo de mantenimiento inválido' }, { status: 400 });
    }

    if (!categoryId || categoryId <= 0) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
    }

    if (type && !['ACTION', 'PART', 'SERVICE'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de item inválido' }, { status: 400 });
    }

    // Verificar que la categoría existe
    const category = await prisma.mantCategory.findFirst({
      where: {
        id: categoryId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }

    const itemRequest = await prisma.mantItemRequest.create({
      data: {
        tenantId: user.tenantId,
        suggestedName: suggestedName.trim(),
        description: description?.trim() || null,
        mantType,
        categoryId,
        type: type || 'ACTION',
        justification: justification?.trim() || null,
        similarItems: similarItems || null,
        requestedBy: user.id,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(itemRequest, { status: 201 });
  } catch (error) {
    console.error('[MANT_ITEM_REQUESTS_POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
