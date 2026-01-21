import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type FleetVehicleStatus = {
  id: number;
  licensePlate: string;
  photo: string | null;
  brandName: string;
  lineName: string;
  typeName: string;
  currentMileage: number;
  // Alertas de mantenimiento
  maintenanceAlerts: {
    total: number;
    critical: number; // URGENT/Vencido
    warning: number;  // MEDIUM/Próximo
  };
  // Estado del odómetro
  odometer: {
    lastUpdate: Date | null;
    daysSinceUpdate: number;
    status: 'OK' | 'WARNING' | 'CRITICAL';
  };
  // Estado combinado
  overallStatus: 'OK' | 'WARNING' | 'CRITICAL';
  // Conductor asignado (si hay)
  driverName: string | null;
};

export type FleetStatusResponse = {
  vehicles: FleetVehicleStatus[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    ok: number;
  };
  thresholds: {
    warningDays: number;
    criticalDays: number;
  };
};

// Configuración de umbrales (días sin reporte)
const ODOMETER_WARNING_DAYS = 5;
const ODOMETER_CRITICAL_DAYS = 10;

export async function GET() {
  try {
    // TODO: Obtener tenantId de la sesión
    const tenantId = "cf68b103-12fd-4208-a352-42379ef3b6e1";

    // Obtener todos los vehículos activos con sus datos relacionados
    const vehicles = await prisma.vehicle.findMany({
      where: {
        tenantId: tenantId,
        status: "ACTIVE",
      },
      include: {
        brand: { select: { name: true } },
        line: { select: { name: true } },
        type: { select: { name: true } },
        vehicleDrivers: {
          where: { status: "ACTIVE", isPrimary: true },
          include: { driver: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: {
        licensePlate: "asc",
      },
    });

    // Obtener alertas de mantenimiento agrupadas por vehículo
    const alertsByVehicle = await prisma.maintenanceAlert.groupBy({
      by: ["vehicleId", "priority"],
      where: {
        tenantId: tenantId,
        status: { in: ["PENDING", "ACKNOWLEDGED", "IN_PROGRESS"] },
      },
      _count: true,
    });

    // Obtener último registro de odómetro por vehículo
    const lastOdometerByVehicle = await prisma.odometerLog.findMany({
      where: {
        vehicle: { tenantId: tenantId },
      },
      orderBy: { recordedAt: "desc" },
      distinct: ["vehicleId"],
      select: {
        vehicleId: true,
        recordedAt: true,
        kilometers: true,
      },
    });

    // Crear mapa de alertas por vehículo
    const alertsMap = new Map<number, { critical: number; warning: number }>();
    alertsByVehicle.forEach((alert) => {
      const current = alertsMap.get(alert.vehicleId) || { critical: 0, warning: 0 };
      // URGENT es crítico, MEDIUM y LOW son warning
      if (alert.priority === "URGENT") {
        current.critical += alert._count;
      } else {
        current.warning += alert._count;
      }
      alertsMap.set(alert.vehicleId, current);
    });

    // Crear mapa de último odómetro por vehículo
    const odometerMap = new Map<number, { recordedAt: Date; kilometers: number }>();
    lastOdometerByVehicle.forEach((log) => {
      odometerMap.set(log.vehicleId, {
        recordedAt: log.recordedAt,
        kilometers: log.kilometers || 0,
      });
    });

    const now = new Date();

    // Procesar cada vehículo
    const fleetStatus: FleetVehicleStatus[] = vehicles.map((vehicle) => {
      const alerts = alertsMap.get(vehicle.id) || { critical: 0, warning: 0 };
      const lastOdometer = odometerMap.get(vehicle.id);

      // Calcular días desde última actualización de odómetro
      let daysSinceUpdate = 999; // Si nunca se ha registrado
      let odometerStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'CRITICAL';

      if (lastOdometer) {
        const diffTime = now.getTime() - lastOdometer.recordedAt.getTime();
        daysSinceUpdate = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (daysSinceUpdate <= ODOMETER_WARNING_DAYS) {
          odometerStatus = 'OK';
        } else if (daysSinceUpdate <= ODOMETER_CRITICAL_DAYS) {
          odometerStatus = 'WARNING';
        } else {
          odometerStatus = 'CRITICAL';
        }
      }

      // Determinar estado de mantenimiento
      let maintenanceStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
      if (alerts.critical > 0) {
        maintenanceStatus = 'CRITICAL';
      } else if (alerts.warning > 0) {
        maintenanceStatus = 'WARNING';
      }

      // Estado combinado: el peor de los dos
      let overallStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
      if (maintenanceStatus === 'CRITICAL' || odometerStatus === 'CRITICAL') {
        overallStatus = 'CRITICAL';
      } else if (maintenanceStatus === 'WARNING' || odometerStatus === 'WARNING') {
        overallStatus = 'WARNING';
      }

      // Obtener conductor primario
      const primaryDriver = vehicle.vehicleDrivers[0]?.driver?.name || null;

      return {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        photo: vehicle.photo,
        brandName: vehicle.brand?.name || "Sin marca",
        lineName: vehicle.line?.name || "Sin línea",
        typeName: vehicle.type?.name || "Sin tipo",
        currentMileage: vehicle.mileage || lastOdometer?.kilometers || 0,
        maintenanceAlerts: {
          total: alerts.critical + alerts.warning,
          critical: alerts.critical,
          warning: alerts.warning,
        },
        odometer: {
          lastUpdate: lastOdometer?.recordedAt || null,
          daysSinceUpdate,
          status: odometerStatus,
        },
        overallStatus,
        driverName: primaryDriver,
      };
    });

    // Ordenar por estado (críticos primero, luego warning, luego ok)
    fleetStatus.sort((a, b) => {
      const statusOrder = { CRITICAL: 0, WARNING: 1, OK: 2 };
      return statusOrder[a.overallStatus] - statusOrder[b.overallStatus];
    });

    // Calcular resumen
    const summary = {
      total: fleetStatus.length,
      critical: fleetStatus.filter((v) => v.overallStatus === "CRITICAL").length,
      warning: fleetStatus.filter((v) => v.overallStatus === "WARNING").length,
      ok: fleetStatus.filter((v) => v.overallStatus === "OK").length,
    };

    const response: FleetStatusResponse = {
      vehicles: fleetStatus,
      summary,
      thresholds: {
        warningDays: ODOMETER_WARNING_DAYS,
        criticalDays: ODOMETER_CRITICAL_DAYS,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[FLEET_STATUS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
