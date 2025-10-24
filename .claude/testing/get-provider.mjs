/**
 * Obtener un Provider válido para crear Invoice
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.provider.findFirst({
    where: {
      tenantId: "cf68b103-12fd-4208-a352-42379ef3b6e1"
    }
  });

  if (!provider) {
    console.log("❌ No hay providers. Creando uno de prueba...");

    const newProvider = await prisma.provider.create({
      data: {
        tenantId: "cf68b103-12fd-4208-a352-42379ef3b6e1",
        name: "Taller Automotriz Demo",
        email: "taller@demo.com",
        phone: "3001234567",
        address: "Calle 123 #45-67",
        status: "ACTIVE"
      }
    });

    console.log(`✅ Provider creado: ID ${newProvider.id} - ${newProvider.name}`);
    console.log("\n📋 Payload para crear Invoice:\n");
    console.log(JSON.stringify({
      invoiceNumber: `FAC-${Date.now()}`,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      supplierId: newProvider.id,
      workOrderId: 2,
      subtotal: 450000,
      taxAmount: 0,
      totalAmount: 450000,
      items: [
        {
          description: "Revisión nivel refrigerante",
          workOrderItemId: 5,
          quantity: 1,
          unitPrice: 5000,
          total: 5000
        },
        {
          description: "Cambio aceite motor",
          workOrderItemId: 6,
          quantity: 1,
          unitPrice: 45000,
          total: 45000
        },
        {
          description: "Cambio filtro aceite",
          workOrderItemId: 7,
          quantity: 1,
          unitPrice: 25000,
          total: 25000
        },
        {
          description: "Mano de obra",
          quantity: 1,
          unitPrice: 375000,
          total: 375000
        }
      ]
    }, null, 2));

  } else {
    console.log(`✅ Provider encontrado: ID ${provider.id} - ${provider.name}`);
    console.log("\n📋 Payload para crear Invoice:\n");
    console.log(JSON.stringify({
      invoiceNumber: `FAC-${Date.now()}`,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      supplierId: provider.id,
      workOrderId: 2,
      subtotal: 450000,
      taxAmount: 0,
      totalAmount: 450000,
      items: [
        {
          description: "Revisión nivel refrigerante",
          workOrderItemId: 5,
          quantity: 1,
          unitPrice: 5000,
          total: 5000
        },
        {
          description: "Cambio aceite motor",
          workOrderItemId: 6,
          quantity: 1,
          unitPrice: 45000,
          total: 45000
        },
        {
          description: "Cambio filtro aceite",
          workOrderItemId: 7,
          quantity: 1,
          unitPrice: 25000,
          total: 25000
        },
        {
          description: "Mano de obra",
          quantity: 1,
          unitPrice: 375000,
          total: 375000
        }
      ]
    }, null, 2));
  }

  console.log("\n🔹 Endpoint: POST http://localhost:3000/api/maintenance/invoices");
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
