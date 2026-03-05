import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { AIKBProposalSchema } from "@/lib/validations/kb-ai";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        // 1. Validar autorización
        const authRecord = await requireCurrentUser();
        if (!authRecord?.user || authRecord.user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden: SUPER_ADMIN role required." }, { status: 403 });
        }

        // 2. Parsear Payload y Zod
        const body = await req.json();
        const validationResult = AIKBProposalSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json({ error: "Invalid data submitted.", details: validationResult.error }, { status: 400 });
        }

        const { vehicleInfo, maintenanceItems } = validationResult.data;

        // 3. Ejecutar subida en $transaction global (tenantId: null)
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            for (const item of maintenanceItems) {

                let mantItemRecord = null;
                let createdPartsIds: string[] = [];

                // Primero nos encargamos de las partes si existen (MasterPart global)
                if (item.partsRequired && item.partsRequired.length > 0) {
                    for (const part of item.partsRequired) {
                        // Buscamos si ya existe la parte a nivel global
                        const existingPart = await tx.masterPart.findFirst({
                            where: {
                                name: part.name,
                                brand: vehicleInfo.brand, // Optional match
                                partNumber: part.partNumber || null,
                                tenantId: null // Búsqueda de recursos globales solamente
                            }
                        });

                        if (existingPart) {
                            createdPartsIds.push(existingPart.id);
                        } else {
                            const newPart = await tx.masterPart.create({
                                data: {
                                    name: part.name,
                                    description: part.partNumber ? `Part No: ${part.partNumber}` : `Created by Admin KB from AI (Vehicle: ${vehicleInfo.brand} ${vehicleInfo.model})`,
                                    partNumber: part.partNumber || null,
                                    brand: vehicleInfo.brand,
                                    isGlobal: true // El prisma client extender ignora isGlobal y pone tenantId: null, o se mapea a null manualmente en crudo.
                                    // Asumiendo el Prisma GlobalClient, el client extender puede pedir que omitas tenantId o lo pongas manual si usamos prisma global original
                                }
                            });
                            createdPartsIds.push(newPart.id);
                        }
                    }
                }

                // Luego creamos la Tarea Preventiva (MantItem) global
                // Buscamos si existe ya esta tarea globalmente
                const existingMantItem = await tx.mantItem.findFirst({
                    where: {
                        name: item.name,
                        type: item.type,
                        tenantId: null // scope global
                    }
                });

                if (existingMantItem) {
                    mantItemRecord = existingMantItem;
                } else {
                    console.log(`Creating global MantItem: ${item.name}`);
                    mantItemRecord = await tx.mantItem.create({
                        data: {
                            name: `${item.name} (${vehicleInfo.brand} ${vehicleInfo.model})`,
                            description: `Maintenance for ${vehicleInfo.brand} ${vehicleInfo.model}. Migrated by AI. Interval: ${item.intervalKm}km / ${item.intervalMonths}mo`,
                            type: item.type,
                            isGlobal: true, // Assuming this maps successfully to setting tenantId = null via multitenant client.
                            // Or if bypassing we might need: tenantId: null
                        }
                    });
                }

                // Linkeamos las MasterParts si la MantItem no las tiene vinculadas ya.
                if (createdPartsIds.length > 0) {
                    for (const partId of createdPartsIds) {
                        // Este check previene duplicados en la tabla de asociación
                        const existingLink = await tx.mantItemMasterPart.findFirst({
                            where: { mantItemId: mantItemRecord.id, masterPartId: partId }
                        });

                        if (!existingLink) {
                            await tx.mantItemMasterPart.create({
                                data: {
                                    mantItemId: mantItemRecord.id,
                                    masterPartId: partId,
                                    quantity: 1, // Nota: el modelo AI provee quantity per-repuesto que aqui se fuerza a 1 si no se actualiza el esquema
                                }
                            });
                        }
                    }
                }

            }
        });

        return NextResponse.json({ message: "Knowledge Base successfully populated globally." }, { status: 200 });
    } catch (error) {
        console.error("Error saving global KB:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
