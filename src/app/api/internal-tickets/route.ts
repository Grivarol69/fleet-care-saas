
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { InternalTicketStatus, MovementType, MovementReferenceType } from "@prisma/client";

// POST: Crear nuevo Internal Work Ticket
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const {
            workOrderId,
            ticketDate,
            technicianId,
            description,
            laborEntries, // Array of { description, hours, hourlyRate, workOrderItemId? }
            partEntries   // Array of { inventoryItemId, quantity, workOrderItemId? }
        } = body;

        if (!workOrderId || !technicianId) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Generar número de ticket (Simulado simple por ahora, idealmente secuencial)
        const ticketNumber = `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Calcular totales
            let totalLaborHours = 0;
            let totalLaborCost = 0;
            let totalPartsCost = 0;

            // Procesar Labor (Solo cálculo previo)
            for (const entry of laborEntries || []) {
                const cost = Number(entry.hours) * Number(entry.hourlyRate);
                totalLaborHours += Number(entry.hours);
                totalLaborCost += cost;
            }

            // 2. Crear el Ticket Cabecera
            const ticket = await tx.internalWorkTicket.create({
                data: {
                    tenantId: user.tenantId,
                    workOrderId,
                    ticketNumber,
                    ticketDate: ticketDate ? new Date(ticketDate) : new Date(),
                    technicianId,
                    description,
                    totalLaborHours,
                    totalLaborCost,
                    totalPartsCost: 0, // Se actualizará tras procesar partes
                    totalCost: 0,
                    status: InternalTicketStatus.DRAFT,
                    // crear entradas de labor
                    laborEntries: {
                        create: (laborEntries || []).map((entry: any) => ({
                            description: entry.description,
                            hours: entry.hours,
                            hourlyRate: entry.hourlyRate,
                            laborCost: Number(entry.hours) * Number(entry.hourlyRate),
                            workOrderItemId: entry.workOrderItemId,
                            technicianId // Default al técnico del ticket
                        }))
                    }
                }
            });

            // 3. Procesar Partes e Inventario (Complejo)
            for (const entry of partEntries || []) {
                // Obtener item para costo y stock
                const inventoryItem = await tx.inventoryItem.findUnique({
                    where: { id: entry.inventoryItemId }
                });

                if (!inventoryItem) throw new Error(`Item ${entry.inventoryItemId} not found`);

                // Validar stock (Consumo = Salida)
                const qty = Number(entry.quantity);
                if (Number(inventoryItem.quantity) < qty) {
                    throw new Error(`Insufficient stock for item ${inventoryItem.id}`);
                }

                const unitCost = Number(inventoryItem.averageCost); // Costo al momento de salida
                const lineTotal = qty * unitCost;
                totalPartsCost += lineTotal;

                // A. Actualizar Stock (Salida)
                const newStock = Number(inventoryItem.quantity) - qty;
                const newTotalValue = Number(inventoryItem.totalValue) - lineTotal;

                await tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: {
                        quantity: newStock,
                        totalValue: newTotalValue,
                        // averageCost no cambia en salida
                        status: newStock <= Number(inventoryItem.minStock)
                            ? (newStock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK")
                            : "ACTIVE"
                    }
                });

                // B. Registrar Movimiento de Inventario
                const movement = await tx.inventoryMovement.create({
                    data: {
                        tenantId: user.tenantId,
                        inventoryItemId: inventoryItem.id,
                        movementType: MovementType.CONSUMPTION,
                        quantity: qty,
                        unitCost: unitCost,
                        totalCost: lineTotal,
                        previousStock: Number(inventoryItem.quantity),
                        newStock: newStock,
                        previousAvgCost: Number(inventoryItem.averageCost),
                        newAvgCost: Number(inventoryItem.averageCost), // No cambia
                        referenceType: MovementReferenceType.INTERNAL_TICKET,
                        referenceId: ticket.id,
                        performedBy: user.id
                    }
                });

                // C. Crear TicketPartEntry referenciando el movimiento
                await tx.ticketPartEntry.create({
                    data: {
                        ticketId: ticket.id,
                        inventoryItemId: inventoryItem.id,
                        quantity: qty,
                        unitCost: unitCost,
                        totalCost: lineTotal,
                        workOrderItemId: entry.workOrderItemId,
                        inventoryMovementId: movement.id
                    }
                });

                // D. (Opcional) Si hay workOrderItemId, actualizar su estado a INTERNAL_TICKET?
                // Eso mejor lo dejamos para el proceso de aprobación o cierre.
            }

            // 4. Actualizar totales finales en Ticket
            const finalDoc = await tx.internalWorkTicket.update({
                where: { id: ticket.id },
                data: {
                    totalPartsCost,
                    totalCost: totalLaborCost + totalPartsCost
                }
            });

            return finalDoc;
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error creating internal ticket:", error);
        return new NextResponse(error.message || "Internal Error", { status: error.message.includes("Insufficient") ? 400 : 500 });
    }
}
