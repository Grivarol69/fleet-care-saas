import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - Obtener línea específica por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id } = await params;
        const line = await prisma.vehicleLine.findUnique({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            },
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!line) {
            return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
        }

        // Mapear para incluir brandName
        const mappedLine = {
            id: line.id,
            name: line.name,
            brandId: line.brandId,
            brandName: line.brand?.name || 'Sin marca'
        };

        return NextResponse.json(mappedLine);
    } catch (error) {
        console.error("[LINE_GET]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// PUT - Actualizar línea específica (solo SUPER_ADMIN)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar permisos
        const { requireSuperAdmin } = await import("@/lib/permissions");
        try {
            requireSuperAdmin(user);
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 403 }
            );
        }

        const { id } = await params;

        const { name, brandId } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        if (!brandId) {
            return NextResponse.json({ error: "La marca es requerida" }, { status: 400 });
        }

        // Verificar que la línea existe y pertenece al tenant
        const existingLine = await prisma.vehicleLine.findUnique({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            }
        });

        if (!existingLine) {
            return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
        }

        // Verificar que la marca existe y pertenece al tenant
        const brand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(brandId),
                tenantId: user.tenantId
            }
        });

        if (!brand) {
            return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
        }

        // Verificar que no exista otra línea con el mismo nombre y marca
        const duplicateLine = await prisma.vehicleLine.findFirst({
            where: {
                tenantId: user.tenantId,
                brandId: parseInt(brandId),
                name: name.trim(),
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (duplicateLine) {
            return NextResponse.json({ error: "La línea ya existe para esta marca" }, { status: 409 });
        }

        const updatedLine = await prisma.vehicleLine.update({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            },
            data: {
                name: name.trim(),
                brandId: parseInt(brandId),
            },
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            }
        });

        // Mapear para incluir brandName
        const mappedLine = {
            id: updatedLine.id,
            name: updatedLine.name,
            brandId: updatedLine.brandId,
            brandName: updatedLine.brand?.name || 'Sin marca'
        };

        return NextResponse.json(mappedLine);
    } catch (error) {
        console.log("[LINE_PUT]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// PATCH - Actualizar línea específica (solo SUPER_ADMIN)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar permisos
        const { requireSuperAdmin } = await import("@/lib/permissions");
        try {
            requireSuperAdmin(user);
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 403 }
            );
        }

        const { id } = await params;

        const body = await req.json();
        const { name, brandId } = body;

        // Verificar que la línea existe y pertenece al tenant
        const existingLine = await prisma.vehicleLine.findUnique({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            }
        });

        if (!existingLine) {
            return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
        }

        // Validar nombre si se proporciona
        if (name !== undefined && (!name || name.trim() === '')) {
            return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
        }

        // Verificar que la marca existe si se proporciona
        if (brandId !== undefined) {
            const brand = await prisma.vehicleBrand.findUnique({
                where: {
                    id: parseInt(brandId),
                    tenantId: user.tenantId
                }
            });

            if (!brand) {
                return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
            }
        }

        // Preparar datos para actualizar (solo los campos proporcionados)
        const updateData: { name?: string; brandId?: number } = {};
        
        if (name !== undefined) {
            updateData.name = name.trim();
        }
        
        if (brandId !== undefined) {
            updateData.brandId = parseInt(brandId);
        }

        // Verificar que no exista otra línea con el mismo nombre y marca
        if (name !== undefined || brandId !== undefined) {
            const checkName = name !== undefined ? name.trim() : existingLine.name;
            const checkBrandId = brandId !== undefined ? parseInt(brandId) : existingLine.brandId;

            const duplicateLine = await prisma.vehicleLine.findFirst({
                where: {
                    tenantId: user.tenantId,
                    brandId: checkBrandId,
                    name: checkName,
                    id: {
                        not: parseInt(id)
                    }
                }
            });

            if (duplicateLine) {
                return NextResponse.json({ error: "La línea ya existe para esta marca" }, { status: 409 });
            }
        }

        const updatedLine = await prisma.vehicleLine.update({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            },
            data: updateData,
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            }
        });

        // Mapear para incluir brandName
        const mappedLine = {
            id: updatedLine.id,
            name: updatedLine.name,
            brandId: updatedLine.brandId,
            brandName: updatedLine.brand?.name || 'Sin marca'
        };

        return NextResponse.json(mappedLine);
    } catch (error) {
        console.log("[LINE_PATCH]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// DELETE - Eliminar línea específica (solo SUPER_ADMIN)
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar permisos
        const { requireSuperAdmin } = await import("@/lib/permissions");
        try {
            requireSuperAdmin(user);
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 403 }
            );
        }

        const { id } = await params;

        // Verificar que la línea existe y pertenece al tenant
        const existingLine = await prisma.vehicleLine.findUnique({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            }
        });

        if (!existingLine) {
            return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
        }

        // Verificar que no tenga vehículos dependientes
        const hasVehicles = await prisma.vehicle.findFirst({
            where: {
                lineId: parseInt(id),
                tenantId: user.tenantId
            }
        });

        // Verificar templates de mantenimiento
        const hasMantTemplates = await prisma.maintenanceTemplate.findFirst({
            where: {
                vehicleLineId: parseInt(id),
                tenantId: user.tenantId
            }
        });

        if (hasVehicles || hasMantTemplates) {
            return NextResponse.json({ error: "No se puede eliminar la línea porque tiene vehículos o plantillas de mantenimiento asociadas" }, { status: 409 });
        }

        await prisma.vehicleLine.delete({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[LINE_DELETE]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}