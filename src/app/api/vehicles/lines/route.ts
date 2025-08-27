import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP


export async function GET() {
    try {
        // ✅ Corregido: consultando vehicleLine en lugar de vehicleBrand
        const lines = await prisma.vehicleLine.findMany({
            where: {
                tenantId: TENANT_ID
            },
            orderBy: {
                name: 'asc'
            },
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        return NextResponse.json(lines);
    } catch (error) {
        console.error("[LINE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // Verificar autenticación con Supabase SSR (método actualizado)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        console.log("API User: ", user)

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name, brandId } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        if (!brandId) {
            return new NextResponse("Brand ID is required", { status: 400 });
        }

        // ✅ Corregido: usando el constraint único correcto según el schema
        // @@unique([tenantId, brandId, name])
        const existingLine = await prisma.vehicleLine.findUnique({
            where: {
                tenantId_brandId_name: {
                    tenantId: TENANT_ID,
                    brandId: parseInt(brandId),
                    name: name.trim()
                }
            }
        });

        if (existingLine) {
            return new NextResponse("Line already exists for this brand", { status: 409 });
        }

        // Verificar que la marca existe y pertenece al tenant
        const brand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(brandId),
                tenantId: TENANT_ID
            }
        });

        if (!brand) {
            return new NextResponse("Brand not found", { status: 404 });
        }

        const line = await prisma.vehicleLine.create({
            data: {
                name: name.trim(),
                brandId: parseInt(brandId),
                tenantId: TENANT_ID,
            },
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            }
        });

        return NextResponse.json(line);
    } catch (error) {
        console.log("[LINE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}