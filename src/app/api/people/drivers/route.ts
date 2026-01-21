import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const drivers = await prisma.driver.findMany({
            where: {
                tenantId: TENANT_ID
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(drivers);
    } catch (error) {
        console.error("[DRIVERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name, email, phone, licenseNumber, licenseExpiry } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que no exista un conductor con la misma licencia (si se proporciona)
        if (licenseNumber && licenseNumber.trim() !== '') {
            const existingDriverWithLicense = await prisma.driver.findUnique({
                where: {
                    tenantId_licenseNumber: {
                        tenantId: TENANT_ID,
                        licenseNumber: licenseNumber.trim()
                    }
                }
            });

            if (existingDriverWithLicense) {
                return new NextResponse("Driver with this license number already exists", { status: 409 });
            }
        }

        const driver = await prisma.driver.create({
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                licenseNumber: licenseNumber?.trim() || null,
                licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
                tenantId: TENANT_ID,
            },
        });

        return NextResponse.json(driver);
    } catch (error) {
        console.log("[DRIVER_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}