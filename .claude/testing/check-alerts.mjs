/**
 * Ver MaintenanceAlerts disponibles para crear WorkOrders
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
  log("\n🚨 Verificando MaintenanceAlerts...\n", "cyan");

  const alerts = await prisma.maintenanceAlert.findMany({
    include: {
      vehicle: {
        select: {
          licensePlate: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (alerts.length === 0) {
    log("❌ No hay MaintenanceAlerts en la DB", "red");
    log("\n💡 Necesitas crear alertas primero. ¿Tienes vehículos con programas de mantenimiento?", "yellow");

    // Verificar vehículos
    const vehicles = await prisma.vehicle.count();
    log(`\n📊 Vehículos en DB: ${vehicles}`, "cyan");

    if (vehicles > 0) {
      const vehiclesWithPrograms = await prisma.vehicleMantProgram.count();
      log(`📊 Vehículos con programas: ${vehiclesWithPrograms}`, "cyan");

      if (vehiclesWithPrograms === 0) {
        log("\n⚠️  No hay programas de mantenimiento asignados a vehículos", "yellow");
        log("   Necesitas asignar un VehicleMantProgram primero", "yellow");
      }
    }

    return;
  }

  log(`✅ Total: ${alerts.length} MaintenanceAlerts\n`, "green");

  // Agrupar por status
  const grouped = {};
  alerts.forEach(alert => {
    if (!grouped[alert.status]) grouped[alert.status] = [];
    grouped[alert.status].push(alert);
  });

  log("📊 Por Status:", "yellow");
  Object.keys(grouped).forEach(status => {
    log(`   ${status}: ${grouped[status].length}`, "cyan");
  });

  log("\n" + "=".repeat(70) + "\n", "cyan");

  // Alertas disponibles para crear WO
  const available = alerts.filter(a =>
    ["PENDING", "ACKNOWLEDGED", "SNOOZED"].includes(a.status)
  );

  if (available.length > 0) {
    log(`✅ ${available.length} alertas disponibles para crear WorkOrders:\n`, "green");

    available.forEach((alert, index) => {
      log(`${index + 1}. Alert #${alert.id} [${alert.status}] - ${alert.vehicle?.licensePlate}`, "blue");
      log(`   Item: ${alert.itemName}`);
      log(`   Type: ${alert.type} | Priority: ${alert.priority}`);
      log(`   Scheduled: ${alert.scheduledKm} km`);
      log(`   Estimated Cost: $${alert.estimatedCost}`);
      log(`   Created: ${alert.createdAt.toISOString()}`);
      log("");
    });

    log("\n💡 Para crear una WorkOrder con estas alertas:", "yellow");
    log("   POST /api/maintenance/work-orders", "cyan");
    log(`   {`, "cyan");
    log(`     "vehicleId": ${available[0].vehicleId},`, "cyan");
    log(`     "alertIds": [${available.slice(0, 3).map(a => a.id).join(", ")}],`, "cyan");
    log(`     "title": "Mantenimiento preventivo",`, "cyan");
    log(`     "description": "Mantenimiento programado",`, "cyan");
    log(`     "technicianId": null,`, "cyan");
    log(`     "providerId": null`, "cyan");
    log(`   }`, "cyan");
  } else {
    log("⚠️  No hay alertas disponibles (todas están IN_PROGRESS, COMPLETED o DISMISSED)", "yellow");

    // Mostrar todas para debugging
    log("\n📋 Todas las alertas:", "cyan");
    alerts.forEach((alert, index) => {
      log(`${index + 1}. Alert #${alert.id} [${alert.status}] - ${alert.itemName}`, "yellow");
    });
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
