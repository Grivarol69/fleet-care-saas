import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();
        const { triggerKm, priority, estimatedTime, technicalNotes, isOptional, order } = body;

        // Validaciones básicas
        if (!triggerKm) {
            return NextResponse.json(
                { error: "triggerKm is required" },
                { status: 400 }
            );
        }

        // Verificar que el package item existe
        const existingItem = await prisma.packageItem.findUnique({
            where: { id }
        });

        if (!existingItem) {
            return NextResponse.json(
                { error: "Package item not found" },
                { status: 404 }
            );
        }

        const updatedPackageItem = await prisma.packageItem.update({
            where: { id },
            data: {
                triggerKm,
                priority: priority || 'MEDIUM',
                estimatedTime: estimatedTime ? parseFloat(estimatedTime) : null,
                technicalNotes,
                isOptional: isOptional ?? existingItem.isOptional,
                order: order ?? existingItem.order
            },
            include: {
                mantItem: {
                    include: {
                        category: true
                    }
                }
            }
        });

        return NextResponse.json(updatedPackageItem);
    } catch (error) {
        console.error("[PACKAGE_ITEM_PUT]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        // Verificar que el package item existe
        const existingItem = await prisma.packageItem.findUnique({
            where: { id }
        });

        if (!existingItem) {
            return NextResponse.json(
                { error: "Package item not found" },
                { status: 404 }
            );
        }

        // TODO: Verificar si tiene work orders activas (cuando implementemos work orders)
        // const activeWorkOrders = await prisma.workOrder.findFirst({
        //     where: {
        //         packageItemId: id,
        //         status: { in: ['PENDING', 'IN_PROGRESS'] }
        //     }
        // });
        //
        // if (activeWorkOrders) {
        //     return NextResponse.json(
        //         { error: "No se puede eliminar: el item tiene órdenes de trabajo activas" },
        //         { status: 409 }
        //     );
        // }

        await prisma.packageItem.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[PACKAGE_ITEM_DELETE]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        const packageItem = await prisma.packageItem.findUnique({
            where: { id },
            include: {
                mantItem: {
                    include: {
                        category: true
                    }
                }
            }
        });

        if (!packageItem) {
            return NextResponse.json(
                { error: "Package item not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(packageItem);
    } catch (error) {
        console.error("[PACKAGE_ITEM_GET]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}