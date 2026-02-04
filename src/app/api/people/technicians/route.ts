import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const technicians = await prisma.technician.findMany({
            where: {
                tenantId: user.tenantId,
                status: 'ACTIVE'
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(technicians);
    } catch (error) {
        console.error("[TECHNICIANS_GET]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { name, email, phone, specialty } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que no exista un técnico con el mismo nombre
        const existingTechnician = await prisma.technician.findUnique({
            where: {
                tenantId_name: {
                    tenantId: user.tenantId,
                    name: name.trim()
                }
            }
        });

        if (existingTechnician) {
            return NextResponse.json({ error: "Ya existe un técnico con este nombre" }, { status: 409 });
        }

        const technician = await prisma.technician.create({
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                specialty: specialty?.trim() || null,
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(technician, { status: 201 });
    } catch (error) {
        console.error("[TECHNICIAN_POST]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
