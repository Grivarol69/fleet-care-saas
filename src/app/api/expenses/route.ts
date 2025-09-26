import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación para crear expense
const createExpenseSchema = z.object({
  workOrderId: z.number(),
  expenseType: z.enum(['PARTS', 'LABOR', 'TRANSPORT', 'TOOLS', 'MATERIALS', 'OTHER']),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  vendor: z.string().min(1).max(200),
  invoiceNumber: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  expenseDate: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('workOrderId');
    const vehicleId = searchParams.get('vehicleId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros
    const where: any = {
      workOrder: {
        tenantId: session.user.tenantId,
      },
    };

    if (workOrderId) {
      where.workOrderId = parseInt(workOrderId);
    }

    if (vehicleId) {
      where.workOrder.vehicleId = parseInt(vehicleId);
    }

    const expenses = await prisma.workOrderExpense.findMany({
      where,
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
      orderBy: {
        expenseDate: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.workOrderExpense.count({ where });

    return NextResponse.json({
      expenses,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createExpenseSchema.parse(body);

    // Verificar que la WorkOrder pertenece al tenant del usuario
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: validatedData.workOrderId,
        tenantId: session.user.tenantId,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // Crear el expense
    const expense = await prisma.workOrderExpense.create({
      data: {
        ...validatedData,
        expenseDate: validatedData.expenseDate
          ? new Date(validatedData.expenseDate)
          : new Date(),
        recordedBy: session.user.id,
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

    // Registrar en audit log
    await prisma.expenseAuditLog.create({
      data: {
        workOrderId: validatedData.workOrderId,
        action: 'CREATED',
        newValue: {
          expenseId: expense.id,
          expenseType: expense.expenseType,
          amount: expense.amount,
          vendor: expense.vendor,
        },
        performedBy: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}