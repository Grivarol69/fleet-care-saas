import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const technicians = await prisma.technician.findMany({
            where: {
                tenantId: TENANT_ID
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(technicians);
    } catch (error) {
        console.error("[TECHNICIANS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name, email, phone, specialty } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que no exista un técnico con el mismo nombre
        const existingTechnician = await prisma.technician.findUnique({
            where: {
                tenantId_name: {
                    tenantId: TENANT_ID,
                    name: name.trim()
                }
            }
        });

        if (existingTechnician) {
            return new NextResponse("Technician already exists", { status: 409 });
        }

        const technician = await prisma.technician.create({
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                specialty: specialty?.trim() || null,
                tenantId: TENANT_ID,
            },
        });

        return NextResponse.json(technician);
    } catch (error) {
        console.log("[TECHNICIAN_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}