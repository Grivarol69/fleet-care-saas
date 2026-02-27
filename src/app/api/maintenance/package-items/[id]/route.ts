import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageMaintenancePrograms } from '@/lib/permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageMaintenancePrograms(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      triggerKm,
      priority,
      estimatedTime,
      technicalNotes,
      isOptional,
      order,
    } = body;

    // Validaciones básicas
    if (!triggerKm) {
      return NextResponse.json(
        { error: 'triggerKm is required' },
        { status: 400 }
      );
    }

    // Verificar que el package item existe
    const existingItem = await prisma.packageItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Package item not found' },
        { status: 404 }
      );
    }

    const updatedPackageItem = await prisma.packageItem.update({
      where: { id },
      data: {
        triggerKm,
        priority: priority || 'MEDIUM',
        estimatedTime: estimatedTime ? parseFloat(estimatedTime) : null,
        technicalNotes,
        isOptional: isOptional ?? existingItem.isOptional,
        order: order ?? existingItem.order,
      },
      include: {
        mantItem: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPackageItem);
  } catch (error) {
    console.error('[PACKAGE_ITEM_PUT]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageMaintenancePrograms(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificar que el package item existe
    const existingItem = await prisma.packageItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Package item not found' },
        { status: 404 }
      );
    }

    await prisma.packageItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PACKAGE_ITEM_DELETE]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const packageItem = await prisma.packageItem.findUnique({
      where: { id },
      include: {
        mantItem: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!packageItem) {
      return NextResponse.json(
        { error: 'Package item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(packageItem);
  } catch (error) {
    console.error('[PACKAGE_ITEM_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
