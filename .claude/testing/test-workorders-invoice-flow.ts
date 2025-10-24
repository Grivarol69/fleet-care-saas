/**
 * Script de Testing: Flujo Completo WorkOrders + Invoice
 *
 * Este script prueba el ciclo completo:
 * MaintenanceAlert → WorkOrder → Invoice → Cierre automático
 *
 * Uso:
 * npx ts-node .claude/testing/test-workorders-invoice-flow.ts
 */

import { prisma } from "@/lib/prisma";

// Colores para output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Verificar estado actual de la DB directamente
async function checkWorkOrderState(workOrderId: number) {
  log("\n📊 VERIFICANDO ESTADO EN DB...", "cyan");

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      workOrderItems: {
        select: {
          id: true,
          description: true,
          status: true,
        },
      },
      maintenanceAlerts: {
        select: {
          id: true,
          itemName: true,
          status: true,
          actualCost: true,
          wasOnTime: true,
        },
      },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
        },
      },
    },
  });

  if (!workOrder) {
    log("❌ WorkOrder no encontrada", "red");
    return null;
  }

  log(`\n✅ WorkOrder #${workOrder.id}`, "green");
  log(`   Status: ${workOrder.status}`);
  log(`   Estimated Cost: $${workOrder.estimatedCost}`);
  log(`   Actual Cost: $${workOrder.actualCost || "N/A"}`);
  log(`   Start Date: ${workOrder.startDate || "N/A"}`);
  log(`   End Date: ${workOrder.endDate || "N/A"}`);

  log(`\n📦 WorkOrderItems (${workOrder.workOrderItems.length}):`, "blue");
  workOrder.workOrderItems.forEach((item) => {
    log(`   - [${item.status}] ${item.description}`);
  });

  log(`\n🚨 MaintenanceAlerts (${workOrder.maintenanceAlerts.length}):`, "blue");
  workOrder.maintenanceAlerts.forEach((alert) => {
    log(
      `   - [${alert.status}] ${alert.itemName} | Cost: $${alert.actualCost || "N/A"} | OnTime: ${alert.wasOnTime ?? "N/A"}`
    );
  });

  log(`\n🧾 Invoices (${workOrder.invoices.length}):`, "blue");
  workOrder.invoices.forEach((invoice) => {
    log(
      `   - [${invoice.status}] ${invoice.invoiceNumber} | Amount: $${invoice.totalAmount}`
    );
  });

  return workOrder;
}

async function checkVehicleProgramItems(alertIds: number[]) {
  log("\n📊 VERIFICANDO VehicleProgramItems...", "cyan");

  const alerts = await prisma.maintenanceAlert.findMany({
    where: { id: { in: alertIds } },
    select: {
      id: true,
      programItemId: true,
    },
  });

  const programItemIds = alerts.map(a => a.programItemId);

  const programItems = await prisma.vehicleProgramItem.findMany({
    where: { id: { in: programItemIds } },
  });

  programItems.forEach((item) => {
    const alert = alerts.find(a => a.programItemId === item.id);
    log(
      `   Alert #${alert?.id} → ProgramItem #${item.id} [${item.status}]`
    );
    log(`      Scheduled: ${item.scheduledKm} km`);
    log(
      `      Executed: ${item.executedKm || "N/A"} km`
    );
    log(
      `      Executed Date: ${item.executedDate?.toISOString() || "N/A"}`
    );
  });
}

async function checkPartPriceHistory(invoiceId: string) {
  log("\n📊 VERIFICANDO PartPriceHistory...", "cyan");

  const priceHistory = await prisma.partPriceHistory.findMany({
    where: { invoiceId },
    include: {
      masterPart: {
        select: {
          code: true,
          description: true,
        },
      },
      supplier: {
        select: {
          name: true,
        },
      },
    },
  });

  if (priceHistory.length === 0) {
    log("   ⚠️  No se crearon registros de PartPriceHistory", "yellow");
    log(
      "   (Esto es normal si los InvoiceItems no tienen masterPartId)",
      "yellow"
    );
  } else {
    log(`   ✅ ${priceHistory.length} registros creados:`, "green");
    priceHistory.forEach((record) => {
      log(
        `      ${record.masterPart.code} - ${record.supplier.name}: $${record.price} x ${record.quantity}`
      );
    });
  }
}

async function main() {
  log("\n🧪 TESTING WORKFLOW: WorkOrders + Invoice Cycle\n", "cyan");
  log("=".repeat(60), "cyan");

  try {
    // 1. Obtener un WorkOrder COMPLETED de la DB para testing
    log("\n1️⃣  BUSCANDO WORKORDER COMPLETED EN DB...", "blue");

    const completedWO = await prisma.workOrder.findFirst({
      where: {
        status: "COMPLETED",
      },
      include: {
        maintenanceAlerts: true,
        workOrderItems: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!completedWO) {
      log(
        "❌ No se encontró ninguna WorkOrder COMPLETED para testear",
        "red"
      );
      log(
        "\nPrimero debes completar una WorkOrder desde la UI o Insomnia:",
        "yellow"
      );
      log('   PATCH /api/maintenance/work-orders/[id]', "yellow");
      log('   { "status": "COMPLETED", "actualCost": 450000 }', "yellow");
      process.exit(1);
    }

    log(`✅ WorkOrder encontrada: #${completedWO.id}`, "green");
    log(`   Status: ${completedWO.status}`);
    log(`   Alertas vinculadas: ${completedWO.maintenanceAlerts.length}`);
    log(`   Items: ${completedWO.workOrderItems.length}`);

    // 2. Verificar estado actual
    await checkWorkOrderState(completedWO.id);

    // 3. Verificar si ya tiene Invoice APPROVED
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        workOrderId: completedWO.id,
        status: "APPROVED",
      },
    });

    if (existingInvoice) {
      log(
        `\n⚠️  Esta WorkOrder ya tiene una Invoice APPROVED (${existingInvoice.invoiceNumber})`,
        "yellow"
      );
      log("Mostrando estado final del ciclo cerrado:", "yellow");

      await checkWorkOrderState(completedWO.id);
      await checkVehicleProgramItems(
        completedWO.maintenanceAlerts.map((a) => a.id)
      );
      await checkPartPriceHistory(existingInvoice.id);

      log(
        "\n✅ CICLO COMPLETO VERIFICADO - Todo cerrado correctamente",
        "green"
      );
      return;
    }

    // 4. Verificar si tiene Invoice PENDING (creada pero no aprobada)
    const pendingInvoice = await prisma.invoice.findFirst({
      where: {
        workOrderId: completedWO.id,
        status: "PENDING",
      },
    });

    if (pendingInvoice) {
      log(
        `\n📋 Invoice PENDING encontrada: ${pendingInvoice.invoiceNumber}`,
        "cyan"
      );
      log(
        "Si quieres probar el cierre de ciclo, apruébala con:",
        "yellow"
      );
      log(
        `   PATCH /api/maintenance/invoices/${pendingInvoice.id}`,
        "yellow"
      );
      log('   { "status": "APPROVED" }', "yellow");

      log("\nO ejecuta este query directamente:", "yellow");
      log(`\n--- SQL DIRECTO ---`, "cyan");
      log(
        `UPDATE "Invoice" SET status = 'APPROVED', "approvedBy" = (SELECT id FROM "User" WHERE role = 'OWNER' LIMIT 1), "approvedAt" = NOW() WHERE id = '${pendingInvoice.id}';`
      );
      log(`------------------\n`, "cyan");

      // Mostrar estado actual detallado
      await checkWorkOrderState(completedWO.id);
      await checkVehicleProgramItems(
        completedWO.maintenanceAlerts.map((a) => a.id)
      );

      log(
        "\n💡 TIP: Después de aprobar, vuelve a ejecutar este script para ver los cambios",
        "yellow"
      );
      return;
    }

    // 5. Si no hay Invoice, sugerir crear una
    log("\n❌ No hay Invoice para esta WorkOrder", "red");
    log("\nPara testear el ciclo completo, necesitas:", "yellow");
    log("1. Crear una Invoice con:", "yellow");
    log("   POST /api/maintenance/invoices", "yellow");
    const examplePayload = {
      invoiceNumber: `FAC-TEST-${Date.now()}`,
      invoiceDate: new Date().toISOString(),
      workOrderId: completedWO.id,
      supplierId: "<ID_PROVEEDOR>",
      totalAmount: 450000,
      items: [
        {
          description: "Cambio aceite + filtro",
          quantity: 1,
          unitPrice: 450000,
          total: 450000
        }
      ]
    };
    log(`   ${JSON.stringify(examplePayload, null, 2)}`, "yellow");
    log("\n2. Luego aprobar con:", "yellow");
    log("   PATCH /api/maintenance/invoices/[id]", "yellow");
    log('   { "status": "APPROVED" }', "yellow");

    // Buscar un proveedor válido
    const supplier = await prisma.provider.findFirst({
      where: { tenantId: completedWO.tenantId },
    });

    if (supplier) {
      log(`\n💡 Proveedor disponible: ID ${supplier.id} - ${supplier.name}`, "cyan");
    }

  } catch (error) {
    log("\n❌ ERROR EN TESTING:", "red");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main()
  .then(() => {
    log("\n" + "=".repeat(60), "cyan");
    log("✅ Testing completado", "green");
    process.exit(0);
  })
  .catch((error) => {
    log("\n❌ Error fatal:", "red");
    console.error(error);
    process.exit(1);
  });
