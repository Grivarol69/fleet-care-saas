import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tenants/[id] - Obtener tenant específico
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
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

// PUT /api/tenants/[id] - Actualizar tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, businessType, maxVehicles } = body

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(businessType && { businessType }),
        ...(maxVehicles && { maxVehicles: parseInt(maxVehicles) })
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

// DELETE /api/tenants/[id] - Eliminar tenant
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar que no tenga usuarios o vehículos
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
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

    if (tenant._count.users > 0 || tenant._count.vehicles > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un tenant con usuarios o vehículos' },
        { status: 400 }
      )
    }

    await prisma.tenant.delete({
      where: { id: params.id }
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