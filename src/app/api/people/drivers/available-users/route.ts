import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await tenantPrisma.user.findMany({
      where: {
        role: 'DRIVER',
        driverProfile: null,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('[DRIVER_AVAILABLE_USERS_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
