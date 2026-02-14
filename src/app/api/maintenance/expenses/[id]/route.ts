import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ApprovalStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import { canExecuteWorkOrders } from '@/lib/permissions';

const updateExpenseSchema = z.object({
  status: z.nativeEnum(ApprovalStatus),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canExecuteWorkOrders(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = params;
    const json = await req.json();
    const body = updateExpenseSchema.parse(json);

    // 1. Fetch Expense to verify Tenant
    const expense = await prisma.workOrderExpense.findUnique({
      where: { id },
      include: { workOrder: true },
    });

    if (!expense) {
      return new NextResponse('Not Found', { status: 404 });
    }

    if (expense.workOrder.tenantId !== user.tenantId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 2. Role Check
    const allowedRoles: UserRole[] = [
      UserRole.PURCHASER,
      UserRole.MANAGER,
      UserRole.OWNER,
      UserRole.SUPER_ADMIN,
    ];
    if (!allowedRoles.includes(user.role as UserRole)) {
      return new NextResponse('Forbidden: Insufficient permissions', {
        status: 403,
      });
    }

    // 3. Update Status
    const updated = await prisma.workOrderExpense.update({
      where: { id },
      data: {
        status: body.status,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }
    console.error('[EXPENSE_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
