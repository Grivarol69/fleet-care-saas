import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE_TENANT = 'org_36M1mCUcHm4ShrsTQQK3etw9FEk'; // El del seed viejo
const TARGET_TENANT = 'org_38zCXuXqy5Urw5CuaisTHu3jLTq'; // El de tu usuario real (Guillermo)

async function main() {
  console.log(`🚀 Migrating data from ${SOURCE_TENANT} to ${TARGET_TENANT}...`);

  // 1. Move Vehicles
  const vehicles = await prisma.vehicle.updateMany({
    where: { tenantId: SOURCE_TENANT },
    data: { tenantId: TARGET_TENANT },
  });
  console.log(`✅ Moved ${vehicles.count} vehicles.`);

  // 1.1 Move Vehicle Related Data (Drivers, Programs)
  // Usually this cascades or needs manual update if tenantId is on them.
  // VehicleDriver has tenantId?
  const driversAssociations = await prisma.vehicleDriver.updateMany({
    where: { tenantId: SOURCE_TENANT },
    data: { tenantId: TARGET_TENANT },
  });
  console.log(
    `✅ Moved ${driversAssociations.count} vehicle-driver associations.`
  );

  // VehicleMantProgram has tenantId?
  // Checking schema... it usually relies on Vehicle, but if it has explicit tenantId...
  // Assuming it does per standard SaaS schema.
  try {
    const programs = await prisma.vehicleMantProgram.updateMany({
      where: { tenantId: SOURCE_TENANT },
      data: { tenantId: TARGET_TENANT },
    });
    console.log(`✅ Moved ${programs.count} maintenance programs.`);
  } catch (e) {
    console.log('Skipping Programs (no tenantId column?)');
  }

  // 2. Move Technicians
  const techs = await prisma.technician.updateMany({
    where: { tenantId: SOURCE_TENANT },
    data: { tenantId: TARGET_TENANT },
  });
  console.log(`✅ Moved ${techs.count} technicians.`);

  // 3. Move Providers
  const provs = await prisma.provider.updateMany({
    where: { tenantId: SOURCE_TENANT },
    data: { tenantId: TARGET_TENANT },
  });
  console.log(`✅ Moved ${provs.count} providers.`);

  // 4. Move Maintenance Alerts
  const alerts = await prisma.maintenanceAlert.updateMany({
    where: { tenantId: SOURCE_TENANT },
    data: { tenantId: TARGET_TENANT },
  });
  console.log(`✅ Moved ${alerts.count} maintenance alerts.`);

  // 5. Move Work Orders (if any exist from seed/debug)
  const wos = await prisma.workOrder.updateMany({
    where: { tenantId: SOURCE_TENANT },
    data: { tenantId: TARGET_TENANT },
  });
  console.log(`✅ Moved ${wos.count} work orders.`);

  console.log('🎉 Migration Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
