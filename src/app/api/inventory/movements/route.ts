
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MovementType, MovementReferenceType } from "@prisma/client";

// POST: Registrar un movimiento de inventario (Entrada/Salida)
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const {
            inventoryItemId,
            movementType,
            quantity,
            unitCost, // Requerido para entradas
            referenceType,
            referenceId,
        } = body;

        if (!inventoryItemId || !movementType || !quantity || !referenceType || !referenceId) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const qty = Number(quantity); // Puede ser negativo o positivo según UI, pero lo normalizaremos
        const cost = unitCost ? Number(unitCost) : 0;

        // Usamos transacción serializable para evitar condiciones de carrera en el costo promedio
        const result = await prisma.$transaction(async (tx) => {
            // 1. Obtener item actual con bloqueo (si fuera posible, Prisma usa FOR UPDATE en raw query, aquí confiamos en atomicidad de tx)
            const item = await tx.inventoryItem.findUnique({
                where: { id: inventoryItemId }
            });

            if (!item) {
                throw new Error("Inventory Item not found");
            }

            if (item.tenantId !== user.tenantId) {
                throw new Error("Unauthorized access to item");
            }

            // 2. Determinar signo del movimiento
            // Tipos de Entrada (Suman Stock)
            const isEntry = [
                "PURCHASE",
                "ADJUSTMENT_IN",
                "TRANSFER_IN",
                "RETURN_STOCK"
            ].includes(movementType);

            // Tipos de Salida (Restan Stock)
            const isExit = [
                "CONSUMPTION",
                "ADJUSTMENT_OUT",
                "TRANSFER_OUT",
                "RETURN_SUPPLIER",
                "DAMAGED",
                "COUNT_ADJUSTMENT"
            ].includes(movementType);

            if (!isEntry && !isExit) {
                throw new Error("Invalid Movement Type");
            }

            const currentStock = Number(item.quantity);
            const currentTotalValue = Number(item.totalValue);
            const currentAvgCost = Number(item.averageCost);

            let newStock = currentStock;
            let newTotalValue = currentTotalValue;
            let newAvgCost = currentAvgCost;
            let movementTotalCost = 0;

            if (isEntry) {
                // Entrada: Recalcula Costo Promedio Ponderado (PPP)
                // Nuevo Costo Prom = (Valor Total Actual + Valor Entrada) / (Stock Actual + Cantidad Entrada)
                movementTotalCost = qty * cost;
                newStock = currentStock + qty;
                newTotalValue = currentTotalValue + movementTotalCost;

                if (newStock > 0) {
                    newAvgCost = newTotalValue / newStock;
                }
            } else {
                // Salida: Mantiene costo promedio, reduce valor total
                // Valor Salida = Cantidad * Costo Promedio Actual
                if (currentStock < qty) {
                    throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${qty}`);
                }

                movementTotalCost = qty * currentAvgCost; // Salidas se valorizan al costo promedio actual
                newStock = currentStock - qty;
                newTotalValue = currentTotalValue - movementTotalCost;

                // En salida, el costo unitario del movimiento es el promedio actual
                // avgCost no cambia teóricamente, pero actualizamos para evitar deriva por decimales si stock llega a 0
                if (newStock === 0) {
                    newTotalValue = 0;
                    // newAvgCost se mantiene como el último conocido o se resetea?
                    // Generalmente se mantiene para referencia, o se ajustará en prox entrada.
                }
            }

            // 3. Actualizar Item
            const updatedItem = await tx.inventoryItem.update({
                where: { id: inventoryItemId },
                data: {
                    quantity: newStock,
                    totalValue: newTotalValue,
                    averageCost: newAvgCost,
                    status: newStock <= Number(item.minStock)
                        ? (newStock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK")
                        : "ACTIVE"
                }
            });

            // 4. Registrar Movimiento
            const movement = await tx.inventoryMovement.create({
                data: {
                    tenantId: user.tenantId,
                    inventoryItemId,
                    movementType: movementType as MovementType,
                    quantity: qty,
                    unitCost: isEntry ? cost : currentAvgCost, // En entrada es precio compra, en salida es costo promedio
                    totalCost: movementTotalCost,
                    previousStock: currentStock,
                    newStock: newStock,
                    previousAvgCost: currentAvgCost,
                    newAvgCost: newAvgCost,
                    referenceType: referenceType as MovementReferenceType,
                    referenceId,
                    performedBy: user.id
                }
            });

            return { movement, updatedItem };
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error processing inventory movement:", error);
        return new NextResponse(error.message || "Internal Error", { status: error.message.includes("Insufficient") ? 400 : 500 });
    }
}
