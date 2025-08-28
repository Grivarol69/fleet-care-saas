import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

// GET a single vehicle by ID
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const vehicle = await prisma.vehicle.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID,
            },
            include: {
                brand: true,
                line: true,
                type: true,
            },
        });

        if (!vehicle) {
            return new NextResponse("Vehicle not found", { status: 404 });
        }

        return NextResponse.json(vehicle);
    } catch (error) {
        console.error("[VEHICLE_GET_BY_ID]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE a vehicle by ID
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const vehicleToDelete = await prisma.vehicle.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID,
            }
        });

        if (!vehicleToDelete) {
            return new NextResponse("Vehicle not found", { status: 404 });
        }

        await prisma.vehicle.delete({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID,
            },
        });

        return new NextResponse("Vehicle deleted", { status: 200 });
    } catch (error) {
        console.error("[VEHICLE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PATCH (update) a vehicle by ID
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { licensePlate, ...otherData } = body;

        const vehicleToUpdate = await prisma.vehicle.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID,
            }
        });

        if (!vehicleToUpdate) {
            return new NextResponse("Vehicle not found", { status: 404 });
        }

        // If license plate is being changed, check for duplicates
        if (licensePlate && licensePlate !== vehicleToUpdate.licensePlate) {
            const existingVehicle = await prisma.vehicle.findUnique({
                where: {
                    tenantId_licensePlate: {
                        tenantId: TENANT_ID,
                        licensePlate: licensePlate,
                    }
                }
            });

            if (existingVehicle) {
                return new NextResponse("Vehicle with this license plate already exists", { status: 409 });
            }
        }

        const updatedVehicle = await prisma.vehicle.update({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID,
            },
            data: {
                licensePlate,
                ...otherData
            },
        });

        return NextResponse.json(updatedVehicle);
    } catch (error) {
        console.error("[VEHICLE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}