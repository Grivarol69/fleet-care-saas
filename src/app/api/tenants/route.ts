import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tenantService } from '@/lib/tenant'
import { getCurrentUser } from '@/lib/auth'
import type { InputJsonValue } from '@prisma/client/runtime/library'

// GET /api/tenants - Listar todos los tenants (solo OWNER de su propio tenant)
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Users can only see their own tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        country: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            vehicles: true
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ tenants: [tenant] })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Error al obtener tenants' },
      { status: 500 }
    )
  }
}

// POST /api/tenants - Crear nuevo tenant (solo usuarios autenticados sin tenant)
export async function POST(request: NextRequest) {
  try {
    // Note: This endpoint is for tenant creation during onboarding
    // It relies on Clerk auth but user may not have a tenant yet
    const body = await request.json()
    const { name, industryPreset } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'El nombre es requerido y debe ser texto' },
        { status: 400 }
      )
    }

    if (name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 2 y 100 caracteres' },
        { status: 400 }
      )
    }

    // Generar slug único
    const slug = await tenantService.generateUniqueSlug(name)

    // Obtener configuración del preset
    const presetConfig = industryPreset ? tenantService.getIndustryPreset(industryPreset) : null

    // Crear tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        slug: slug,
        ...(presetConfig && {
          settings: {
            industrySettings: presetConfig.industrySettings,
            checklistPresets: presetConfig.checklistPresets,
            maintenancePresets: presetConfig.maintenancePresets
          } as InputJsonValue
        })
      }
    })

    // Si hay preset, crear datos iniciales
    if (presetConfig) {
      await prisma.$transaction(async (tx) => {
        await tenantService.createInitialTenantData(tx, tenant.id)
      })
    }

    return NextResponse.json({
      tenant,
      message: 'Tenant creado exitosamente'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { error: 'Error al crear tenant' },
      { status: 500 }
    )
  }
}
