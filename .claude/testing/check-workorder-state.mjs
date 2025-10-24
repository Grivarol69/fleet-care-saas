/**
 * Script simple para verificar estado de WorkOrders
 * Uso: node .claude/testing/check-workorder-state.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log("\n🔍 Buscando WorkOrders COMPLETED...\n", "cyan");

  const workOrders = await prisma.workOrder.findMany({
    where: {
      status: "COMPLETED",
    },
    include: {
      vehicle: {
        select: {
          licensePlate: true,
        },
      },
      workOrderItems: true,
      maintenanceAlerts: true,
      invoices: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 5,
  });

  if (workOrders.length === 0) {
    log("❌ No hay WorkOrders COMPLETED", "red");
    return;
  }

  log(`✅ Encontradas ${workOrders.length} WorkOrders COMPLETED:\n`, "green");

  for (const wo of workOrders) {
    log(`\n${"=".repeat(60)}`, "cyan");
    log(`📋 WorkOrder #${wo.id} - ${wo.vehicle?.licensePlate || "N/A"}`, "blue");
    log(`${"=".repeat(60)}`, "cyan");
    log(`Status: ${wo.status}`);
    log(`Estimated Cost: $${wo.estimatedCost}`);
    log(`Actual Cost: $${wo.actualCost || "N/A"}`);
    log(`Created: ${wo.createdAt.toISOString()}`);
    log(`Start Date: ${wo.startDate?.toISOString() || "N/A"}`);
    log(`End Date: ${wo.endDate?.toISOString() || "N/A"}`);

    log(`\n📦 WorkOrderItems (${wo.workOrderItems.length}):`, "yellow");
    wo.workOrderItems.forEach((item) => {
      log(`   - [${item.status}] ${item.description} - $${item.totalCost}`);
    });

    log(`\n🚨 MaintenanceAlerts (${wo.maintenanceAlerts.length}):`, "yellow");
    wo.maintenanceAlerts.forEach((alert) => {
      log(`   - [${alert.status}] ${alert.itemName}`);
      log(`     Cost: $${alert.actualCost || "N/A"} | OnTime: ${alert.wasOnTime ?? "N/A"}`);
      log(`     Closed: ${alert.closedAt?.toISOString() || "N/A"}`);
    });

    log(`\n🧾 Invoices (${wo.invoices.length}):`, "yellow");
    if (wo.invoices.length === 0) {
      log(`   ⚠️  Sin invoices - falta crear y aprobar`, "yellow");
    } else {
      for (const invoice of wo.invoices) {
        log(`   - [${invoice.status}] ${invoice.invoiceNumber}`);
        log(`     Amount: $${invoice.totalAmount}`);
        log(`     Date: ${invoice.invoiceDate.toISOString()}`);
        log(`     Approved: ${invoice.approvedAt?.toISOString() || "N/A"}`);
      }
    }

    // Verificar VehicleProgramItems
    if (wo.maintenanceAlerts.length > 0) {
      const programItemIds = wo.maintenanceAlerts.map(a => a.programItemId);
      const programItems = await prisma.vehicleProgramItem.findMany({
        where: { id: { in: programItemIds } },
      });

      log(`\n📊 VehicleProgramItems (${programItems.length}):`, "yellow");
      programItems.forEach((item) => {
        log(`   - [${item.status}] ProgramItem #${item.id}`);
        log(`     Scheduled: ${item.scheduledKm} km | Executed: ${item.executedKm || "N/A"} km`);
      });
    }

    // Si tiene invoice, verificar PartPriceHistory
    if (wo.invoices.length > 0) {
      for (const invoice of wo.invoices) {
        const priceHistory = await prisma.partPriceHistory.findMany({
          where: { invoiceId: invoice.id },
          include: {
            masterPart: {
              select: {
                code: true,
                description: true,
              },
            },
          },
        });

        if (priceHistory.length > 0) {
          log(`\n💰 PartPriceHistory (${priceHistory.length} registros):`, "yellow");
          priceHistory.forEach((record) => {
            log(`   - ${record.masterPart.code}: $${record.price} x ${record.quantity}`);
          });
        }
      }
    }
  }

  log(`\n${"=".repeat(60)}\n`, "cyan");

  // Resumen
  const withInvoices = workOrders.filter(wo => wo.invoices.length > 0);
  const withApprovedInvoices = workOrders.filter(wo =>
    wo.invoices.some(inv => inv.status === "APPROVED")
  );
  const alertsCompleted = workOrders.filter(wo =>
    wo.maintenanceAlerts.every(a => a.status === "COMPLETED")
  );

  log("📊 RESUMEN:", "cyan");
  log(`   Total WO COMPLETED: ${workOrders.length}`);
  log(`   Con Invoices: ${withInvoices.length}`);
  log(`   Con Invoices APPROVED: ${withApprovedInvoices.length}`);
  log(`   Con todas las Alertas COMPLETED: ${alertsCompleted.length}`);

  if (withApprovedInvoices.length < workOrders.length) {
    log(`\n💡 TIP: ${workOrders.length - withApprovedInvoices.length} WorkOrders necesitan Invoice aprobada para cerrar el ciclo`, "yellow");
  }
}

main()
  .then(() => {
    log("\n✅ Verificación completada\n", "green");
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    log("\n❌ Error:", "red");
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
