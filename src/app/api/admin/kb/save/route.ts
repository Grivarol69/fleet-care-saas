import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { AIKBProposalSchema } from '@/lib/validations/kb-ai';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autorización
    const authRecord = await requireCurrentUser();
    if (!authRecord?.user || authRecord.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: SUPER_ADMIN role required.' },
        { status: 403 }
      );
    }

    // 2. Parsear Payload y Zod
    const body = await req.json();
    const validationResult = AIKBProposalSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data submitted.', details: validationResult.error },
        { status: 400 }
      );
    }

    const { vehicleInfo, maintenanceItems } = validationResult.data;

    // Resolver categoría global por defecto para MantItems del KB
    const defaultCategory = await prisma.mantCategory.findFirst({
      where: { isGlobal: true },
      orderBy: { name: 'asc' },
    });
    if (!defaultCategory) {
      return NextResponse.json(
        { error: 'No global MantCategory found. Create one first.' },
        { status: 500 }
      );
    }

    // 3. Ejecutar subida en $transaction global (tenantId: null)
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of maintenanceItems) {
        // Primero nos encargamos de las partes si existen (MasterPart global)
        if (item.partsRequired && item.partsRequired.length > 0) {
          for (const part of item.partsRequired) {
            // Buscamos si ya existe la parte a nivel global
            const existingPart = await tx.masterPart.findFirst({
              where: {
                description: part.name,
                tenantId: null, // Búsqueda de recursos globales solamente
              },
            });

            if (!existingPart) {
              await tx.masterPart.create({
                data: {
                  code:
                    part.partNumber ||
                    `KB-${part.name.replace(/\s+/g, '-').toUpperCase().slice(0, 20)}`,
                  description: part.name,
                  category: 'KB_AUTO',
                  isGlobal: true,
                },
              });
            }
          }
        }

        // Luego creamos la Tarea Preventiva (MantItem) global
        // Buscamos si existe ya esta tarea globalmente
        const existingMantItem = await tx.mantItem.findFirst({
          where: {
            name: item.name,
            tenantId: null, // scope global
          },
        });

        if (!existingMantItem) {
          console.log(`Creating global MantItem: ${item.name}`);
          await tx.mantItem.create({
            data: {
              name: `${item.name} (${vehicleInfo.brand} ${vehicleInfo.model})`,
              description: `Maintenance for ${vehicleInfo.brand} ${vehicleInfo.model}. Migrated by AI. Interval: ${item.intervalKm}km / ${item.intervalMonths}mo`,
              categoryId: defaultCategory.id,
              isGlobal: true,
            },
          });
        }
      }
    });

    return NextResponse.json(
      { message: 'Knowledge Base successfully populated globally.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving global KB:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
