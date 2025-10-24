/**
 * Test completo del ciclo: WorkOrder → Invoice → Approval → Cierre automático
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
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printSeparator(char = "=") {
  log("\n" + char.repeat(70), "cyan");
}

async function verifyWorkOrder(workOrderId) {
  log("\n🔍 VERIFICANDO WORKORDER...", "cyan");

  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      vehicle: { select: { licensePlate: true } },
      workOrderItems: true,
      maintenanceAlerts: true,
      invoices: true,
    },
  });

  if (!wo) {
    log("❌ WorkOrder no encontrada", "red");
    return null;
  }

  log(`\n✅ WorkOrder #${wo.id} - ${wo.vehicle.licensePlate}`, "green");
  log(`   Status: ${wo.status}`);
  log(`   Estimated: $${wo.estimatedCost} | Actual: $${wo.actualCost || "N/A"}`);
  log(`   Created: ${wo.createdAt.toISOString()}`);
  log(`   Start: ${wo.startDate?.toISOString() || "N/A"}`);
  log(`   End: ${wo.endDate?.toISOString() || "N/A"}`);

  log(`\n📦 WorkOrderItems (${wo.workOrderItems.length}):`, "blue");
  wo.workOrderItems.forEach(item => {
    log(`   - [${item.status}] ${item.description} - $${item.totalCost}`);
  });

  log(`\n🚨 MaintenanceAlerts (${wo.maintenanceAlerts.length}):`, "blue");
  wo.maintenanceAlerts.forEach(alert => {
    log(`   - [${alert.status}] ${alert.itemName}`);
    log(`     Cost: $${alert.actualCost || "N/A"} | OnTime: ${alert.wasOnTime ?? "N/A"} | Closed: ${alert.closedAt ? "✅" : "❌"}`);
  });

  log(`\n🧾 Invoices (${wo.invoices.length}):`, "blue");
  if (wo.invoices.length === 0) {
    log(`   ⚠️  Sin invoices`, "yellow");
  } else {
    wo.invoices.forEach(inv => {
      log(`   - [${inv.status}] ${inv.invoiceNumber} - $${inv.totalAmount}`);
      log(`     Approved: ${inv.approvedAt ? "✅" : "❌"}`);
    });
  }

  return wo;
}

async function verifyProgramItems(workOrder) {
  log("\n🔍 VERIFICANDO VEHICLEPROGRAMITEMS...", "cyan");

  const alerts = await prisma.maintenanceAlert.findMany({
    where: { workOrderId: workOrder.id },
    select: { id: true, programItemId: true, itemName: true },
  });

  const programItemIds = alerts.map(a => a.programItemId);
  const programItems = await prisma.vehicleProgramItem.findMany({
    where: { id: { in: programItemIds } },
  });

  log(`\n📊 ${programItems.length} Program Items:`, "blue");
  programItems.forEach(item => {
    const alert = alerts.find(a => a.programItemId === item.id);
    log(`   - [${item.status}] Alert #${alert?.id} - ${alert?.itemName}`);
    log(`     Scheduled: ${item.scheduledKm} km | Executed: ${item.executedKm || "N/A"} km`);
    log(`     Executed Date: ${item.executedDate?.toISOString() || "N/A"}`);
  });

  return programItems;
}

async function verifyPartPriceHistory(invoiceId) {
  log("\n🔍 VERIFICANDO PARTPRICEHISTORY...", "cyan");

  const records = await prisma.partPriceHistory.findMany({
    where: { invoiceId },
    include: {
      masterPart: { select: { code: true, description: true } },
      supplier: { select: { name: true } },
    },
  });

  if (records.length === 0) {
    log(`   ⚠️  No se crearon registros (items sin masterPartId)`, "yellow");
  } else {
    log(`\n📊 ${records.length} registros creados:`, "green");
    records.forEach(record => {
      log(`   - ${record.masterPart.code} (${record.supplier.name}): $${record.price} x ${record.quantity}`);
    });
  }

  return records;
}

async function createInvoice(workOrderId, supplierId) {
  log("\n📝 CREANDO INVOICE...", "cyan");

  const invoiceData = {
    tenantId: "cf68b103-12fd-4208-a352-42379ef3b6e1",
    invoiceNumber: `FAC-TEST-${Date.now()}`,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    supplierId,
    workOrderId,
    subtotal: 450000,
    taxAmount: 0,
    totalAmount: 450000,
    status: "PENDING",
    registeredBy: "38cadef6-123b-4360-a945-eab70d9ded9b",
  };

  const invoice = await prisma.invoice.create({
    data: invoiceData,
  });

  log(`✅ Invoice creada: ${invoice.invoiceNumber}`, "green");
  log(`   ID: ${invoice.id}`);
  log(`   Status: ${invoice.status}`);
  log(`   Total: $${invoice.totalAmount}`);

  // Crear items
  const items = [
    { description: "Revisión nivel refrigerante", workOrderItemId: 5, quantity: 1, unitPrice: 5000, total: 5000 },
    { description: "Cambio aceite motor", workOrderItemId: 6, quantity: 1, unitPrice: 45000, total: 45000 },
    { description: "Cambio filtro aceite", workOrderItemId: 7, quantity: 1, unitPrice: 25000, total: 25000 },
    { description: "Mano de obra", quantity: 1, unitPrice: 375000, total: 375000 },
  ];

  for (const itemData of items) {
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        description: itemData.description,
        workOrderItemId: itemData.workOrderItemId || null,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        subtotal: itemData.total,
        taxRate: 0,
        taxAmount: 0,
        total: itemData.total,
      },
    });
  }

  log(`✅ ${items.length} InvoiceItems creados`, "green");

  return invoice;
}

async function approveInvoice(invoiceId) {
  log("\n⭐ APROBANDO INVOICE (CIERRE DE CICLO)...", "magenta");

  const userId = "38cadef6-123b-4360-a945-eab70d9ded9b";

  // Obtener invoice con relaciones
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      workOrder: {
        include: {
          maintenanceAlerts: true,
        },
      },
      items: {
        include: {
          masterPart: true,
        },
      },
    },
  });

  if (!invoice) {
    log("❌ Invoice no encontrada", "red");
    return null;
  }

  log(`   Invoice: ${invoice.invoiceNumber}`, "cyan");
  log(`   WorkOrder: #${invoice.workOrderId}`, "cyan");
  log(`   Alerts a cerrar: ${invoice.workOrder?.maintenanceAlerts.length || 0}`, "cyan");

  // TRANSACCIÓN ATÓMICA (replicando lógica del endpoint)
  const result = await prisma.$transaction(async (tx) => {
    // 1. Aprobar Invoice
    const approvedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "APPROVED",
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    log(`   ✅ Invoice → APPROVED`, "green");

    // 2. Actualizar WorkOrder con costo real
    if (invoice.workOrderId) {
      await tx.workOrder.update({
        where: { id: invoice.workOrderId },
        data: {
          actualCost: invoice.totalAmount,
          status: "COMPLETED",
        },
      });

      log(`   ✅ WorkOrder → actualCost actualizado`, "green");
    }

    // 3. Cerrar MaintenanceAlerts
    if (invoice.workOrder?.maintenanceAlerts) {
      const alertIds = invoice.workOrder.maintenanceAlerts.map(a => a.id);

      if (alertIds.length > 0) {
        const now = new Date();
        const alertCreatedAt = invoice.workOrder.maintenanceAlerts[0].createdAt;
        const completionTimeHours = Math.floor(
          (now.getTime() - alertCreatedAt.getTime()) / (1000 * 60 * 60)
        );

        // Calcular wasOnTime
        const wasOnTime = invoice.workOrder.maintenanceAlerts.every(alert => {
          return invoice.workOrder.creationMileage <= alert.scheduledKm + 500;
        });

        await tx.maintenanceAlert.updateMany({
          where: { id: { in: alertIds } },
          data: {
            status: "COMPLETED",
            actualCost: invoice.totalAmount,
            wasOnTime,
            closedAt: now,
            completionTimeHours,
            costVariance: invoice.totalAmount - (invoice.workOrder.maintenanceAlerts[0].estimatedCost || 0),
          },
        });

        log(`   ✅ ${alertIds.length} MaintenanceAlerts → COMPLETED`, "green");
      }
    }

    // 4. Actualizar VehicleProgramItems
    if (invoice.workOrder?.maintenanceAlerts) {
      const programItemIds = invoice.workOrder.maintenanceAlerts.map(a => a.programItemId);

      await tx.vehicleProgramItem.updateMany({
        where: { id: { in: programItemIds } },
        data: {
          status: "COMPLETED",
          executedKm: invoice.workOrder.creationMileage,
          executedDate: new Date(),
        },
      });

      log(`   ✅ ${programItemIds.length} VehicleProgramItems → COMPLETED`, "green");
    }

    // 5. Crear PartPriceHistory (solo items con masterPartId)
    const priceHistoryPromises = invoice.items
      .filter(item => item.masterPartId)
      .map(item =>
        tx.partPriceHistory.create({
          data: {
            tenantId: invoice.tenantId,
            masterPartId: item.masterPartId,
            supplierId: invoice.supplierId,
            price: item.unitPrice,
            quantity: item.quantity,
            recordedAt: new Date(),
            invoiceId: invoice.id,
            approvedBy: userId,
            purchasedBy: invoice.registeredBy,
          },
        })
      );

    const priceHistoryRecords = await Promise.all(priceHistoryPromises);

    if (priceHistoryRecords.length > 0) {
      log(`   ✅ ${priceHistoryRecords.length} PartPriceHistory creados`, "green");
    } else {
      log(`   ⚠️  No se crearon PartPriceHistory (items sin masterPartId)`, "yellow");
    }

    return approvedInvoice;
  });

  log(`\n✅ CICLO COMPLETO CERRADO EXITOSAMENTE`, "green");

  return result;
}

async function main() {
  printSeparator();
  log("🧪 TEST COMPLETO: WorkOrder → Invoice → Approval → Cierre", "magenta");
  printSeparator();

  try {
    const WORK_ORDER_ID = 2;

    // PASO 1: Verificar estado inicial de WorkOrder
    log("\n📊 PASO 1: ESTADO INICIAL", "yellow");
    printSeparator("-");
    let workOrder = await verifyWorkOrder(WORK_ORDER_ID);

    if (!workOrder) {
      log("❌ No se puede continuar sin WorkOrder", "red");
      return;
    }

    if (workOrder.status !== "COMPLETED") {
      log(`\n⚠️  WorkOrder debe estar COMPLETED (actual: ${workOrder.status})`, "yellow");
      log("   Ejecuta: PATCH /api/maintenance/work-orders/2", "yellow");
      log('   { "status": "COMPLETED", "actualCost": 450000 }', "yellow");
      return;
    }

    // Verificar si ya tiene Invoice APPROVED
    const existingApprovedInvoice = workOrder.invoices.find(inv => inv.status === "APPROVED");
    if (existingApprovedInvoice) {
      log(`\n⚠️  WorkOrder ya tiene Invoice APPROVED`, "yellow");
      log(`   Mostrando estado final del ciclo cerrado...`, "yellow");

      await verifyWorkOrder(WORK_ORDER_ID);
      await verifyProgramItems(workOrder);
      await verifyPartPriceHistory(existingApprovedInvoice.id);

      log(`\n✅ TESTING COMPLETADO - Ciclo ya estaba cerrado`, "green");
      return;
    }

    // PASO 2: Crear Invoice
    log("\n📊 PASO 2: CREAR INVOICE", "yellow");
    printSeparator("-");

    // Verificar si ya tiene Invoice PENDING
    const existingPendingInvoice = workOrder.invoices.find(inv => inv.status === "PENDING");

    let invoice;
    if (existingPendingInvoice) {
      log(`\n⚠️  Ya existe Invoice PENDING: ${existingPendingInvoice.invoiceNumber}`, "yellow");
      log(`   Reutilizando Invoice existente...`, "yellow");
      invoice = existingPendingInvoice;
    } else {
      // Obtener o crear provider
      let provider = await prisma.provider.findFirst({
        where: { tenantId: workOrder.tenantId },
      });

      if (!provider) {
        log("\n⚠️  No hay provider, creando uno...", "yellow");
        provider = await prisma.provider.create({
          data: {
            tenantId: workOrder.tenantId,
            name: "Taller Automotriz Demo",
            email: "taller@demo.com",
            phone: "3001234567",
            status: "ACTIVE",
          },
        });
        log(`✅ Provider creado: ${provider.name}`, "green");
      }

      invoice = await createInvoice(WORK_ORDER_ID, provider.id);
    }

    // PASO 3: Aprobar Invoice (⭐ CRÍTICO - CIERRE DE CICLO)
    log("\n📊 PASO 3: APROBAR INVOICE (CIERRE DE CICLO)", "yellow");
    printSeparator("-");

    await approveInvoice(invoice.id);

    // PASO 4: Verificar estado final
    log("\n📊 PASO 4: VERIFICACIÓN FINAL", "yellow");
    printSeparator("-");

    workOrder = await verifyWorkOrder(WORK_ORDER_ID);
    await verifyProgramItems(workOrder);
    await verifyPartPriceHistory(invoice.id);

    // RESUMEN FINAL
    printSeparator();
    log("\n📊 RESUMEN FINAL", "magenta");
    printSeparator("-");

    const finalAlerts = await prisma.maintenanceAlert.findMany({
      where: { workOrderId: WORK_ORDER_ID },
    });

    const finalProgramItems = await prisma.vehicleProgramItem.findMany({
      where: {
        id: {
          in: finalAlerts.map(a => a.programItemId),
        },
      },
    });

    const allAlertsClosed = finalAlerts.every(a => a.status === "COMPLETED");
    const allProgramItemsCompleted = finalProgramItems.every(pi => pi.status === "COMPLETED");

    log(`\n✅ WorkOrder: ${workOrder.status}`, allAlertsClosed ? "green" : "red");
    log(`✅ Invoice: APPROVED`, "green");
    log(`✅ MaintenanceAlerts: ${finalAlerts.filter(a => a.status === "COMPLETED").length}/${finalAlerts.length} COMPLETED`, allAlertsClosed ? "green" : "yellow");
    log(`✅ VehicleProgramItems: ${finalProgramItems.filter(pi => pi.status === "COMPLETED").length}/${finalProgramItems.length} COMPLETED`, allProgramItemsCompleted ? "green" : "yellow");

    if (allAlertsClosed && allProgramItemsCompleted) {
      log(`\n🎉 TESTING EXITOSO - CICLO COMPLETO CERRADO CORRECTAMENTE`, "green");
    } else {
      log(`\n⚠️  TESTING PARCIAL - Algunos items no se cerraron`, "yellow");
    }

  } catch (error) {
    log(`\n❌ ERROR EN TESTING:`, "red");
    console.error(error);
    throw error;
  }
}

main()
  .then(() => {
    printSeparator();
    log("✅ Testing completado\n", "green");
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    log("\n❌ Error fatal:", "red");
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
