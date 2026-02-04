import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

// Schema for tenant update validation
const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  country: z.string().length(2).optional(),
  businessType: z.string().max(50).optional(),
  maxVehicles: z.number().int().positive().max(10000).optional()
})

// GET /api/tenants/[id] - Obtener tenant específico (solo el propio tenant)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Users can only access their own tenant
    if (user.tenantId !== id) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver este tenant' },
        { status: 403 }
      )
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
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

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json(
      { error: 'Error al obtener tenant' },
      { status: 500 }
    )
  }
}

// PUT /api/tenants/[id] - Actualizar tenant (solo OWNER del tenant)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Users can only update their own tenant
    if (user.tenantId !== id) {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar este tenant' },
        { status: 403 }
      )
    }

    // Only OWNER role can update tenant settings
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Solo el propietario puede modificar la configuración del tenant' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = updateTenantSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, country, businessType, maxVehicles } = validation.data

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(country && { country: country.toUpperCase() }),
        ...(businessType && { businessType }),
        ...(maxVehicles !== undefined && { maxVehicles })
      }
    })

    return NextResponse.json({
      tenant,
      message: 'Tenant actualizado exitosamente'
    })
  } catch (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json(
      { error: 'Error al actualizar tenant' },
      { status: 500 }
    )
  }
}

// DELETE /api/tenants/[id] - Eliminar tenant (deshabilitado por seguridad)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Users can only access their own tenant
    if (user.tenantId !== id) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar este tenant' },
        { status: 403 }
      )
    }

    // Only OWNER role can delete tenant
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Solo el propietario puede eliminar el tenant' },
        { status: 403 }
      )
    }

    // Verificar que no tenga usuarios o vehículos
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
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

    if (tenant._count.users > 1 || tenant._count.vehicles > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un tenant con otros usuarios o vehículos. Primero elimine todos los datos.' },
        { status: 400 }
      )
    }

    await prisma.tenant.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Tenant eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error deleting tenant:', error)
    return NextResponse.json(
      { error: 'Error al eliminar tenant' },
      { status: 500 }
    )
  }
}
