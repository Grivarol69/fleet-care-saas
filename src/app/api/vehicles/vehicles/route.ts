import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const vehicles = await prisma.vehicle.findMany({
            where: {
                tenantId: user.tenantId,
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
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = await req.json();
        const { licensePlate, brandId, lineId, typeId, year, color, mileage } = body;

        if (!licensePlate || !brandId || !lineId || !typeId || !year || !color || mileage === undefined) {
            return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
        }

        const existingVehicle = await prisma.vehicle.findUnique({
            where: {
                tenantId_licensePlate: {
                    tenantId: user.tenantId,
                    licensePlate: licensePlate,
                }
            }
        });

        if (existingVehicle) {
            return NextResponse.json({ error: "Ya existe un vehículo con esta placa" }, { status: 409 });
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                ...body,
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(vehicle, { status: 201 });
    } catch (error) {
        console.error("[VEHICLES_POST]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
