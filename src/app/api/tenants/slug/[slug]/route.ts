
import { NextResponse } from 'next/server';
import { tenantService } from '@/lib/tenant';

interface Params {
  slug: string;
}

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;

  try {
    const result = await tenantService.getTenantBySlug(slug);

    if (result.success) {
      return NextResponse.json(result.tenant);
    } else {
      return NextResponse.json(
        { error: result.error || 'Tenant no encontrado' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Error fetching tenant by slug ${slug}:`, error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
