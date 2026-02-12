import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { requireMasterDataMutationPermission } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/maintenance/vehicle-parts/[id]
 * Obtener un MantItemVehiclePart por ID.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id } = await params;
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const item = await prisma.mantItemVehiclePart.findFirst({
            where: {
                id: itemId,
                OR: [
                    { isGlobal: true },
                    { tenantId: user.tenantId },
                ],
            },
            include: {
                mantItem: { select: { id: true, name: true, type: true, mantType: true } },
                vehicleBrand: { select: { id: true, name: true } },
                vehicleLine: { select: { id: true, name: true } },
                masterPart: { select: { id: true, code: true, description: true, unit: true, referencePrice: true } },
            },
        });

        if (!item) {
            return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error("[VEHICLE_PARTS_GET_ID]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * PUT /api/maintenance/vehicle-parts/[id]
 * Editar un vínculo MantItemVehiclePart existente.
 * OWNER/MANAGER para tenant-specific, SUPER_ADMIN para global.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id } = await params;
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        // Buscar el item existente
        const existing = await prisma.mantItemVehiclePart.findFirst({
            where: {
                id: itemId,
                OR: [
                    { isGlobal: true },
                    { tenantId: user.tenantId },
                ],
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }

        // Validar permisos
        try {
            requireMasterDataMutationPermission(user, {
                isGlobal: existing.isGlobal,
                tenantId: existing.tenantId,
            });
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            yearFrom,
            yearTo,
            masterPartId,
            alternativePartNumbers,
            notes,
            quantity,
        } = body;

        // Si cambia masterPartId, verificar que exista
        if (masterPartId && masterPartId !== existing.masterPartId) {
            const masterPart = await prisma.masterPart.findUnique({
                where: { id: masterPartId },
            });
            if (!masterPart) {
                return NextResponse.json({ error: "MasterPart no encontrado" }, { status: 404 });
            }

            // Verificar duplicados con la nueva combinación
            const duplicate = await prisma.mantItemVehiclePart.findFirst({
                where: {
                    id: { not: itemId },
                    mantItemId: existing.mantItemId,
                    vehicleBrandId: existing.vehicleBrandId,
                    vehicleLineId: existing.vehicleLineId,
                    yearFrom: yearFrom !== undefined ? (yearFrom || null) : existing.yearFrom,
                    masterPartId,
                },
            });
            if (duplicate) {
                return NextResponse.json(
                    { error: "Ya existe un vínculo para esta combinación" },
                    { status: 409 }
                );
            }
        }

        const updated = await prisma.mantItemVehiclePart.update({
            where: { id: itemId },
            data: {
                ...(yearFrom !== undefined && { yearFrom: yearFrom || null }),
                ...(yearTo !== undefined && { yearTo: yearTo || null }),
                ...(masterPartId && { masterPartId }),
                ...(alternativePartNumbers !== undefined && { alternativePartNumbers: alternativePartNumbers?.trim() || null }),
                ...(notes !== undefined && { notes: notes?.trim() || null }),
                ...(quantity !== undefined && { quantity }),
            },
            include: {
                mantItem: { select: { id: true, name: true, type: true } },
                vehicleBrand: { select: { id: true, name: true } },
                vehicleLine: { select: { id: true, name: true } },
                masterPart: { select: { id: true, code: true, description: true, unit: true, referencePrice: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[VEHICLE_PARTS_PUT]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
