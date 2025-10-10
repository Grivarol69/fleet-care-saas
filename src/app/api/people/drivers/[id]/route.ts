import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

// GET - Obtener conductor específico por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const driver = await prisma.driver.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!driver) {
            return new NextResponse("Driver not found", { status: 404 });
        }

        return NextResponse.json(driver);
    } catch (error) {
        console.error("[DRIVER_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PUT - Actualizar conductor específico
export async function PUT(
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

        const { name, email, phone, licenseNumber, licenseExpiry } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que el conductor existe
        const existingDriver = await prisma.driver.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingDriver) {
            return new NextResponse("Driver not found", { status: 404 });
        }

        // Verificar duplicado de licencia (si se proporciona y es diferente)
        if (licenseNumber && licenseNumber.trim() !== '') {
            const duplicateDriverWithLicense = await prisma.driver.findFirst({
                where: {
                    tenantId: TENANT_ID,
                    licenseNumber: licenseNumber.trim(),
                    id: {
                        not: parseInt(id)
                    }
                }
            });

            if (duplicateDriverWithLicense) {
                return new NextResponse("Driver with this license number already exists", { status: 409 });
            }
        }

        const updatedDriver = await prisma.driver.update({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            },
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                licenseNumber: licenseNumber?.trim() || null,
                licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
            }
        });

        return NextResponse.json(updatedDriver);
    } catch (error) {
        console.log("[DRIVER_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE - Eliminar conductor específico
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const existingDriver = await prisma.driver.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingDriver) {
            return new NextResponse("Driver not found", { status: 404 });
        }

        await prisma.driver.delete({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[DRIVER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}