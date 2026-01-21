import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

// GET all documents for a specific vehicle
export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const vehiclePlate = searchParams.get('vehiclePlate');

        if (!vehiclePlate) {
            return new NextResponse("Vehicle plate is required", { status: 400 });
        }

        const vehicle = await prisma.vehicle.findUnique({
            where: {
                tenantId_licensePlate: {
                    tenantId: TENANT_ID,
                    licensePlate: vehiclePlate,
                }
            }
        });

        if (!vehicle) {
            return new NextResponse("Vehicle not found", { status: 404 });
        }

        const documents = await prisma.document.findMany({
            where: {
                tenantId: TENANT_ID,
                vehicleId: vehicle.id,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(documents);

    } catch (error) {
        console.error("[DOCUMENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}


// POST a new document for a vehicle
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { vehiclePlate, type, documentNumber, entity, fileUrl, expiryDate, status } = body;

        if (!vehiclePlate || !type || !documentNumber || !fileUrl) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Extraer fileName del fileUrl automáticamente
        const fileName = fileUrl.split('/').pop() || 'document.pdf';

        const vehicle = await prisma.vehicle.findUnique({
            where: {
                tenantId_licensePlate: {
                    tenantId: TENANT_ID,
                    licensePlate: vehiclePlate,
                }
            }
        });

        if (!vehicle) {
            return new NextResponse("Vehicle not found for this tenant", { status: 404 });
        }

        const newDocument = await prisma.document.create({
            data: {
                tenantId: TENANT_ID,
                vehicleId: vehicle.id,
                type,
                fileName,              // Extraído del fileUrl
                documentNumber,        // Número oficial del documento
                entity: entity || null, // Entidad emisora (opcional)
                fileUrl,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                status: status || 'ACTIVE',
            }
        });

        return NextResponse.json(newDocument);

    } catch (error) {
        console.error("[DOCUMENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
