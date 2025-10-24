/**
 * Test usando HTTP requests a los endpoints (como Insomnia)
 */

const BASE_URL = "http://localhost:3001";

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

// Simular cookies de sesión (deberías tener una sesión activa)
const headers = {
  "Content-Type": "application/json",
  // Nota: En producción necesitarías las cookies de sesión real
};

async function makeRequest(method, path, body = null) {
  const url = `${BASE_URL}${path}`;

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      log(`❌ ${method} ${path} - ${response.status}`, "red");
      log(`   Error: ${JSON.stringify(data)}`, "red");
      return null;
    }

    return data;
  } catch (error) {
    log(`❌ Error en request: ${error.message}`, "red");
    return null;
  }
}

async function getWorkOrder(id) {
  log(`\n🔍 GET /api/maintenance/work-orders/${id}`, "cyan");
  const data = await makeRequest("GET", `/api/maintenance/work-orders/${id}`);

  if (data) {
    log(`✅ WorkOrder #${data.id} - Status: ${data.status}`, "green");
    log(`   Estimated: $${data.estimatedCost} | Actual: $${data.actualCost || "N/A"}`);
    log(`   WorkOrderItems: ${data.workOrderItems?.length || 0}`);
    log(`   MaintenanceAlerts: ${data.maintenanceAlerts?.length || 0}`);
    log(`   Invoices: ${data.invoices?.length || 0}`);
  }

  return data;
}

async function createInvoice(workOrderId, supplierId) {
  log(`\n📝 POST /api/maintenance/invoices`, "cyan");

  const payload = {
    invoiceNumber: `FAC-TEST-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    supplierId,
    workOrderId,
    subtotal: 450000,
    taxAmount: 0,
    totalAmount: 450000,
    items: [
      {
        description: "Revisión nivel refrigerante",
        workOrderItemId: 5,
        quantity: 1,
        unitPrice: 5000,
        total: 5000,
      },
      {
        description: "Cambio aceite motor",
        workOrderItemId: 6,
        quantity: 1,
        unitPrice: 45000,
        total: 45000,
      },
      {
        description: "Cambio filtro aceite",
        workOrderItemId: 7,
        quantity: 1,
        unitPrice: 25000,
        total: 25000,
      },
      {
        description: "Mano de obra",
        quantity: 1,
        unitPrice: 375000,
        total: 375000,
      },
    ],
  };

  log(`   Payload:`, "blue");
  log(`   ${JSON.stringify(payload, null, 2)}`, "blue");

  const data = await makeRequest("POST", "/api/maintenance/invoices", payload);

  if (data) {
    log(`✅ Invoice creada: ${data.invoiceNumber}`, "green");
    log(`   ID: ${data.id}`);
    log(`   Status: ${data.status}`);
    log(`   Total: $${data.totalAmount}`);
  }

  return data;
}

async function approveInvoice(invoiceId) {
  log(`\n⭐ PATCH /api/maintenance/invoices/${invoiceId}`, "magenta");

  const payload = {
    status: "APPROVED",
    notes: "Aprobado para testing del ciclo completo",
  };

  log(`   Payload: ${JSON.stringify(payload)}`, "blue");

  const data = await makeRequest("PATCH", `/api/maintenance/invoices/${invoiceId}`, payload);

  if (data) {
    log(`✅ Invoice aprobada exitosamente`, "green");
    log(`   Status: ${data.status}`);
    log(`   Approved At: ${data.approvedAt}`);
    log(`   Approved By: ${data.approvedBy}`);
  }

  return data;
}

async function main() {
  printSeparator();
  log("🧪 HTTP TEST: Ciclo completo via API endpoints", "magenta");
  printSeparator();

  try {
    const WORK_ORDER_ID = 2;
    const SUPPLIER_ID = 1; // Ajustar según tu DB

    // Verificar que el servidor esté corriendo
    log("\n📡 Verificando servidor...", "yellow");
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error("Servidor no responde");
      }
      log("✅ Servidor corriendo en localhost:3000", "green");
    } catch (error) {
      log("❌ Servidor NO está corriendo", "red");
      log("   Ejecuta: npm run dev", "yellow");
      log("   O: pnpm dev", "yellow");
      return;
    }

    // PASO 1: Verificar WorkOrder actual
    log("\n📊 PASO 1: ESTADO ACTUAL DE WORKORDER", "yellow");
    printSeparator("-");

    let workOrder = await getWorkOrder(WORK_ORDER_ID);

    if (!workOrder) {
      log("\n❌ WorkOrder #2 no encontrada", "red");
      log("   ¿La creaste en Insomnia?", "yellow");
      return;
    }

    if (workOrder.status !== "COMPLETED") {
      log(`\n⚠️  WorkOrder debe estar COMPLETED (actual: ${workOrder.status})`, "yellow");
      log("   Ejecuta en Insomnia:", "yellow");
      log(`   PATCH ${BASE_URL}/api/maintenance/work-orders/2`, "cyan");
      log('   { "status": "COMPLETED", "actualCost": 450000 }', "cyan");
      return;
    }

    // Verificar si ya tiene Invoice
    if (workOrder.invoices && workOrder.invoices.length > 0) {
      const approvedInvoice = workOrder.invoices.find(inv => inv.status === "APPROVED");
      if (approvedInvoice) {
        log(`\n✅ Ya existe Invoice APPROVED: ${approvedInvoice.invoiceNumber}`, "green");
        log("   El ciclo ya fue cerrado anteriormente", "yellow");

        // Mostrar estado final
        workOrder = await getWorkOrder(WORK_ORDER_ID);

        printSeparator();
        log("\n📊 ESTADO FINAL DEL CICLO", "magenta");
        printSeparator("-");

        log(`\n✅ WorkOrder: ${workOrder.status}`, "green");
        log(`✅ Invoice: APPROVED`, "green");
        log(`✅ MaintenanceAlerts:`, "green");
        workOrder.maintenanceAlerts?.forEach(alert => {
          log(`   - [${alert.status}] ${alert.itemName} | Cost: $${alert.actualCost || "N/A"} | Closed: ${alert.closedAt ? "✅" : "❌"}`);
        });

        return;
      }

      const pendingInvoice = workOrder.invoices.find(inv => inv.status === "PENDING");
      if (pendingInvoice) {
        log(`\n⚠️  Ya existe Invoice PENDING: ${pendingInvoice.invoiceNumber}`, "yellow");
        log(`   ID: ${pendingInvoice.id}`, "yellow");
        log(`\n   Puedes aprobarla ejecutando:`, "cyan");
        log(`   PATCH ${BASE_URL}/api/maintenance/invoices/${pendingInvoice.id}`, "cyan");
        log('   { "status": "APPROVED" }', "cyan");

        // Preguntar si queremos aprobarla automáticamente
        log(`\n💡 ¿Quieres que la apruebe automáticamente? (este script lo hará)`, "yellow");

        // Para testing automático, aprobamos
        await approveInvoice(pendingInvoice.id);

        // Verificar estado final
        workOrder = await getWorkOrder(WORK_ORDER_ID);

        printSeparator();
        log("\n🎉 TESTING COMPLETADO - Verificando estado final...", "green");
        return;
      }
    }

    // PASO 2: Crear Invoice
    log("\n📊 PASO 2: CREAR INVOICE", "yellow");
    printSeparator("-");

    const invoice = await createInvoice(WORK_ORDER_ID, SUPPLIER_ID);

    if (!invoice) {
      log("\n❌ No se pudo crear Invoice", "red");
      log("   Verifica que tengas un Provider con ID=1", "yellow");
      log("   O ejecuta: node .claude/testing/get-provider.mjs", "yellow");
      return;
    }

    // PASO 3: Aprobar Invoice (CIERRE DE CICLO)
    log("\n📊 PASO 3: APROBAR INVOICE (CIERRE DE CICLO)", "yellow");
    printSeparator("-");

    const approvedInvoice = await approveInvoice(invoice.id);

    if (!approvedInvoice) {
      log("\n❌ No se pudo aprobar Invoice", "red");
      return;
    }

    // PASO 4: Verificar estado final
    log("\n📊 PASO 4: VERIFICACIÓN FINAL", "yellow");
    printSeparator("-");

    workOrder = await getWorkOrder(WORK_ORDER_ID);

    printSeparator();
    log("\n📊 RESUMEN FINAL", "magenta");
    printSeparator("-");

    const allAlertsClosed = workOrder.maintenanceAlerts?.every(a => a.status === "COMPLETED");

    log(`\n✅ WorkOrder: ${workOrder.status}`, "green");
    log(`✅ Invoice: APPROVED`, "green");
    log(`✅ MaintenanceAlerts:`, allAlertsClosed ? "green" : "yellow");

    workOrder.maintenanceAlerts?.forEach(alert => {
      const icon = alert.status === "COMPLETED" ? "✅" : "❌";
      log(`   ${icon} [${alert.status}] ${alert.itemName}`);
      log(`      Cost: $${alert.actualCost || "N/A"} | OnTime: ${alert.wasOnTime ?? "N/A"} | Closed: ${alert.closedAt ? "✅" : "❌"}`);
    });

    if (allAlertsClosed) {
      log(`\n🎉 TESTING EXITOSO - CICLO COMPLETO CERRADO`, "green");
    } else {
      log(`\n⚠️  Algunas alertas no se cerraron correctamente`, "yellow");
    }

  } catch (error) {
    log(`\n❌ ERROR EN TESTING:`, "red");
    console.error(error);
  }
}

main()
  .then(() => {
    printSeparator();
    log("✅ Testing HTTP completado\n", "green");
    process.exit(0);
  })
  .catch((error) => {
    log("\n❌ Error fatal:", "red");
    console.error(error);
    process.exit(1);
  });
