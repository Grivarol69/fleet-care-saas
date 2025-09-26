import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateExpenseSchema = z.object({
  expenseType: z.enum(['PARTS', 'LABOR', 'TRANSPORT', 'TOOLS', 'MATERIALS', 'OTHER']).optional(),
  description: z.string().min(1).max(500).optional(),
  amount: z.number().positive().optional(),
  vendor: z.string().min(1).max(200).optional(),
  invoiceNumber: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  expenseDate: z.string().datetime().optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const expense = await prisma.workOrderExpense.findFirst({
      where: {
        id: params.id,
        workOrder: {
          tenantId: session.user.tenantId,
        },
      },
      include: {
        workOrder: {
          include: {
            vehicle: {
              select: {
                licensePlate: true,
                brand: true,
                model: true,
              },
            },
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Gasto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateExpenseSchema.parse(body);

    // Verificar que el expense existe y pertenece al tenant
    const existingExpense = await prisma.workOrderExpense.findFirst({
      where: {
        id: params.id,
        workOrder: {
          tenantId: session.user.tenantId,
        },
      },
      include: {
        workOrder: true,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Gasto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos para modificar
    // Solo el creador o admin/supervisor pueden modificar
    const canModify =
      existingExpense.recordedBy === session.user.id ||
      ['ADMIN', 'SUPERVISOR'].includes(session.user.role);

    if (!canModify) {
      return NextResponse.json(
        { error: 'Sin permisos para modificar este gasto' },
        { status: 403 }
      );
    }

    // Guardar valores anteriores para audit
    const previousValues = {
      expenseType: existingExpense.expenseType,
      description: existingExpense.description,
      amount: existingExpense.amount,
      vendor: existingExpense.vendor,
      invoiceNumber: existingExpense.invoiceNumber,
      receiptUrl: existingExpense.receiptUrl,
      expenseDate: existingExpense.expenseDate,
    };

    // Actualizar expense
    const updatedExpense = await prisma.workOrderExpense.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        expenseDate: validatedData.expenseDate
          ? new Date(validatedData.expenseDate)
          : undefined,
      },
      include: {
        workOrder: {
          include: {
            vehicle: {
              select: {
                licensePlate: true,
                brand: true,
                model: true,
              },
            },
          },
        },
      },
    });

    // Registrar modificación en audit log
    await prisma.expenseAuditLog.create({
      data: {
        workOrderId: existingExpense.workOrderId,
        action: 'MODIFIED',
        previousValue: previousValues,
        newValue: {
          expenseId: updatedExpense.id,
          expenseType: updatedExpense.expenseType,
          description: updatedExpense.description,
          amount: updatedExpense.amount,
          vendor: updatedExpense.vendor,
        },
        performedBy: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el expense existe y pertenece al tenant
    const existingExpense = await prisma.workOrderExpense.findFirst({
      where: {
        id: params.id,
        workOrder: {
          tenantId: session.user.tenantId,
        },
      },
      include: {
        workOrder: true,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Gasto no encontrado' },
        { status: 404 }
      );
    }

    // Solo admin o supervisor pueden eliminar gastos
    if (!['ADMIN', 'SUPERVISOR'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para eliminar gastos' },
        { status: 403 }
      );
    }

    // Registrar eliminación en audit log antes de eliminar
    await prisma.expenseAuditLog.create({
      data: {
        workOrderId: existingExpense.workOrderId,
        action: 'CANCELLED',
        previousValue: {
          expenseId: existingExpense.id,
          expenseType: existingExpense.expenseType,
          description: existingExpense.description,
          amount: existingExpense.amount,
          vendor: existingExpense.vendor,
        },
        newValue: { deleted: true },
        performedBy: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Eliminar expense
    await prisma.workOrderExpense.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Gasto eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}