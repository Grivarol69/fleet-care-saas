import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

// GET /api/hseq/checklists/template?vehicleId=xxx
// Resuelve el ChecklistTemplate activo para un vehículo dado.
// Prioridad: tenant-específico > global. Ambos filtrados por vehicleType del vehículo.
export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const vehicleId = request.nextUrl.searchParams.get('vehicleId');
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'vehicleId requerido' },
        { status: 400 }
      );
    }

    // Validar que el vehículo esté asignado al driver (si el usuario es driver)
    const vehicle = await tenantPrisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, typeId: true, licensePlate: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Si el usuario es DRIVER, verificar asignación activa
    if (user.role === 'DRIVER') {
      const driver = await tenantPrisma.driver.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!driver) {
        return NextResponse.json(
          { error: 'Driver no encontrado' },
          { status: 404 }
        );
      }
      const assignment = await tenantPrisma.vehicleDriver.findFirst({
        where: { vehicleId, driverId: driver.id, status: 'ACTIVE' },
      });
      if (!assignment) {
        return NextResponse.json(
          { error: 'Vehículo no asignado a este conductor' },
          { status: 403 }
        );
      }
    }

    if (!vehicle.typeId) {
      return NextResponse.json(
        { error: 'El vehículo no tiene tipo asignado' },
        { status: 422 }
      );
    }

    // 1. Buscar template tenant-específico activo para este vehicleType
    const tenantTemplate = await tenantPrisma.checklistTemplate.findFirst({
      where: {
        tenantId: user.tenantId,
        vehicleTypeId: vehicle.typeId,
        isActive: true,
      },
      include: {
        items: { orderBy: { order: 'asc' } },
        vehicleType: { select: { id: true, name: true } },
      },
    });

    if (tenantTemplate) {
      return NextResponse.json({ template: tenantTemplate, source: 'tenant' });
    }

    // 2. Fallback: template global para este vehicleType
    const globalTemplate = await tenantPrisma.checklistTemplate.findFirst({
      where: {
        tenantId: null,
        isGlobal: true,
        vehicleTypeId: vehicle.typeId,
        isActive: true,
      },
      include: {
        items: { orderBy: { order: 'asc' } },
        vehicleType: { select: { id: true, name: true } },
      },
    });

    if (globalTemplate) {
      return NextResponse.json({ template: globalTemplate, source: 'global' });
    }

    // 3. Sin template: devolver items por defecto hardcodeados como fallback
    return NextResponse.json({
      template: null,
      source: 'default',
      items: [
        {
          category: 'lights',
          label: 'Luces (delanteras, traseras, emergencia)',
          isRequired: true,
          order: 1,
        },
        {
          category: 'brakes',
          label: 'Frenos (pedal y freno de mano)',
          isRequired: true,
          order: 2,
        },
        {
          category: 'tires',
          label: 'Neumáticos (presión y desgaste visible)',
          isRequired: true,
          order: 3,
        },
        {
          category: 'leaks',
          label: 'Fugas (aceite, combustible)',
          isRequired: true,
          order: 4,
        },
        {
          category: 'seatbelt',
          label: 'Cinturón de seguridad',
          isRequired: true,
          order: 5,
        },
        {
          category: 'extinguisher',
          label: 'Extintor (cargado y accesible)',
          isRequired: true,
          order: 6,
        },
      ],
    });
  } catch (error: unknown) {
    console.error('[HSEQ_CHECKLIST_TEMPLATE_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Error' },
      { status: 500 }
    );
  }
}
