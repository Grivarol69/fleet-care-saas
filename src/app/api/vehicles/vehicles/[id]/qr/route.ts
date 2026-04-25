import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import QRCode from 'qrcode';
import { headers } from 'next/headers';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicle = await tenantPrisma.vehicle.findFirst({
      where: { id },
      select: { id: true, licensePlate: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    const headersList = await headers();
    const host = headersList.get('host') ?? 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const checkinUrl = `${protocol}://${host}/home/checkin?qr=${vehicle.id}`;

    const pngBuffer = await QRCode.toBuffer(checkinUrl, {
      type: 'png',
      width: 512,
      margin: 2,
      color: { dark: '#1E3A5F', light: '#FFFFFF' },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-${vehicle.licensePlate}.png"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[VEHICLE_QR_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
