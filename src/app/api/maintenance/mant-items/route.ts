import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const mantItems = await prisma.mantItem.findMany({
            where: {
                tenantId: TENANT_ID
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(mantItems);
    } catch (error) {
        console.error("[MANT_ITEMS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name, description, mantType, estimatedTime, categoryId } = await req.json();

        // Validación de campos requeridos
        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        if (!mantType || !['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'].includes(mantType)) {
            return new NextResponse("Valid mantType is required", { status: 400 });
        }

        if (!estimatedTime || estimatedTime <= 0) {
            return new NextResponse("Valid estimatedTime is required", { status: 400 });
        }

        if (!categoryId || categoryId <= 0) {
            return new NextResponse("Valid categoryId is required", { status: 400 });
        }

        // Verificar que la categoría existe

        const category = await prisma.mantCategory.findUnique({
            where: {
                id: categoryId,
                tenantId: TENANT_ID
            }
        });

        if (!category) {
            return new NextResponse("Category not found", { status: 404 });
        }

        // Verificar que no exista un item con el mismo nombre
        const existingItem = await prisma.mantItem.findUnique({
            where: {
                tenantId_name: {
                    tenantId: TENANT_ID,
                    name: name.trim()
                }
            }
        });

        if (existingItem) {
            return new NextResponse("Item already exists", { status: 409 });
        }

        const mantItem = await prisma.mantItem.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                mantType,
                estimatedTime: parseFloat(estimatedTime),
                categoryId,
                tenantId: TENANT_ID,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json(mantItem);
    } catch (error) {
        console.log("[MANT_ITEM_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}