import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";
import { canManageVehicles } from "@/lib/permissions";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const drivers = await prisma.driver.findMany({
            where: {
                tenantId: user.tenantId,
                status: 'ACTIVE'
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(drivers);
    } catch (error) {
        console.error("[DRIVERS_GET]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        if (!canManageVehicles(user)) {
            return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 });
        }

        const { name, email, phone, licenseNumber, licenseExpiry } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que no exista un conductor con la misma licencia (si se proporciona)
        if (licenseNumber && licenseNumber.trim() !== '') {
            const existingDriverWithLicense = await prisma.driver.findUnique({
                where: {
                    tenantId_licenseNumber: {
                        tenantId: user.tenantId,
                        licenseNumber: licenseNumber.trim()
                    }
                }
            });

            if (existingDriverWithLicense) {
                return NextResponse.json({ error: "Ya existe un conductor con este número de licencia" }, { status: 409 });
            }
        }

        const driver = await prisma.driver.create({
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                licenseNumber: licenseNumber?.trim() || null,
                licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(driver, { status: 201 });
    } catch (error) {
        console.error("[DRIVER_POST]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
