import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";
import { canManageProviders } from "@/lib/permissions";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const providers = await prisma.provider.findMany({
            where: {
                tenantId: user.tenantId,
                status: 'ACTIVE'
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(providers);
    } catch (error) {
        console.error("[PROVIDERS_GET]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        if (!canManageProviders(user)) {
            return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 });
        }

        const { name, email, phone, address, specialty } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que no exista un proveedor con el mismo nombre
        const existingProvider = await prisma.provider.findUnique({
            where: {
                tenantId_name: {
                    tenantId: user.tenantId,
                    name: name.trim()
                }
            }
        });

        if (existingProvider) {
            return NextResponse.json({ error: "Ya existe un proveedor con este nombre" }, { status: 409 });
        }

        const provider = await prisma.provider.create({
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                specialty: specialty?.trim() || null,
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(provider, { status: 201 });
    } catch (error) {
        console.error("[PROVIDER_POST]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
