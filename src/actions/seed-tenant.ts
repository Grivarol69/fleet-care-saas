'use server'

import { prisma } from "@/lib/prisma";

export async function seedTenantData(tenantId: string, country: string) {
    console.log(`[SEED] Starting seed for tenant ${tenantId} (${country})`);

    // 1. Crear Marcas y Líneas base (Idempotente)
    const brands = [
        {
            name: "Chevrolet",
            lines: ["NPR", "NQR", "FRR", "NHR"]
        },
        {
            name: "Kenworth",
            lines: ["T800", "T680", "T880"]
        }
    ];

    for (const brandData of brands) {
        // Buscar si existe la marca
        let brand = await prisma.vehicleBrand.findFirst({
            where: { tenantId, name: brandData.name }
        });

        // Si no existe, crearla
        if (!brand) {
            brand = await prisma.vehicleBrand.create({
                data: { name: brandData.name, tenantId }
            });
        }

        // Crear líneas si no existen
        for (const lineName of brandData.lines) {
            const lineExists = await prisma.vehicleLine.findFirst({
                where: { tenantId, brandId: brand.id, name: lineName }
            });

            if (!lineExists) {
                await prisma.vehicleLine.create({
                    data: { name: lineName, brandId: brand.id, tenantId }
                });
            }
        }
    }

    // 2. Crear Tipos de Vehículo (Idempotente)
    const vehicleTypes = ["Tractocamión", "Camión Sencillo", "Volqueta", "Camioneta"];

    for (const typeName of vehicleTypes) {
        const typeExists = await prisma.vehicleType.findFirst({
            where: { tenantId, name: typeName }
        });

        if (!typeExists) {
            await prisma.vehicleType.create({
                data: { name: typeName, tenantId }
            });
        }
    }

    // 3. Crear Categorías de Mantenimiento Básicas (Idempotente)
    const mantCategories = [
        { name: "Motor", description: "Componentes internos y periféricos del motor" },
        { name: "Frenos", description: "Sistema de frenado y seguridad" },
        { name: "Suspensión", description: "Amortiguación y ejes" },
        { name: "Llantas", description: "Neumáticos y alineación" },
        { name: "Eléctrico", description: "Baterías, luces y cableado" },
        { name: "Lubricación", description: "Aceites, grasas y filtros" }
    ];

    for (const cat of mantCategories) {
        const catExists = await prisma.mantCategory.findFirst({
            where: { tenantId, name: cat.name }
        });

        if (!catExists) {
            await prisma.mantCategory.create({
                data: {
                    name: cat.name,
                    description: cat.description,
                    tenantId
                }
            });
        }
    }

    console.log(`[SEED] Completed seed for tenant ${tenantId}`);
}
