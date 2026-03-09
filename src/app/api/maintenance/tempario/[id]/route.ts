import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { requireMasterDataMutationPermission } from '@/lib/permissions';
import { Prisma } from '@prisma/client';

const PROCEDURE_INCLUDE = {
  mantItem: { select: { id: true, name: true, type: true } },
  vehicleBrand: { select: { id: true, name: true } },
  vehicleLine: { select: { id: true, name: true } },
} satisfies Prisma.MantItemProcedureInclude;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const procedure = await tenantPrisma.mantItemProcedure.findFirst({
      where: { id, OR: [{ isGlobal: true }, { tenantId: user.tenantId }] },
      include: PROCEDURE_INCLUDE,
    });

    if (!procedure)
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(procedure);
  } catch (error) {
    console.error('[TEMPARIO_ID_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await tenantPrisma.mantItemProcedure.findUnique({
      where: { id },
    });
    if (!existing)
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    try {
      requireMasterDataMutationPermission(user, existing);
    } catch (permError) {
      return NextResponse.json(
        { error: (permError as Error).message },
        { status: 403 }
      );
    }

    const { vehicleBrandId, vehicleLineId } = await req.json();
    const data: Prisma.MantItemProcedureUpdateInput = {};

    if (vehicleBrandId !== undefined)
      data.vehicleBrand = vehicleBrandId
        ? { connect: { id: vehicleBrandId } }
        : { disconnect: true };
    if (vehicleLineId !== undefined)
      data.vehicleLine = vehicleLineId
        ? { connect: { id: vehicleLineId } }
        : { disconnect: true };

    const updated = await tenantPrisma.mantItemProcedure.update({
      where: { id },
      data,
      include: PROCEDURE_INCLUDE,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[TEMPARIO_ID_PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await tenantPrisma.mantItemProcedure.findUnique({
      where: { id },
    });
    if (!existing)
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    try {
      requireMasterDataMutationPermission(user, existing);
    } catch (permError) {
      return NextResponse.json(
        { error: (permError as Error).message },
        { status: 403 }
      );
    }

    await tenantPrisma.mantItemProcedure.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TEMPARIO_ID_DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
