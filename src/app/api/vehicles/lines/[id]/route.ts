import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP


// GET - Obtener línea específica por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const line = await prisma.vehicleLine.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
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
            return new NextResponse("Line not found", { status: 404 });
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PUT - Actualizar línea específica (reemplazo completo)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Verificar autenticación con Supabase SSR (método actualizado)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name, brandId } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        if (!brandId) {
            return new NextResponse("Brand ID is required", { status: 400 });
        }

        // Verificar que la línea existe y pertenece al tenant
        const existingLine = await prisma.vehicleLine.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingLine) {
            return new NextResponse("Line not found", { status: 404 });
        }

        // Verificar que la marca existe y pertenece al tenant
        const brand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(brandId),
                tenantId: TENANT_ID
            }
        });

        if (!brand) {
            return new NextResponse("Brand not found", { status: 404 });
        }

        // Verificar que no exista otra línea con el mismo nombre y marca 
        // (excluyendo la línea actual)
        const duplicateLine = await prisma.vehicleLine.findFirst({
            where: {
                tenantId: TENANT_ID,
                brandId: parseInt(brandId),
                name: name.trim(),
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (duplicateLine) {
            return new NextResponse("Line already exists for this brand", { status: 409 });
        }

        const updatedLine = await prisma.vehicleLine.update({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PATCH - Actualizar línea específica (actualización parcial)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Verificar autenticación con Supabase SSR (método actualizado)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { name, brandId } = body;

        // Verificar que la línea existe y pertenece al tenant
        const existingLine = await prisma.vehicleLine.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingLine) {
            return new NextResponse("Line not found", { status: 404 });
        }

        // Validar nombre si se proporciona
        if (name !== undefined && (!name || name.trim() === '')) {
            return new NextResponse("Name cannot be empty", { status: 400 });
        }

        // Verificar que la marca existe si se proporciona
        if (brandId !== undefined) {
            const brand = await prisma.vehicleBrand.findUnique({
                where: {
                    id: parseInt(brandId),
                    tenantId: TENANT_ID
                }
            });

            if (!brand) {
                return new NextResponse("Brand not found", { status: 404 });
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
        // (excluyendo la línea actual) solo si se está cambiando alguno de estos campos
        if (name !== undefined || brandId !== undefined) {
            const checkName = name !== undefined ? name.trim() : existingLine.name;
            const checkBrandId = brandId !== undefined ? parseInt(brandId) : existingLine.brandId;
            
            const duplicateLine = await prisma.vehicleLine.findFirst({
                where: {
                    tenantId: TENANT_ID,
                    brandId: checkBrandId,
                    name: checkName,
                    id: {
                        not: parseInt(id)
                    }
                }
            });

            if (duplicateLine) {
                return new NextResponse("Line already exists for this brand", { status: 409 });
            }
        }

        const updatedLine = await prisma.vehicleLine.update({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE - Eliminar línea específica
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Verificar autenticación con Supabase SSR (método actualizado)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verificar que la línea existe y pertenece al tenant
        const existingLine = await prisma.vehicleLine.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingLine) {
            return new NextResponse("Line not found", { status: 404 });
        }

        // ✅ CORREGIDO: Verificar que no tenga vehículos dependientes
        // Una línea no puede eliminarse si hay vehículos que la usan
        const hasVehicles = await prisma.vehicle.findFirst({
            where: {
                lineId: parseInt(id), // ← Cambié de brandId a lineId
                tenantId: TENANT_ID
            }
        });

        // ✅ CORREGIDO: Verificar templates de mantenimiento que usan esta línea
        const hasMantTemplates = await prisma.maintenanceTemplate.findFirst({
            where: {
                vehicleLineId: parseInt(id), // ← Cambié de brandId a vehicleLineId
                tenantId: TENANT_ID
            }
        });

        if (hasVehicles || hasMantTemplates) {
            return new NextResponse("Cannot delete line with existing vehicles or maintenance templates", { status: 409 });
        }

        await prisma.vehicleLine.delete({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[LINE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}