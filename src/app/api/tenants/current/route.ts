import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { user } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      id: true,
      name: true,
      logo: true,
      address: true,
      phone: true,
      taxId: true,
      currency: true,
      country: true,
    },
  });

  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

  return NextResponse.json(tenant);
}
