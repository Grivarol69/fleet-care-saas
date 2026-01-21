import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const packageId = searchParams.get('packageId');

        if (!packageId) {
            return NextResponse.json(
                { error: "packageId is required" },
                { status: 400 }
            );
        }

        const packageItems = await prisma.packageItem.findMany({
            where: {
                packageId: parseInt(packageId)
            },
            include: {
                mantItem: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: [
                { priority: 'desc' }, // CRITICAL, HIGH, MEDIUM, LOW
                { triggerKm: 'asc' }
            ]
        });

        return NextResponse.json(packageItems);
    } catch (error) {
        console.error("[PACKAGE_ITEMS_GET]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { packageId, mantItemId, triggerKm, priority, estimatedTime, technicalNotes, isOptional, order } = body;

        // Validaciones básicas
        if (!packageId || !mantItemId || !triggerKm) {
            return NextResponse.json(
                { error: "packageId, mantItemId, and triggerKm are required" },
                { status: 400 }
            );
        }

        // Verificar que el package existe
        const maintenancePackage = await prisma.maintenancePackage.findFirst({
            where: {
                id: packageId
            }
        });

        if (!maintenancePackage) {
            return NextResponse.json(
                { error: "Package not found" },
                { status: 404 }
            );
        }

        // Verificar que el mantItem existe
        const mantItem = await prisma.mantItem.findFirst({
            where: {
                id: mantItemId,
                tenantId: TENANT_ID,
                status: 'ACTIVE'
            }
        });

        if (!mantItem) {
            return NextResponse.json(
                { error: "Maintenance item not found" },
                { status: 404 }
            );
        }

        // Verificar que no existe el mismo mantItem en este package
        const existingItem = await prisma.packageItem.findFirst({
            where: {
                packageId: packageId,
                mantItemId: mantItemId
            }
        });

        if (existingItem) {
            return NextResponse.json(
                { error: "Este item de mantenimiento ya está asignado a este paquete" },
                { status: 409 }
            );
        }

        const newPackageItem = await prisma.packageItem.create({
            data: {
                packageId,
                mantItemId,
                triggerKm,
                priority: priority || 'MEDIUM',
                estimatedTime: estimatedTime ? parseFloat(estimatedTime) : null,
                technicalNotes,
                isOptional: isOptional ?? false,
                order: order ?? 0
            },
            include: {
                mantItem: {
                    include: {
                        category: true
                    }
                }
            }
        });

        return NextResponse.json(newPackageItem, { status: 201 });
    } catch (error) {
        console.error("[PACKAGE_ITEMS_POST]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}