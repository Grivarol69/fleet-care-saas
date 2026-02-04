import { NextResponse } from 'next/server';
import { tenantService } from '@/lib/tenant';
import { getCurrentUser } from '@/lib/auth';

interface Params {
  slug: string;
}

// GET /api/tenants/slug/[slug] - Obtener tenant por slug (solo el propio tenant)
export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const result = await tenantService.getTenantBySlug(slug);

    if (!result.success || !result.tenant) {
      return NextResponse.json(
        { error: result.error || 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Users can only access their own tenant
    if (user.tenantId !== result.tenant.id) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver este tenant' },
        { status: 403 }
      );
    }

    return NextResponse.json(result.tenant);
  } catch (error) {
    console.error(`Error fetching tenant by slug ${slug}:`, error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
