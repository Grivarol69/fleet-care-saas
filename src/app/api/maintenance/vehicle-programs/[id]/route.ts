import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from '@/lib/auth';

// GET - Obtener programa específico por ID
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const programId = parseInt(params.id);

    const program = await prisma.vehicleMantProgram.findUnique({
      where: {
        id: programId,
        tenantId: user.tenantId
      },
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true
          }
        },
        packages: {
          include: {
            items: {
              include: {
                mantItem: true,
                technician: true,
                provider: true
              },
              orderBy: [
                { status: 'asc' },
                { order: 'asc' }
              ]
            }
          },
          orderBy: [
            { packageType: 'asc' },
            { triggerKm: 'asc' }
          ]
        }
      }
    });

    if (!program) {
      return new NextResponse("Program not found", { status: 404 });
    }

    return NextResponse.json(program);
  } catch (error) {
    console.error("[VEHICLE_MANT_PROGRAM_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PUT - Actualizar programa de mantenimiento
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const programId = parseInt(params.id);
    const body = await req.json();

    const {
      name,
      description,
      nextMaintenanceKm,
      nextMaintenanceDesc,
      isActive,
      notes
    } = body;

    // Verificar que el programa existe
    const existingProgram = await prisma.vehicleMantProgram.findUnique({
      where: {
        id: programId,
        tenantId: user.tenantId
      }
    });

    if (!existingProgram) {
      return new NextResponse("Program not found", { status: 404 });
    }

    // Actualizar el programa
    const updatedProgram = await prisma.vehicleMantProgram.update({
      where: { id: programId },
      data: {
        name,
        description,
        nextMaintenanceKm,
        nextMaintenanceDesc,
        isActive,
        notes,
        status: isActive ? 'ACTIVE' : 'INACTIVE'
      }
    });

    // Retornar programa actualizado con relaciones
    const result = await prisma.vehicleMantProgram.findUnique({
      where: { id: updatedProgram.id },
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true
          }
        },
        packages: {
          include: {
            items: {
              include: {
                mantItem: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[VEHICLE_MANT_PROGRAM_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Eliminar programa de mantenimiento
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const programId = parseInt(params.id);

    // Verificar que el programa existe
    const existingProgram = await prisma.vehicleMantProgram.findUnique({
      where: {
        id: programId,
        tenantId: user.tenantId
      },
      include: {
        packages: {
          include: {
            items: true
          }
        }
      }
    });

    if (!existingProgram) {
      return new NextResponse("Program not found", { status: 404 });
    }

    // Verificar que no hay items en progreso
    const itemsInProgress = existingProgram.packages.some(pkg =>
      pkg.items.some(item => item.status === 'IN_PROGRESS')
    );

    if (itemsInProgress) {
      return new NextResponse("Cannot delete program with items in progress", { status: 400 });
    }

    // Eliminar en cascada (Prisma debería manejar esto automáticamente)
    await prisma.vehicleMantProgram.delete({
      where: { id: programId }
    });

    return NextResponse.json({ message: "Program deleted successfully" });
  } catch (error) {
    console.error("[VEHICLE_MANT_PROGRAM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}