import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Obtener la última factura creada
  const invoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      supplier: {
        select: { id: true, name: true }
      },
      workOrder: {
        select: {
          id: true,
          title: true,
          status: true,
          actualCost: true,
          vehicle: {
            select: { licensePlate: true }
          }
        }
      }
    }
  });

  console.log('\n📄 ÚLTIMA FACTURA CREADA:');
  console.log('========================');
  console.log('ID:', invoice?.id);
  console.log('Número:', invoice?.invoiceNumber);
  console.log('Fecha:', invoice?.invoiceDate);
  console.log('Estado:', invoice?.status);
  console.log('Proveedor:', invoice?.supplier?.name);
  console.log('WorkOrder ID:', invoice?.workOrderId);
  console.log('WorkOrder Status:', invoice?.workOrder?.status);
  console.log('WorkOrder Título:', invoice?.workOrder?.title);
  console.log('Vehículo:', invoice?.workOrder?.vehicle?.licensePlate);
  console.log('\n💰 MONTOS:');
  console.log('Subtotal:', invoice?.subtotal.toString());
  console.log('IVA:', invoice?.taxAmount.toString());
  console.log('Total:', invoice?.totalAmount.toString());
  console.log('\n📦 ITEMS:', invoice?.items?.length);
  invoice?.items?.forEach((item, idx) => {
    console.log(`\n  Item ${idx + 1}:`);
    console.log(`    Descripción: ${item.description}`);
    console.log(`    Cantidad: ${item.quantity}`);
    console.log(`    Precio Unit: ${item.unitPrice}`);
    console.log(`    Total: ${item.total}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
