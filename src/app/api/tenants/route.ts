import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tenantService } from '@/lib/tenant'
import type { InputJsonValue } from '@prisma/client/runtime/library'

// GET /api/tenants - Listar todos los tenants
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        industryPreset: true,
        businessType: true,
        subscriptionStatus: true,
        onboardingCompleted: true,
        maxVehicles: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            vehicles: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ tenants })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Error al obtener tenants' },
      { status: 500 }
    )
  }
}

// POST /api/tenants - Crear nuevo tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, industryPreset } = body

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
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
        industryPreset: industryPreset || null,
        businessType: presetConfig?.businessType || null,
        industrySettings: (presetConfig?.industrySettings as InputJsonValue) || undefined,
        checklistPresets: (presetConfig?.checklistPresets as InputJsonValue) || undefined,
        maintenancePresets: (presetConfig?.maintenancePresets as InputJsonValue) || undefined,
        onboardingCompleted: !!presetConfig,
        onboardingStep: presetConfig ? 4 : 0,
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
    })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { error: 'Error al crear tenant' },
      { status: 500 }
    )
  }
}