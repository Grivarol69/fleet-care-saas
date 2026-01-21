import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const vehicles = await prisma.vehicle.findMany({
            where: { 
                tenantId: TENANT_ID,
                status: "ACTIVE" 
            },
            include: {
                brand: true,
                line: true,
                type: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(vehicles);
    } catch (error) {
        console.error("[VEHICLES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { licensePlate, brandId, lineId, typeId, year, color, mileage } = body;

        if (!licensePlate || !brandId || !lineId || !typeId || !year || !color || mileage === undefined) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

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

        const vehicle = await prisma.vehicle.create({
            data: {
                ...body,
                tenantId: TENANT_ID,
            },
        });

        return NextResponse.json(vehicle);
    } catch (error) {
        console.error("[VEHICLES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}