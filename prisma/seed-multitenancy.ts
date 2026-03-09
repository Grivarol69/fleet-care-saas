import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedHino300Dutro } from './seeds/hino-300-dutro';
import { seedInternational7400WorkStar } from './seeds/international-7400-workstar';
import { seedTemparioAutomotriz } from './seeds/tempario-automotriz';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ========================================
// IDs - Usar el ID de Clerk para demo
// ========================================
const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_TENANT_ID =
  process.env.DEMO_TENANT_ID || 'org_3AaUgIFnMhblTZ83zNzyerKq9NB'; // Tu org de Clerk
const ALL_TENANT_IDS = [PLATFORM_TENANT_ID, DEMO_TENANT_ID];

// ========================================
// HELPER: Create maintenance program for a vehicle from a template
// ========================================
async function createProgramFromTemplate(
  tenantId: string,
  vehicleId: string,
  vehicleName: string,
  templateId: string,
  templateName: string,
  assignmentKm: number,
  currentMileage: number,
  generatedBy: string
) {
  // Fetch template packages with their items
  const templatePackages = await prisma.maintenancePackage.findMany({
    where: { templateId },
    include: { packageItems: true },
    orderBy: { triggerKm: 'asc' },
  });

  // Calculate next maintenance km
  let nextMaintenanceKm: number | null = null;
  let nextMaintenanceDesc: string | null = null;
  for (const pkg of templatePackages) {
    if (pkg.triggerKm && pkg.triggerKm > currentMileage) {
      nextMaintenanceKm = pkg.triggerKm;
      nextMaintenanceDesc = pkg.name;
      break;
    }
  }
  // If all packages are below mileage, next is last triggerKm + 5000
  if (!nextMaintenanceKm && templatePackages.length > 0) {
    const lastPkg = templatePackages[templatePackages.length - 1];
    if (lastPkg.triggerKm) {
      nextMaintenanceKm = lastPkg.triggerKm + 5000;
      nextMaintenanceDesc = `Siguiente mantenimiento (${nextMaintenanceKm.toLocaleString()} km)`;
    }
  }

  const program = await prisma.vehicleMantProgram.create({
    data: {
      tenantId,
      vehicleId,
      name: `Programa ${vehicleName}`,
      description: `Programa de mantenimiento basado en ${templateName}`,
      generatedFrom: `Template: ${templateName}`,
      generatedBy,
      assignmentKm,
      nextMaintenanceKm,
      nextMaintenanceDesc,
      isActive: true,
      status: 'ACTIVE',
    },
  });

  // Create packages and items
  for (const tPkg of templatePackages) {
    const pkgKm = tPkg.triggerKm ?? 0;
    const pkgStatus = pkgKm <= currentMileage ? 'COMPLETED' : 'PENDING';

    const vPkg = await prisma.vehicleProgramPackage.create({
      data: {
        tenantId,
        programId: program.id,
        name: tPkg.name,
        description: tPkg.description,
        triggerKm: tPkg.triggerKm,
        packageType: tPkg.packageType,
        priority: tPkg.priority,
        estimatedCost: tPkg.estimatedCost,
        estimatedTime: tPkg.estimatedTime,
        status: pkgStatus as 'COMPLETED' | 'PENDING',
        scheduledKm: tPkg.triggerKm,
        executedKm: pkgStatus === 'COMPLETED' ? pkgKm : undefined,
        startDate:
          pkgStatus === 'COMPLETED'
            ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            : undefined,
        endDate:
          pkgStatus === 'COMPLETED'
            ? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
            : undefined,
      },
    });

    for (const tItem of tPkg.packageItems) {
      await prisma.vehicleProgramItem.create({
        data: {
          tenantId,
          packageId: vPkg.id,
          mantItemId: tItem.mantItemId,
          mantType: tPkg.packageType,
          priority: tItem.priority,
          order: tItem.order,
          scheduledKm: tItem.triggerKm,
          executedKm: pkgStatus === 'COMPLETED' ? tItem.triggerKm : undefined,
          estimatedTime: tItem.estimatedTime,
          status: pkgStatus as 'COMPLETED' | 'PENDING',
          isOptional: tItem.isOptional,
        },
      });
    }
  }

  return program;
}

async function main() {
  console.log('==============================================');
  console.log('  SEED MULTI-TENANT - Fleet Care SaaS');
  console.log('==============================================\n');

  // ========================================
  // STEP 1: CLEANUP
  // ========================================
  console.log('1. CLEANUP - Borrando datos existentes...\n');

  // Delete in FK-safe order
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.ticketPartEntry.deleteMany({});
  await prisma.ticketLaborEntry.deleteMany({});
  await prisma.internalWorkTicket.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.invoicePayment.deleteMany({});
  await prisma.partPriceHistory.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.financialAlert.deleteMany({});
  await prisma.maintenanceAlert.deleteMany({});
  await prisma.expenseAuditLog.deleteMany({});
  await prisma.workOrderApproval.deleteMany({});
  await prisma.workOrderExpense.deleteMany({});
  await prisma.workOrderItem.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.vehicleProgramItem.deleteMany({});
  await prisma.vehicleProgramPackage.deleteMany({});
  await prisma.vehicleMantProgram.deleteMany({});
  await prisma.vehicleDriver.deleteMany({});
  await prisma.odometerLog.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.technician.deleteMany({});
  await prisma.provider.deleteMany({});
  await prisma.mantItemRequest.deleteMany({});
  await prisma.mantItemVehiclePart.deleteMany({});
  await prisma.mantItemPart.deleteMany({});
  await prisma.packageItem.deleteMany({});
  await prisma.maintenancePackage.deleteMany({});
  await prisma.maintenanceTemplate.deleteMany({});
  await prisma.mantItem.deleteMany({});
  await prisma.mantCategory.deleteMany({});
  await prisma.partCompatibility.deleteMany({});
  await prisma.masterPart.deleteMany({});
  await prisma.documentTypeConfig.deleteMany({});
  await prisma.vehicleLine.deleteMany({});
  await prisma.vehicleBrand.deleteMany({});
  await prisma.vehicleType.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('   Cleanup completo.\n');

  // ========================================
  // STEP 2: GLOBAL KNOWLEDGE BASE
  // ========================================
  console.log('2. KNOWLEDGE BASE GLOBAL (tenantId: null, isGlobal: true)...\n');

  // --- BRANDS ---
  console.log('   Creando brands...');
  const brands = await Promise.all([
    prisma.vehicleBrand.create({
      data: { name: 'Toyota', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Ford', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Chevrolet', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Nissan', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Mitsubishi', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Renault', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleBrand.create({
      data: { name: 'Dongfeng', isGlobal: true, tenantId: null },
    }),
  ]);
  const [toyota, ford, chevrolet, nissan, mitsubishi, renault, dongfeng] =
    brands;

  // --- LINES ---
  console.log('   Creando lines...');
  const lines = await Promise.all([
    // Toyota [0-2]
    prisma.vehicleLine.create({
      data: {
        name: 'Hilux',
        brandId: toyota.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Land Cruiser',
        brandId: toyota.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Prado',
        brandId: toyota.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Ford [3-5]
    prisma.vehicleLine.create({
      data: {
        name: 'Ranger',
        brandId: ford.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: { name: 'F-150', brandId: ford.id, isGlobal: true, tenantId: null },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Transit',
        brandId: ford.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Chevrolet [6-9]
    prisma.vehicleLine.create({
      data: {
        name: 'D-MAX',
        brandId: chevrolet.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Colorado',
        brandId: chevrolet.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Silverado',
        brandId: chevrolet.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'NPR',
        brandId: chevrolet.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Nissan [10-11]
    prisma.vehicleLine.create({
      data: {
        name: 'Frontier',
        brandId: nissan.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Navara',
        brandId: nissan.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Mitsubishi [12-13]
    prisma.vehicleLine.create({
      data: {
        name: 'L200',
        brandId: mitsubishi.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Montero',
        brandId: mitsubishi.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Renault [14-15]
    prisma.vehicleLine.create({
      data: {
        name: 'Duster',
        brandId: renault.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.vehicleLine.create({
      data: {
        name: 'Oroch',
        brandId: renault.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Dongfeng [16]
    prisma.vehicleLine.create({
      data: {
        name: 'Rich 6 EV',
        brandId: dongfeng.id,
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);
  const [
    hilux,
    landCruiser,
    ,
    ranger,
    ,
    ,
    dmax,
    colorado,
    ,
    ,
    frontier,
    ,
    l200,
    ,
    duster,
    oroch,
    rich6ev,
  ] = lines;

  // --- TYPES ---
  console.log('   Creando types...');
  const types = await Promise.all([
    prisma.vehicleType.create({
      data: { name: 'Camioneta 4x4', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'Camion de Carga', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'Camioneta Pasajeros', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'Vehiculo Urbano', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'SUV', isGlobal: true, tenantId: null },
    }),
  ]);
  const [type4x4, , , , typeSUV] = types;

  // --- CATEGORIES ---
  console.log('   Creando categories...');
  const cats = await Promise.all([
    prisma.mantCategory.create({
      data: {
        name: 'Motor',
        description: 'Sistema de motor y combustible',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Transmision',
        description: 'Caja de cambios y embrague',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Frenos',
        description: 'Sistema de frenado',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Suspension',
        description: 'Amortiguadores y resortes',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Electrico',
        description: 'Sistema electrico y bateria',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Lubricacion',
        description: 'Aceites y lubricantes',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Filtros',
        description: 'Filtros aire, aceite, combustible',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Neumaticos',
        description: 'Llantas y neumaticos',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Carroceria',
        description: 'Elementos de carroceria',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Sistema Termico EV',
        description: 'Enfriamiento de baterias EV y motor',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantCategory.create({
      data: {
        name: 'Alta Tension EV',
        description: 'Sistema Alta Tension Bateria Motores EV',
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);
  const [
    catMotor,
    catTransmision,
    catFrenos,
    catSuspension,
    catElectrico,
    catLubricacion,
    catFiltros,
    catNeumaticos,
    catCarroceria,
    catTermicoEV,
    catAltaTensionEV,
  ] = cats;

  // --- MANT ITEMS (17 preventivos + 16 correctivos = 33) ---
  console.log('   Creando mant items (33)...');
  const items = await Promise.all([
    // PREVENTIVOS [0-16]
    // Motor [0-2]
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite motor',
        description: 'Cambio de aceite motor sintetico',
        mantType: 'PREVENTIVE',
        categoryId: catMotor.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion sistema combustible',
        mantType: 'PREVENTIVE',
        categoryId: catMotor.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajuste valvulas',
        mantType: 'PREVENTIVE',
        categoryId: catMotor.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Filtros [3-5]
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aceite',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aire',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro combustible',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Frenos preventivo [6-7]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion pastillas freno',
        mantType: 'PREVENTIVE',
        categoryId: catFrenos.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio liquido frenos',
        mantType: 'PREVENTIVE',
        categoryId: catFrenos.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Suspension preventivo [8-9]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion amortiguadores',
        mantType: 'PREVENTIVE',
        categoryId: catSuspension.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Lubricacion rotulas',
        mantType: 'PREVENTIVE',
        categoryId: catSuspension.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Electrico preventivo [10-11]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion bateria',
        mantType: 'PREVENTIVE',
        categoryId: catElectrico.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Limpieza terminales bateria',
        mantType: 'PREVENTIVE',
        categoryId: catElectrico.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Transmision preventivo [12-13]
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite transmision',
        mantType: 'PREVENTIVE',
        categoryId: catTransmision.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajuste embrague',
        mantType: 'PREVENTIVE',
        categoryId: catTransmision.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Neumaticos preventivo [14-15]
    prisma.mantItem.create({
      data: {
        name: 'Rotacion neumaticos',
        mantType: 'PREVENTIVE',
        categoryId: catNeumaticos.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Balanceo y alineacion',
        mantType: 'PREVENTIVE',
        categoryId: catNeumaticos.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Lubricacion preventivo [16]
    prisma.mantItem.create({
      data: {
        name: 'Cambio liquido direccion hidraulica',
        mantType: 'PREVENTIVE',
        categoryId: catLubricacion.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // SUV/Duster Especificos Preventivos
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro habitaculo',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio correa accesorios',
        mantType: 'PREVENTIVE',
        categoryId: catMotor.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // EV Especificos Preventivos
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion alta tension EV',
        mantType: 'PREVENTIVE',
        categoryId: catAltaTensionEV.id,
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite engranaje reductor EV',
        mantType: 'PREVENTIVE',
        categoryId: catTransmision.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Flush liquido refrigerante EV',
        mantType: 'PREVENTIVE',
        categoryId: catTermicoEV.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),

    // CORRECTIVOS [17-32]
    // Frenos [17-20]
    prisma.mantItem.create({
      data: {
        name: 'Cambio pastillas freno delanteras',
        description: 'Reemplazo de pastillas desgastadas delanteras',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio pastillas freno traseras',
        description: 'Reemplazo de pastillas desgastadas traseras',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio discos freno',
        description: 'Reemplazo de discos de freno desgastados',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Reparacion cilindro maestro',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Motor [21-23]
    prisma.mantItem.create({
      data: {
        name: 'Cambio correa distribucion',
        mantType: 'CORRECTIVE',
        categoryId: catMotor.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Reparacion empaque culata',
        mantType: 'CORRECTIVE',
        categoryId: catMotor.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio bomba agua',
        mantType: 'CORRECTIVE',
        categoryId: catMotor.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Suspension [24-26]
    prisma.mantItem.create({
      data: {
        name: 'Cambio amortiguadores',
        mantType: 'CORRECTIVE',
        categoryId: catSuspension.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio rotulas',
        mantType: 'CORRECTIVE',
        categoryId: catSuspension.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio bujes suspension',
        mantType: 'CORRECTIVE',
        categoryId: catSuspension.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Electrico [27-29]
    prisma.mantItem.create({
      data: {
        name: 'Cambio bateria',
        mantType: 'CORRECTIVE',
        categoryId: catElectrico.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio alternador',
        mantType: 'CORRECTIVE',
        categoryId: catElectrico.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio motor arranque',
        mantType: 'CORRECTIVE',
        categoryId: catElectrico.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Transmision [30-31]
    prisma.mantItem.create({
      data: {
        name: 'Cambio kit embrague',
        mantType: 'CORRECTIVE',
        categoryId: catTransmision.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Reparacion caja cambios',
        mantType: 'CORRECTIVE',
        categoryId: catTransmision.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Neumaticos [32]
    prisma.mantItem.create({
      data: {
        name: 'Cambio neumaticos',
        mantType: 'CORRECTIVE',
        categoryId: catNeumaticos.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);
  console.log(`   ${items.length} mant items creados`);

  // Aliases for readability
  const iCambioAceite = items[0];
  const iAjusteValvulas = items[2];
  const iFiltroAceite = items[3];
  const iFiltroAire = items[4];
  const iFiltroComb = items[5];
  const iInspFreno = items[6];
  const iLiquidoFreno = items[7];
  const iInspAmort = items[8];
  const iLubRotulas = items[9];
  const iInspBateria = items[10];
  const iAceiteTransm = items[12];
  const iAjusteEmbrague = items[13];
  const iRotNeumaticos = items[14];
  const iBalanceo = items[15];
  const iLiqDireccion = items[16];
  const iFiltroHabitaculo = items[17];
  const iCorreaAccesorios = items[18];
  const iInspAltaTension = items[19];
  const iAceiteReductorEV = items[20];
  const iFlushRefriEV = items[21];
  const iPastillasDelant = items[22];

  // --- MASTER PARTS ---
  console.log('   Creando master parts...');
  const parts = await Promise.all([
    // Aceites [0-2]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'SHELL-HELIX-HX7-10W40',
        description: 'Aceite Shell Helix HX7 10W-40 Semi-Sintetico',
        category: 'LUBRICANTES',
        subcategory: 'ACEITE_MOTOR',
        unit: 'LITRO',
        referencePrice: 45000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'MOBIL-SUPER-3000-5W40',
        description: 'Aceite Mobil Super 3000 5W-40 Sintetico',
        category: 'LUBRICANTES',
        subcategory: 'ACEITE_MOTOR',
        unit: 'LITRO',
        referencePrice: 58000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'CASTROL-GTX-15W40',
        description: 'Aceite Castrol GTX 15W-40 Mineral',
        category: 'LUBRICANTES',
        subcategory: 'ACEITE_MOTOR',
        unit: 'LITRO',
        referencePrice: 35000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    // Filtros [3-7]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'BOSCH-0986AF0134',
        description: 'Filtro Aceite BOSCH 0986AF0134',
        category: 'FILTROS',
        subcategory: 'FILTRO_ACEITE',
        unit: 'UNIDAD',
        referencePrice: 28000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'MANN-W920/21',
        description: 'Filtro Aceite MANN W920/21',
        category: 'FILTROS',
        subcategory: 'FILTRO_ACEITE',
        unit: 'UNIDAD',
        referencePrice: 32000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'BOSCH-F026400364',
        description: 'Filtro Aire BOSCH F026400364',
        category: 'FILTROS',
        subcategory: 'FILTRO_AIRE',
        unit: 'UNIDAD',
        referencePrice: 42000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'MANN-C25114',
        description: 'Filtro Aire MANN C25114',
        category: 'FILTROS',
        subcategory: 'FILTRO_AIRE',
        unit: 'UNIDAD',
        referencePrice: 48000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'BOSCH-F026402065',
        description: 'Filtro Combustible BOSCH F026402065',
        category: 'FILTROS',
        subcategory: 'FILTRO_COMBUSTIBLE',
        unit: 'UNIDAD',
        referencePrice: 55000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    // Frenos [8-9]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'BOSCH-0986AB1234',
        description: 'Pastillas Freno Delanteras BOSCH',
        category: 'FRENOS',
        subcategory: 'PASTILLAS',
        unit: 'JUEGO',
        referencePrice: 185000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'CASTROL-DOT4-500ML',
        description: 'Liquido Frenos Castrol DOT4 500ml',
        category: 'FRENOS',
        subcategory: 'LIQUIDO_FRENOS',
        unit: 'UNIDAD',
        referencePrice: 22000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    // SUV/EV Especificos
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'RENAULT-HAB-123',
        description: 'Filtro de Habitaculo / Cabina (Duster/Oroch)',
        category: 'FILTROS',
        subcategory: 'FILTRO_AIRE',
        unit: 'UNIDAD',
        referencePrice: 45000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'RENAULT-COR-456',
        description: 'Correa de Accesorios Poly-V',
        category: 'MOTOR',
        subcategory: 'KITS',
        unit: 'UNIDAD',
        referencePrice: 65000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'DONGFENG-RED-789',
        description: 'Aceite para Engranaje Reductor EV (Dongfeng)',
        category: 'LUBRICANTES',
        subcategory: 'ACEITE_TRANSMISION',
        unit: 'LITRO',
        referencePrice: 85000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    prisma.masterPart.create({
      data: {
        tenantId: null,
        code: 'EV-COOLANT-BC',
        description: 'Liquido Refrigerante EV (Baja Conductividad)',
        category: 'LUBRICANTES',
        subcategory: 'REFRIGERANTE',
        unit: 'GALON',
        referencePrice: 120000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
  ]);
  const [
    pShell,
    pMobil,
    pCastrolGTX,
    pBoschFiltAce,
    pMannFiltAce,
    pBoschFiltAire,
    pMannFiltAire,
    pBoschFiltComb,
    pBoschPastillas,
    pCastrolDOT4,
    pRenHabitaculo,
    pRenCorrea,
    pDfReductor,
    pEvCoolant,
  ] = parts;
  console.log(`   ${parts.length} master parts creados`);

  // --- TEMPLATES (3) with packages ---
  console.log('   Creando templates (3) con paquetes (12)...');

  // Helper to create packages with items for a template
  async function createTemplatePackages(
    templateId: string,
    packages: Array<{
      name: string;
      triggerKm: number;
      estimatedCost: number;
      estimatedTime: number;
      priority: 'MEDIUM' | 'HIGH';
      items: Array<{
        mantItemId: string;
        triggerKm: number;
        estimatedTime: number;
        order: number;
        priority: 'LOW' | 'MEDIUM' | 'HIGH';
      }>;
    }>
  ) {
    for (const pkg of packages) {
      const created = await prisma.maintenancePackage.create({
        data: {
          templateId,
          name: pkg.name,
          triggerKm: pkg.triggerKm,
          estimatedCost: pkg.estimatedCost,
          estimatedTime: pkg.estimatedTime,
          priority: pkg.priority,
          packageType: 'PREVENTIVE',
          status: 'ACTIVE',
        },
      });
      await Promise.all(
        pkg.items.map(item =>
          prisma.packageItem.create({
            data: {
              packageId: created.id,
              mantItemId: item.mantItemId,
              triggerKm: item.triggerKm,
              estimatedTime: item.estimatedTime,
              order: item.order,
              priority: item.priority,
            },
          })
        )
      );
    }
  }

  // Template: Toyota Hilux Standard
  const tplHilux = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Toyota Hilux Standard',
      description: 'Programa mantenimiento preventivo Toyota Hilux',
      vehicleBrandId: toyota.id,
      vehicleLineId: hilux.id,
      version: '1.0',
      isDefault: true,
      isGlobal: true,
      tenantId: null,
    },
  });
  await createTemplatePackages(tplHilux.id, [
    {
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 450000,
      estimatedTime: 2.5,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 5000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 5000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 5000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 5000,
          estimatedTime: 0.5,
          order: 4,
          priority: 'HIGH',
        },
        {
          mantItemId: iInspBateria.id,
          triggerKm: 5000,
          estimatedTime: 0.3,
          order: 5,
          priority: 'LOW',
        },
        {
          mantItemId: iRotNeumaticos.id,
          triggerKm: 5000,
          estimatedTime: 0.7,
          order: 6,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      estimatedCost: 550000,
      estimatedTime: 3.0,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 10000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 10000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 10000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 10000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 10000,
          estimatedTime: 0.5,
          order: 5,
          priority: 'HIGH',
        },
        {
          mantItemId: iInspAmort.id,
          triggerKm: 10000,
          estimatedTime: 0.5,
          order: 6,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iLubRotulas.id,
          triggerKm: 10000,
          estimatedTime: 0.4,
          order: 7,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iBalanceo.id,
          triggerKm: 10000,
          estimatedTime: 0.8,
          order: 8,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      estimatedCost: 750000,
      estimatedTime: 4.0,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 20000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 20000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 20000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iAjusteValvulas.id,
          triggerKm: 20000,
          estimatedTime: 1.0,
          order: 5,
          priority: 'HIGH',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 6,
          priority: 'HIGH',
        },
        {
          mantItemId: iLiquidoFreno.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 7,
          priority: 'HIGH',
        },
        {
          mantItemId: iAceiteTransm.id,
          triggerKm: 20000,
          estimatedTime: 1.2,
          order: 8,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 30,000 km',
      triggerKm: 30000,
      estimatedCost: 950000,
      estimatedTime: 5.0,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 30000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 30000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 30000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iAjusteValvulas.id,
          triggerKm: 30000,
          estimatedTime: 1.0,
          order: 5,
          priority: 'HIGH',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 6,
          priority: 'HIGH',
        },
        {
          mantItemId: iLiquidoFreno.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 7,
          priority: 'HIGH',
        },
        {
          mantItemId: iAceiteTransm.id,
          triggerKm: 30000,
          estimatedTime: 1.2,
          order: 8,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iAjusteEmbrague.id,
          triggerKm: 30000,
          estimatedTime: 1.5,
          order: 9,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iLiqDireccion.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 10,
          priority: 'MEDIUM',
        },
      ],
    },
  ]);

  // Template: Ford Ranger Standard
  const tplRanger = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Ford Ranger Standard',
      description: 'Programa mantenimiento preventivo Ford Ranger',
      vehicleBrandId: ford.id,
      vehicleLineId: ranger.id,
      version: '1.0',
      isDefault: true,
      isGlobal: true,
      tenantId: null,
    },
  });
  await createTemplatePackages(tplRanger.id, [
    {
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 430000,
      estimatedTime: 2.5,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 5000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 5000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 5000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iInspBateria.id,
          triggerKm: 5000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'LOW',
        },
      ],
    },
    {
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      estimatedCost: 520000,
      estimatedTime: 3.0,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 10000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 10000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 10000,
          estimatedTime: 0.3,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 10000,
          estimatedTime: 0.5,
          order: 4,
          priority: 'HIGH',
        },
      ],
    },
    {
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      estimatedCost: 720000,
      estimatedTime: 4.0,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 20000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 20000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 20000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 5,
          priority: 'HIGH',
        },
        {
          mantItemId: iLiquidoFreno.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 6,
          priority: 'HIGH',
        },
        {
          mantItemId: iAceiteTransm.id,
          triggerKm: 20000,
          estimatedTime: 1.2,
          order: 7,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 30,000 km',
      triggerKm: 30000,
      estimatedCost: 920000,
      estimatedTime: 5.0,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 30000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 30000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 30000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iAjusteValvulas.id,
          triggerKm: 30000,
          estimatedTime: 1.0,
          order: 5,
          priority: 'HIGH',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 6,
          priority: 'HIGH',
        },
        {
          mantItemId: iLiquidoFreno.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 7,
          priority: 'HIGH',
        },
        {
          mantItemId: iAceiteTransm.id,
          triggerKm: 30000,
          estimatedTime: 1.2,
          order: 8,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iAjusteEmbrague.id,
          triggerKm: 30000,
          estimatedTime: 1.5,
          order: 9,
          priority: 'MEDIUM',
        },
      ],
    },
  ]);

  // Template: Chevrolet D-MAX Standard
  const tplDmax = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Chevrolet D-MAX Standard',
      description: 'Programa mantenimiento preventivo Chevrolet D-MAX',
      vehicleBrandId: chevrolet.id,
      vehicleLineId: dmax.id,
      version: '1.0',
      isDefault: true,
      isGlobal: true,
      tenantId: null,
    },
  });
  await createTemplatePackages(tplDmax.id, [
    {
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      estimatedCost: 440000,
      estimatedTime: 2.5,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 5000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 5000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 5000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iRotNeumaticos.id,
          triggerKm: 5000,
          estimatedTime: 0.7,
          order: 4,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      estimatedCost: 540000,
      estimatedTime: 3.0,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 10000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 10000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 10000,
          estimatedTime: 0.3,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iAceiteTransm.id,
          triggerKm: 10000,
          estimatedTime: 1.2,
          order: 4,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      estimatedCost: 700000,
      estimatedTime: 4.0,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 20000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 20000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 20000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 5,
          priority: 'HIGH',
        },
        {
          mantItemId: iLiquidoFreno.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 6,
          priority: 'HIGH',
        },
        {
          mantItemId: iAceiteTransm.id,
          triggerKm: 20000,
          estimatedTime: 1.2,
          order: 7,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 30,000 km',
      triggerKm: 30000,
      estimatedCost: 900000,
      estimatedTime: 5.0,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 30000,
          estimatedTime: 0.3,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 30000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroComb.id,
          triggerKm: 30000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iAjusteValvulas.id,
          triggerKm: 30000,
          estimatedTime: 1.0,
          order: 5,
          priority: 'HIGH',
        },
        {
          mantItemId: iInspFreno.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 6,
          priority: 'HIGH',
        },
        {
          mantItemId: iLiquidoFreno.id,
          triggerKm: 30000,
          estimatedTime: 0.5,
          order: 7,
          priority: 'HIGH',
        },
        {
          mantItemId: iAceiteTransm.id,
          triggerKm: 30000,
          estimatedTime: 1.2,
          order: 8,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iAjusteEmbrague.id,
          triggerKm: 30000,
          estimatedTime: 1.5,
          order: 9,
          priority: 'MEDIUM',
        },
      ],
    },
  ]);

  // Template: Renault Duster
  const tplDuster = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Renault Duster 10K',
      description: 'Programa mantenimiento 10K SUVs Compactos (Duster)',
      vehicleBrandId: renault.id,
      vehicleLineId: duster.id,
      version: '1.0',
      isDefault: true,
      isGlobal: true,
      tenantId: null,
    },
  });
  await createTemplatePackages(tplDuster.id, [
    {
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      estimatedCost: 280000,
      estimatedTime: 2.0,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 10000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 10000,
          estimatedTime: 0.2,
          order: 2,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      estimatedCost: 380000,
      estimatedTime: 2.5,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 20000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 20000,
          estimatedTime: 0.2,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 20000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroHabitaculo.id,
          triggerKm: 20000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 60,000 km (Servicio Critico)',
      triggerKm: 60000,
      estimatedCost: 1200000,
      estimatedTime: 6.0,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iCambioAceite.id,
          triggerKm: 60000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAceite.id,
          triggerKm: 60000,
          estimatedTime: 0.2,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroAire.id,
          triggerKm: 60000,
          estimatedTime: 0.2,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroHabitaculo.id,
          triggerKm: 60000,
          estimatedTime: 0.3,
          order: 4,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iCorreaAccesorios.id,
          triggerKm: 60000,
          estimatedTime: 1.0,
          order: 5,
          priority: 'HIGH',
        },
      ],
    },
  ]);

  // Template: Dongfeng Rich 6 EV
  const tplEvDongfeng = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Dongfeng Rich 6 EV 10K',
      description: 'Programa mantenimiento EV 10K',
      vehicleBrandId: dongfeng.id,
      vehicleLineId: rich6ev.id,
      version: '1.0',
      isDefault: true,
      isGlobal: true,
      tenantId: null,
    },
  });
  await createTemplatePackages(tplEvDongfeng.id, [
    {
      name: 'Servicio Anual / 10,000 km',
      triggerKm: 10000,
      estimatedCost: 150000,
      estimatedTime: 1.5,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iInspAltaTension.id,
          triggerKm: 10000,
          estimatedTime: 0.8,
          order: 1,
          priority: 'HIGH',
        },
        {
          mantItemId: iRotNeumaticos.id,
          triggerKm: 10000,
          estimatedTime: 0.7,
          order: 2,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      estimatedCost: 220000,
      estimatedTime: 2.0,
      priority: 'MEDIUM',
      items: [
        {
          mantItemId: iInspAltaTension.id,
          triggerKm: 20000,
          estimatedTime: 0.8,
          order: 1,
          priority: 'HIGH',
        },
        {
          mantItemId: iRotNeumaticos.id,
          triggerKm: 20000,
          estimatedTime: 0.7,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroHabitaculo.id,
          triggerKm: 20000,
          estimatedTime: 0.3,
          order: 3,
          priority: 'MEDIUM',
        },
      ],
    },
    {
      name: 'Mantenimiento 40,000 km',
      triggerKm: 40000,
      estimatedCost: 320000,
      estimatedTime: 3.0,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iInspAltaTension.id,
          triggerKm: 40000,
          estimatedTime: 0.8,
          order: 1,
          priority: 'HIGH',
        },
        {
          mantItemId: iRotNeumaticos.id,
          triggerKm: 40000,
          estimatedTime: 0.7,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroHabitaculo.id,
          triggerKm: 40000,
          estimatedTime: 0.3,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iLiquidoFreno.id,
          triggerKm: 40000,
          estimatedTime: 1.0,
          order: 4,
          priority: 'HIGH',
        },
      ],
    },
    {
      name: 'Mantenimiento 60,000 km',
      triggerKm: 60000,
      estimatedCost: 650000,
      estimatedTime: 4.5,
      priority: 'HIGH',
      items: [
        {
          mantItemId: iInspAltaTension.id,
          triggerKm: 60000,
          estimatedTime: 0.8,
          order: 1,
          priority: 'HIGH',
        },
        {
          mantItemId: iRotNeumaticos.id,
          triggerKm: 60000,
          estimatedTime: 0.7,
          order: 2,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iFiltroHabitaculo.id,
          triggerKm: 60000,
          estimatedTime: 0.3,
          order: 3,
          priority: 'MEDIUM',
        },
        {
          mantItemId: iLiquidoFreno.id,
          triggerKm: 60000,
          estimatedTime: 1.0,
          order: 4,
          priority: 'HIGH',
        },
        {
          mantItemId: iAceiteReductorEV.id,
          triggerKm: 60000,
          estimatedTime: 1.0,
          order: 5,
          priority: 'HIGH',
        },
        {
          mantItemId: iFlushRefriEV.id,
          triggerKm: 60000,
          estimatedTime: 1.5,
          order: 6,
          priority: 'HIGH',
        },
      ],
    },
  ]);

  console.log('   5 templates con 21 paquetes creados');

  // --- DOCUMENT TYPE CONFIGS (CO) ---
  console.log('   Creando document type configs (CO)...');
  await Promise.all([
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'SOAT',
        name: 'SOAT',
        description: 'Seguro Obligatorio de Accidentes de Transito',
        requiresExpiry: true,
        isMandatory: true,
        expiryWarningDays: 30,
        expiryCriticalDays: 7,
        sortOrder: 1,
      },
    }),
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'TECNOMECANICA',
        name: 'Revision Tecnico-Mecanica',
        requiresExpiry: true,
        isMandatory: true,
        expiryWarningDays: 45,
        expiryCriticalDays: 15,
        sortOrder: 2,
      },
    }),
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'INSURANCE',
        name: 'Seguro / Poliza',
        requiresExpiry: true,
        isMandatory: false,
        expiryWarningDays: 30,
        expiryCriticalDays: 7,
        sortOrder: 3,
      },
    }),
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'REGISTRATION',
        name: 'Tarjeta de Propiedad',
        requiresExpiry: false,
        isMandatory: true,
        sortOrder: 4,
      },
    }),
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'OTHER',
        name: 'Otro',
        requiresExpiry: false,
        isMandatory: false,
        sortOrder: 5,
      },
    }),
  ]);
  console.log('   5 document type configs creados');

  // --- MANT ITEM VEHICLE PARTS (KB auto-sugerencia ~26 entries) ---
  console.log('   Creando MantItemVehiclePart KB (~26 entradas)...');
  const kbEntries = [
    // Cambio aceite motor -> cada marca/linea con su aceite
    {
      mantItemId: iCambioAceite.id,
      brandId: toyota.id,
      lineId: hilux.id,
      masterPartId: pShell.id,
      qty: 5.5,
    },
    {
      mantItemId: iCambioAceite.id,
      brandId: ford.id,
      lineId: ranger.id,
      masterPartId: pMobil.id,
      qty: 6.0,
    },
    {
      mantItemId: iCambioAceite.id,
      brandId: chevrolet.id,
      lineId: dmax.id,
      masterPartId: pCastrolGTX.id,
      qty: 5.0,
    },
    {
      mantItemId: iCambioAceite.id,
      brandId: mitsubishi.id,
      lineId: l200.id,
      masterPartId: pShell.id,
      qty: 5.0,
    },
    {
      mantItemId: iCambioAceite.id,
      brandId: nissan.id,
      lineId: frontier.id,
      masterPartId: pMobil.id,
      qty: 5.5,
    },
    // Cambio filtro aceite
    {
      mantItemId: iFiltroAceite.id,
      brandId: toyota.id,
      lineId: hilux.id,
      masterPartId: pBoschFiltAce.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroAceite.id,
      brandId: ford.id,
      lineId: ranger.id,
      masterPartId: pMannFiltAce.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroAceite.id,
      brandId: chevrolet.id,
      lineId: dmax.id,
      masterPartId: pBoschFiltAce.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroAceite.id,
      brandId: mitsubishi.id,
      lineId: l200.id,
      masterPartId: pMannFiltAce.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroAceite.id,
      brandId: nissan.id,
      lineId: frontier.id,
      masterPartId: pBoschFiltAce.id,
      qty: 1,
    },
    // Cambio filtro aire
    {
      mantItemId: iFiltroAire.id,
      brandId: toyota.id,
      lineId: hilux.id,
      masterPartId: pBoschFiltAire.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroAire.id,
      brandId: ford.id,
      lineId: ranger.id,
      masterPartId: pMannFiltAire.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroAire.id,
      brandId: chevrolet.id,
      lineId: dmax.id,
      masterPartId: pBoschFiltAire.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroAire.id,
      brandId: mitsubishi.id,
      lineId: l200.id,
      masterPartId: pMannFiltAire.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroAire.id,
      brandId: nissan.id,
      lineId: frontier.id,
      masterPartId: pBoschFiltAire.id,
      qty: 1,
    },
    // Cambio filtro combustible (solo 3: Toyota, Ford, Chevy)
    {
      mantItemId: iFiltroComb.id,
      brandId: toyota.id,
      lineId: hilux.id,
      masterPartId: pBoschFiltComb.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroComb.id,
      brandId: ford.id,
      lineId: ranger.id,
      masterPartId: pBoschFiltComb.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroComb.id,
      brandId: chevrolet.id,
      lineId: dmax.id,
      masterPartId: pBoschFiltComb.id,
      qty: 1,
    },
    // Cambio pastillas freno delanteras
    {
      mantItemId: iPastillasDelant.id,
      brandId: toyota.id,
      lineId: hilux.id,
      masterPartId: pBoschPastillas.id,
      qty: 1,
    },
    {
      mantItemId: iPastillasDelant.id,
      brandId: ford.id,
      lineId: ranger.id,
      masterPartId: pBoschPastillas.id,
      qty: 1,
    },
    {
      mantItemId: iPastillasDelant.id,
      brandId: chevrolet.id,
      lineId: dmax.id,
      masterPartId: pBoschPastillas.id,
      qty: 1,
    },
    // Cambio liquido frenos
    {
      mantItemId: iLiquidoFreno.id,
      brandId: toyota.id,
      lineId: hilux.id,
      masterPartId: pCastrolDOT4.id,
      qty: 2,
    },
    {
      mantItemId: iLiquidoFreno.id,
      brandId: ford.id,
      lineId: ranger.id,
      masterPartId: pCastrolDOT4.id,
      qty: 2,
    },
    {
      mantItemId: iLiquidoFreno.id,
      brandId: chevrolet.id,
      lineId: dmax.id,
      masterPartId: pCastrolDOT4.id,
      qty: 2,
    },
    {
      mantItemId: iLiquidoFreno.id,
      brandId: mitsubishi.id,
      lineId: l200.id,
      masterPartId: pCastrolDOT4.id,
      qty: 2,
    },
    {
      mantItemId: iLiquidoFreno.id,
      brandId: nissan.id,
      lineId: frontier.id,
      masterPartId: pCastrolDOT4.id,
      qty: 2,
    },
    // Filtros Habitaculo (SUV/EV)
    {
      mantItemId: iFiltroHabitaculo.id,
      brandId: renault.id,
      lineId: duster.id,
      masterPartId: pRenHabitaculo.id,
      qty: 1,
    },
    {
      mantItemId: iFiltroHabitaculo.id,
      brandId: dongfeng.id,
      lineId: rich6ev.id,
      masterPartId: pRenHabitaculo.id, // Reusing similar part for simplicity if no specific one
      qty: 1,
    },
    // Correa Accesorios (Duster)
    {
      mantItemId: iCorreaAccesorios.id,
      brandId: renault.id,
      lineId: duster.id,
      masterPartId: pRenCorrea.id,
      qty: 1,
    },
    // Fluídos EVE (Dongfeng)
    {
      mantItemId: iAceiteReductorEV.id,
      brandId: dongfeng.id,
      lineId: rich6ev.id,
      masterPartId: pDfReductor.id,
      qty: 1,
    },
    {
      mantItemId: iFlushRefriEV.id,
      brandId: dongfeng.id,
      lineId: rich6ev.id,
      masterPartId: pEvCoolant.id,
      qty: 2, // 2 Gallons
    },
  ];

  await Promise.all(
    kbEntries.map(e =>
      prisma.mantItemVehiclePart.create({
        data: {
          tenantId: null,
          isGlobal: true,
          mantItemId: e.mantItemId,
          vehicleBrandId: e.brandId,
          vehicleLineId: e.lineId,
          yearFrom: 2018,
          yearTo: 2025,
          masterPartId: e.masterPartId,
          quantity: e.qty,
        },
      })
    )
  );
  console.log(`   ${kbEntries.length} KB entries creados`);

  console.log('\n   Knowledge Base Global COMPLETA.\n');

  // ========================================
  // STEP 3: PLATFORM TENANT + SUPER_ADMIN
  // ========================================
  console.log('3. PLATFORM TENANT + SUPER_ADMIN...\n');

  const platformTenant = await prisma.tenant.create({
    data: {
      id: PLATFORM_TENANT_ID,
      name: 'Fleet Care Platform',
      slug: 'fleet-care-platform',
      country: 'CO',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'platform@fleetcare.com',
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      email: 'grivarol69@gmail.com',
      firstName: 'Fleet Care',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`   Platform: ${platformTenant.name}`);
  console.log(`   SUPER_ADMIN: ${superAdmin.email}\n`);

  // ========================================
  // STEP 4: TENANT 1 - Transportes Demo SAS
  // ========================================
  console.log('4. TENANT 1 - Transportes Demo SAS...\n');

  // Tenant
  const tenant1 = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: { onboardingStatus: 'COMPLETED' },
    create: {
      id: DEMO_TENANT_ID,
      name: 'Transportes Demo SAS',
      slug: 'transportes-demo',
      country: 'CO',
      subscriptionStatus: 'ACTIVE',
      onboardingStatus: 'COMPLETED',
      billingEmail: 'guillerivar69+ventas@gmail.com',
    },
  });

  // Users - OWNER, MANAGER, TECHNICIAN, PURCHASER
  const ownerEmail =
    process.env.DEMO_OWNER_EMAIL || 'guillerivar69+owner@gmail.com';
  const managerEmail = 'dyaponter+manager@gmail.com';
  const techEmail = 'grivarol69driver+technician@gmail.com';
  const purchaserEmail = 'dyaponter+purchaser@gmail.com';

  const t1Owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEMO_TENANT_ID, email: ownerEmail } },
    update: { role: 'OWNER', isActive: true },
    create: {
      tenantId: DEMO_TENANT_ID,
      email: ownerEmail,
      firstName: 'Demo',
      lastName: 'Owner',
      role: 'OWNER',
      isActive: true,
    },
  });
  const t1Manager = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: DEMO_TENANT_ID, email: managerEmail },
    },
    update: { role: 'MANAGER', isActive: true },
    create: {
      tenantId: DEMO_TENANT_ID,
      email: managerEmail,
      firstName: 'Demo',
      lastName: 'Manager',
      role: 'MANAGER',
      isActive: true,
    },
  });
  const t1Tech = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEMO_TENANT_ID, email: techEmail } },
    update: { role: 'TECHNICIAN', isActive: true },
    create: {
      tenantId: DEMO_TENANT_ID,
      email: techEmail,
      firstName: 'Demo',
      lastName: 'Technician',
      role: 'TECHNICIAN',
      isActive: true,
    },
  });
  const t1Purchaser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: DEMO_TENANT_ID, email: purchaserEmail },
    },
    update: { role: 'PURCHASER', isActive: true },
    create: {
      tenantId: DEMO_TENANT_ID,
      email: purchaserEmail,
      firstName: 'Demo',
      lastName: 'Purchaser',
      role: 'PURCHASER',
      isActive: true,
    },
  });
  console.log('   4 users (upsert)');

  // Providers
  await Promise.all([
    prisma.provider.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Repuestos Toyota',
        specialty: 'REPUESTOS',
        status: 'ACTIVE',
        nit: '900123456',
        siigoIdType: 'NIT',
        siigoPersonType: 'COMPANY',
        stateCode: '11', // Bogota
        cityCode: '11001',
        fiscalResponsibilities: ['O-15', 'O-47'],
        vatResponsible: true,
      },
    }),
    prisma.provider.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Lubricantes Shell',
        specialty: 'LUBRICANTES',
        status: 'ACTIVE',
        nit: '800987654',
        siigoIdType: 'NIT',
        siigoPersonType: 'COMPANY',
        stateCode: '05', // Antioquia
        cityCode: '05001',
        fiscalResponsibilities: ['O-15'],
        vatResponsible: true,
      },
    }),
    prisma.provider.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Taller ABC Frenos',
        specialty: 'FRENOS',
        status: 'ACTIVE',
        nit: '1020304050',
        siigoIdType: 'CC',
        siigoPersonType: 'PERSON',
        stateCode: '11',
        cityCode: '11001',
        fiscalResponsibilities: ['R-99-PN'],
        vatResponsible: false,
      },
    }),
  ]);
  console.log('   3 proveedores creados');

  // Technicians
  await Promise.all([
    prisma.technician.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Taller Central',
        specialty: 'GENERAL',
        status: 'ACTIVE',
        hourlyRate: 25000,
      },
    }),
    prisma.technician.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Especialista Motor',
        specialty: 'MOTOR',
        status: 'ACTIVE',
        hourlyRate: 35000,
      },
    }),
  ]);
  console.log('   2 tecnicos creados');

  // Drivers
  const t1Drivers = await Promise.all([
    prisma.driver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Juan Lopez',
        licenseNumber: 'LIC-T1-001',
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Pedro Gomez',
        licenseNumber: 'LIC-T1-002',
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Maria Fernandez',
        licenseNumber: 'LIC-T1-003',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log('   3 conductores creados');

  // Vehicles
  const t1Vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'ABC-123',
        brandId: toyota.id,
        lineId: hilux.id,
        typeId: type4x4.id,
        year: 2022,
        mileage: 45000,
        color: 'Blanco',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        fuelType: 'DIESEL',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'DEF-456',
        brandId: ford.id,
        lineId: ranger.id,
        typeId: type4x4.id,
        year: 2021,
        mileage: 62000,
        color: 'Negro',
        status: 'ACTIVE',
        situation: 'IN_USE',
        fuelType: 'DIESEL',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'GHI-789',
        brandId: chevrolet.id,
        lineId: dmax.id,
        typeId: type4x4.id,
        year: 2023,
        mileage: 18000,
        color: 'Rojo',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        fuelType: 'DIESEL',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'JKL-012',
        brandId: toyota.id,
        lineId: landCruiser.id,
        typeId: typeSUV.id,
        year: 2020,
        mileage: 95000,
        color: 'Gris',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        fuelType: 'GASOLINA',
      },
    }),
  ]);
  console.log('   4 vehiculos creados');

  // Vehicle-Driver assignments
  await Promise.all([
    prisma.vehicleDriver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[0].id,
        driverId: t1Drivers[0].id,
        isPrimary: true,
        assignedBy: t1Owner.id,
      },
    }),
    prisma.vehicleDriver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[1].id,
        driverId: t1Drivers[1].id,
        isPrimary: true,
        assignedBy: t1Owner.id,
      },
    }),
    prisma.vehicleDriver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[2].id,
        driverId: t1Drivers[2].id,
        isPrimary: true,
        assignedBy: t1Owner.id,
      },
    }),
  ]);
  console.log('   3 asignaciones vehiculo-conductor creadas');

  // Maintenance Programs (from templates)
  console.log('   Creando programas de mantenimiento...');
  // ABC-123 Hilux 45K -> all packages COMPLETED, next ~35K
  await createProgramFromTemplate(
    DEMO_TENANT_ID,
    t1Vehicles[0].id,
    'Hilux ABC-123',
    tplHilux.id,
    'Toyota Hilux Standard',
    0,
    45000,
    t1Owner.id
  );
  // DEF-456 Ranger 62K -> all packages COMPLETED, next ~35K
  await createProgramFromTemplate(
    DEMO_TENANT_ID,
    t1Vehicles[1].id,
    'Ranger DEF-456',
    tplRanger.id,
    'Ford Ranger Standard',
    0,
    62000,
    t1Owner.id
  );
  // GHI-789 D-MAX 18K -> 5K, 10K COMPLETED, 20K PENDING
  await createProgramFromTemplate(
    DEMO_TENANT_ID,
    t1Vehicles[2].id,
    'D-MAX GHI-789',
    tplDmax.id,
    'Chevrolet D-MAX Standard',
    0,
    18000,
    t1Owner.id
  );
  // JKL-012 Land Cruiser -> no template available, skip
  console.log('   3 programas creados (JKL-012 sin template)');

  // Inventory (Tenant 1)
  console.log('   Creando inventario...');
  const t1InventoryData = [
    { masterPartId: pShell.id, quantity: 20, minStock: 5, avgCost: 45000 },
    {
      masterPartId: pBoschFiltAce.id,
      quantity: 6,
      minStock: 2,
      avgCost: 28000,
    },
    {
      masterPartId: pBoschFiltAire.id,
      quantity: 4,
      minStock: 2,
      avgCost: 42000,
    },
    {
      masterPartId: pBoschFiltComb.id,
      quantity: 3,
      minStock: 1,
      avgCost: 55000,
    },
    {
      masterPartId: pBoschPastillas.id,
      quantity: 4,
      minStock: 2,
      avgCost: 185000,
    },
    { masterPartId: pCastrolDOT4.id, quantity: 8, minStock: 2, avgCost: 22000 },
  ];
  for (const inv of t1InventoryData) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        masterPartId: inv.masterPartId,
        warehouse: 'PRINCIPAL',
        quantity: inv.quantity,
        minStock: inv.minStock,
        averageCost: inv.avgCost,
        totalValue: inv.quantity * inv.avgCost,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`   ${t1InventoryData.length} items de inventario creados`);

  // ========================================
  // WORK ORDERS - Tenant 1 (histórico de mantenimiento)
  // ========================================
  console.log('   Creando Work Orders...');

  // Obtener vehicles y provider
  const t1VehiclesList = await prisma.vehicle.findMany({
    where: { tenantId: DEMO_TENANT_ID },
  });
  const t1ProviderList = await prisma.provider.findMany({
    where: { tenantId: DEMO_TENANT_ID },
  });
  const t1TechnicianList = await prisma.technician.findMany({
    where: { tenantId: DEMO_TENANT_ID },
  });
  const t1UsersList = await prisma.user.findMany({
    where: { tenantId: DEMO_TENANT_ID },
  });
  const t1MantItems = await prisma.mantItem.findMany({
    where: { isGlobal: true },
  });

  const repuestosToyota = t1ProviderList.find(
    p => p.name === 'Repuestos Toyota'
  );
  const lubricantesShell = t1ProviderList.find(
    p => p.name === 'Lubricantes Shell'
  );
  const tallerCentral = t1TechnicianList.find(t => t.name === 'Taller Central');
  const owner = t1UsersList.find(u => u.role === 'OWNER');

  if (
    t1VehiclesList.length > 0 &&
    repuestosToyota &&
    lubricantesShell &&
    owner
  ) {
    // WO 1: Cambio aceite ABC-123 (completado)
    const wo1 = await prisma.workOrder.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1VehiclesList[0].id,
        title: 'Mantenimiento 5,000 km - Cambio de aceite',
        description: 'Servicio preventivo programado',
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        workType: 'EXTERNAL',
        technicianId: tallerCentral?.id,
        providerId: lubricantesShell?.id,
        creationMileage: 5000,
        requestedBy: owner.id,
        authorizedBy: owner.id,
        estimatedCost: 450000,
        actualCost: 485000,
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        completionMileage: 5000,
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo1.id,
        mantItemId:
          t1MantItems.find(i => i.name === 'Cambio aceite motor')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Aceite Shell Helix HX7 10W-40',
        partNumber: 'SHELL-HELIX-HX7-10W40',
        brand: 'Shell',
        supplier: 'Lubricantes Shell',
        unitPrice: 45000,
        quantity: 6,
        totalCost: 270000,
        purchasedBy: owner.id,
        masterPartId: pShell.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo1.id,
        mantItemId:
          t1MantItems.find(i => i.name === 'Cambio filtro aceite')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Filtro Aceite BOSCH',
        partNumber: 'BOSCH-0986AF0134',
        brand: 'BOSCH',
        supplier: 'Repuestos Toyota',
        unitPrice: 28000,
        quantity: 1,
        totalCost: 28000,
        purchasedBy: owner.id,
        masterPartId: pBoschFiltAce.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo1.id,
        mantItemId:
          t1MantItems.find(i => i.name === 'Cambio filtro aire')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Filtro Aire BOSCH',
        partNumber: 'BOSCH-F026400364',
        brand: 'BOSCH',
        supplier: 'Repuestos Toyota',
        unitPrice: 42000,
        quantity: 1,
        totalCost: 42000,
        purchasedBy: owner.id,
        masterPartId: pBoschFiltAire.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });

    // WO 2: Cambio aceite DEF-456 (completado)
    const wo2 = await prisma.workOrder.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1VehiclesList[1].id,
        title: 'Mantenimiento 10,000 km',
        description: 'Servicio preventivo programado',
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        workType: 'EXTERNAL',
        technicianId: tallerCentral?.id,
        providerId: lubricantesShell?.id,
        creationMileage: 10000,
        requestedBy: owner.id,
        authorizedBy: owner.id,
        estimatedCost: 520000,
        actualCost: 545000,
        startDate: new Date('2025-02-20'),
        endDate: new Date('2025-02-21'),
        completionMileage: 10000,
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo2.id,
        mantItemId:
          t1MantItems.find(i => i.name === 'Cambio aceite motor')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Aceite Mobil Super 3000 5W-40',
        partNumber: 'MOBIL-SUPER-3000-5W40',
        brand: 'Mobil',
        supplier: 'Lubricantes Shell',
        unitPrice: 58000,
        quantity: 6,
        totalCost: 348000,
        purchasedBy: owner.id,
        masterPartId: pMobil.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo2.id,
        mantItemId:
          t1MantItems.find(i => i.name === 'Cambio filtro aceite')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Filtro Aceite MANN',
        partNumber: 'MANN-W920/21',
        brand: 'Mann',
        supplier: 'Repuestos Toyota',
        unitPrice: 32000,
        quantity: 1,
        totalCost: 32000,
        purchasedBy: owner.id,
        masterPartId: pMannFiltAce.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });

    // WO 3: Cambio pastillas GHI-789 (completado - correctivo)
    const wo3 = await prisma.workOrder.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1VehiclesList[2].id,
        title: 'Cambio pastillas freno',
        description: 'Pastillas delanteras desgaste',
        mantType: 'CORRECTIVE',
        priority: 'HIGH',
        status: 'COMPLETED',
        workType: 'EXTERNAL',
        providerId: repuestosToyota?.id,
        creationMileage: 15000,
        requestedBy: owner.id,
        authorizedBy: owner.id,
        estimatedCost: 185000,
        actualCost: 198000,
        startDate: new Date('2025-03-10'),
        endDate: new Date('2025-03-10'),
        completionMileage: 15000,
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo3.id,
        mantItemId:
          t1MantItems.find(i => i.name === 'Cambio pastillas freno delanteras')
            ?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Pastillas Freno Delanteras BOSCH',
        partNumber: 'BOSCH-0986AB1234',
        brand: 'BOSCH',
        supplier: 'Repuestos Toyota',
        unitPrice: 185000,
        quantity: 1,
        totalCost: 185000,
        purchasedBy: owner.id,
        masterPartId: pBoschPastillas.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });

    // WO 4: Mantenimiento JKL-012 (en progreso)
    const wo4 = await prisma.workOrder.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1VehiclesList[3].id,
        title: 'Mantenimiento 20,000 km',
        description: 'Servicio preventivo',
        mantType: 'PREVENTIVE',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        workType: 'MIXED',
        technicianId: tallerCentral?.id,
        creationMileage: 95000,
        requestedBy: owner.id,
        authorizedBy: owner.id,
        estimatedCost: 750000,
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo4.id,
        mantItemId:
          t1MantItems.find(i => i.name === 'Cambio aceite motor')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Aceite Castrol GTX 15W-40',
        partNumber: 'CASTROL-GTX-15W40',
        brand: 'Castrol',
        supplier: 'Lubricantes Shell',
        unitPrice: 35000,
        quantity: 5,
        totalCost: 175000,
        purchasedBy: owner.id,
        masterPartId: pCastrolGTX.id,
        itemSource: 'EXTERNAL',
        status: 'PENDING',
      },
    });

    console.log('   4 Work Orders creados');
  }

  // ========================================
  // INVOICES - Tenant 1 (facturas de proveedores)
  // ========================================
  console.log(
    '   Creando Invoices con Items, Movimientos e Historial de Precios...'
  );

  if (
    repuestosToyota &&
    lubricantesShell &&
    owner &&
    t1VehiclesList.length > 0
  ) {
    // Collect created inventory items to get IDs
    const t1DbInventory = await prisma.inventoryItem.findMany({
      where: { tenantId: DEMO_TENANT_ID },
    });

    const demoInvoicesData = [
      {
        number: 'FAC-2025-001',
        date: '2025-01-16',
        due: '2025-02-15',
        supplier: repuestosToyota.id,
        items: [
          {
            masterPartId: pBoschFiltAce.id,
            desc: 'Filtro Aceite BOSCH 0986AF0134',
            qty: 6,
            price: 28000,
          },
          {
            masterPartId: pBoschFiltAire.id,
            desc: 'Filtro Aire BOSCH F026400364',
            qty: 4,
            price: 42000,
          },
        ],
      },
      {
        number: 'FAC-2025-002',
        date: '2025-01-20',
        due: '2025-02-19',
        supplier: lubricantesShell.id,
        items: [
          {
            masterPartId: pShell.id,
            desc: 'Aceite Shell Helix HX7 10W-40',
            qty: 20,
            price: 45000,
          },
        ],
      },
      {
        number: 'FAC-2025-003',
        date: '2025-02-05',
        due: '2025-03-05',
        supplier: repuestosToyota.id,
        items: [
          {
            masterPartId: pBoschFiltComb.id,
            desc: 'Filtro Combustible BOSCH',
            qty: 3,
            price: 55000,
          },
          {
            masterPartId: pCastrolDOT4.id,
            desc: 'Liq Frenos Castrol DOT4',
            qty: 8,
            price: 22000,
          },
        ],
      },
      {
        number: 'FAC-2025-004',
        date: '2025-02-15',
        due: '2025-03-15',
        supplier: repuestosToyota.id, // Pastillas
        items: [
          {
            masterPartId: pBoschPastillas.id,
            desc: 'Pastillas Freno Delanteras BOSCH',
            qty: 4,
            price: 185000,
          },
        ],
      },
      {
        number: 'FAC-2025-005',
        date: '2025-03-01',
        due: '2025-03-31',
        supplier: lubricantesShell.id,
        // Price variation! Trigger financial alert later
        items: [
          {
            masterPartId: pShell.id,
            desc: 'Aceite Shell Helix HX7 10W-40',
            qty: 5,
            price: 58000,
          },
        ],
      },
      {
        number: 'FAC-2025-006',
        date: '2025-03-10',
        due: '2025-04-09',
        supplier: repuestosToyota.id,
        items: [
          {
            masterPartId: pBoschFiltAce.id,
            desc: 'Filtro Aceite BOSCH 0986AF0134',
            qty: 2,
            price: 29000,
          },
          {
            masterPartId: pBoschFiltAire.id,
            desc: 'Filtro Aire BOSCH F026400364',
            qty: 2,
            price: 44000,
          },
        ],
      },
    ];

    for (const invData of demoInvoicesData) {
      let subtotal = 0;
      invData.items.forEach(i => (subtotal += i.qty * i.price));
      const tax = subtotal * 0.19;
      const total = subtotal + tax;

      const createdInv = await prisma.invoice.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          invoiceNumber: invData.number,
          invoiceDate: new Date(invData.date),
          dueDate: new Date(invData.due),
          supplierId: invData.supplier,
          subtotal,
          taxAmount: tax,
          totalAmount: total,
          currency: 'COP',
          status: 'PAID',
          approvedBy: owner.id,
          approvedAt: new Date(invData.date),
          registeredBy: owner.id,
        },
      });

      for (const item of invData.items) {
        const itemSubtotal = item.qty * item.price;
        const itemTax = itemSubtotal * 0.19;

        await prisma.invoiceItem.create({
          data: {
            invoiceId: createdInv.id,
            tenantId: DEMO_TENANT_ID,
            masterPartId: item.masterPartId,
            description: item.desc,
            quantity: item.qty,
            unitPrice: item.price,
            subtotal: itemSubtotal,
            taxRate: 19,
            taxAmount: itemTax,
            total: itemSubtotal + itemTax,
          },
        });

        // Price History
        await prisma.partPriceHistory.create({
          data: {
            tenantId: DEMO_TENANT_ID,
            masterPartId: item.masterPartId,
            supplierId: invData.supplier,
            price: item.price,
            quantity: item.qty,
            recordedAt: new Date(invData.date),
          },
        });

        // Inventory Movement (Simulated as IN)
        const invItem = t1DbInventory.find(
          inv => inv.masterPartId === item.masterPartId
        );
        if (invItem) {
          await prisma.inventoryMovement.create({
            data: {
              tenantId: DEMO_TENANT_ID,
              inventoryItemId: invItem.id,
              movementType: 'PURCHASE',
              quantity: item.qty,
              unitCost: item.price,
              totalCost: itemSubtotal,
              previousStock: 0,
              newStock: item.qty,
              previousAvgCost: 0,
              newAvgCost: item.price,
              referenceType: 'INVOICE',
              referenceId: createdInv.id,
              performedBy: owner.id,
              performedAt: new Date(invData.date),
            },
          });
        }
      }
    }

    console.log(
      `   ${demoInvoicesData.length} Invoices creadas con historial y movimientos`
    );
  }

  // ========================================
  // MAINTENANCE ALERTS - Tenant 1
  // ========================================
  console.log('   Creando Maintenance Alerts...');

  const t1VehiclesWithProgram = await prisma.vehicle.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    include: {
      vehicleMantProgram: {
        include: { packages: { include: { items: true } } },
      },
    },
  });

  if (t1VehiclesWithProgram.length > 0) {
    // Alert para ABC-123 (próximo mantenimiento)
    const abc123 = t1VehiclesWithProgram.find(
      v => v.licensePlate === 'ABC-123'
    );
    if (abc123 && abc123.vehicleMantProgram) {
      const nextPkg = abc123.vehicleMantProgram.packages.find(
        p => p.status === 'PENDING'
      );
      if (nextPkg && nextPkg.items.length > 0) {
        const nextItem = nextPkg.items[0];
        await prisma.maintenanceAlert.create({
          data: {
            tenantId: DEMO_TENANT_ID,
            vehicleId: abc123.id,
            programItemId: nextItem.id,
            type: 'PREVENTIVE',
            category: 'ROUTINE',
            itemName: 'Cambio aceite motor',
            packageName: nextPkg.name,
            description: 'Mantenimiento preventivo programado',
            estimatedCost: 450000,
            estimatedDuration: 2.5,
            scheduledKm: nextPkg.triggerKm || 10000,
            currentKmAtCreation: 45000,
            currentKm: 47000,
            kmToMaintenance: (nextPkg.triggerKm || 10000) - 47000,
            alertThresholdKm: 1000,
            priority: 'MEDIUM',
            alertLevel: 'MEDIUM',
            priorityScore: 50,
            status: 'PENDING',
          },
        });
      }
    }

    // Alert para DEF-456 (crítico - próximo)
    const def456 = t1VehiclesWithProgram.find(
      v => v.licensePlate === 'DEF-456'
    );
    if (def456 && def456.vehicleMantProgram) {
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          vehicleId: def456.id,
          programItemId:
            def456.vehicleMantProgram.packages[0]?.items[0]?.id || '',
          type: 'PREVENTIVE',
          category: 'MAJOR_COMPONENT',
          itemName: 'Cambio filtro combustible',
          packageName: 'Mantenimiento 15,000 km',
          description: 'Filtro combustible próximo a vencer',
          estimatedCost: 55000,
          scheduledKm: 15000,
          currentKmAtCreation: 62000,
          currentKm: 63500,
          kmToMaintenance: 15000 - 63500,
          alertThresholdKm: 500,
          priority: 'HIGH',
          alertLevel: 'HIGH',
          priorityScore: 75,
          status: 'PENDING',
        },
      });
    }

    // Alert para GHI-789 (pendiente)
    const ghi789 = t1VehiclesWithProgram.find(
      v => v.licensePlate === 'GHI-789'
    );
    if (ghi789 && ghi789.vehicleMantProgram) {
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          vehicleId: ghi789.id,
          programItemId:
            ghi789.vehicleMantProgram.packages[0]?.items[0]?.id || '',
          type: 'PREVENTIVE',
          category: 'ROUTINE',
          itemName: 'Rotación neumaticos',
          packageName: 'Mantenimiento 20,000 km',
          scheduledKm: 20000,
          currentKmAtCreation: 18000,
          currentKm: 19500,
          kmToMaintenance: 500,
          alertThresholdKm: 1000,
          priority: 'MEDIUM',
          alertLevel: 'LOW',
          priorityScore: 30,
          status: 'PENDING',
        },
      });
    }

    console.log('   3 Maintenance Alerts creados');
  }

  // ========================================
  // FINANCIAL ALERTS - Tenant 1
  // ========================================
  console.log('   Creando Financial Alerts...');

  const invoice5 = await prisma.invoice.findFirst({
    where: { tenantId: DEMO_TENANT_ID, invoiceNumber: 'FAC-2025-005' },
    include: { items: { include: { masterPart: true } } },
  });

  if (invoice5 && invoice5.items.length > 0) {
    const item = invoice5.items[0];
    if (item.masterPart && item.unitPrice && item.masterPart.referencePrice) {
      const unitPrice = Number(item.unitPrice);
      const refPrice =
        Number(item.masterPart.referencePrice) > 0
          ? Number(item.masterPart.referencePrice)
          : 45000;
      const deviation = ((unitPrice - refPrice) / refPrice) * 100;

      await prisma.financialAlert.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          invoiceId: invoice5.id,
          masterPartId: item.masterPartId,
          type: 'PRICE_DEVIATION',
          severity: deviation > 20 ? 'CRITICAL' : 'HIGH',
          status: 'PENDING',
          message: `Desviación del ${deviation.toFixed(1)}% en compra de ${item.masterPart.description}. Referencia: $${refPrice}, Compra: $${unitPrice}`,
          details: {
            expected: refPrice,
            actual: unitPrice,
            deviation: deviation.toFixed(1),
          },
        },
      });
    }
  }

  console.log('   1 Financial Alert creado');

  console.log(
    `\n   Demo Tenant "${(await prisma.tenant.findUnique({ where: { id: DEMO_TENANT_ID } }))?.name}" COMPLETO.\n`
  );

  // ========================================
  // SUMMARY
  // ========================================
  /*
  // STEP 5: TENANT 2 - HFD SA
  // ========================================
  console.log('5. TENANT 2 - HFD SA...\n');

  const tenant2 = await prisma.tenant.create({
    data: {
      id: DEMO_TENANT_ID,
      name: 'HFD SA',
      slug: 'hfd-sa',
      country: 'CO',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@hfdsa.co',
    },
  });

  // Users (emails reales de Clerk para poder loguearse)
  const t2OwnerUser = await prisma.user.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      email: 'grivarol69@gmail.com',
      firstName: 'Guillermo',
      lastName: 'Rivarola',
      role: 'OWNER',
      isActive: true,
    },
  });
  await prisma.user.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      email: 'grivarol69driver@gmail.com',
      firstName: 'Yeison',
      lastName: 'Montaño',
      role: 'MANAGER',
      isActive: true,
    },
  });
  await prisma.user.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      email: 'grivarol1975@gmail.com',
      firstName: 'Josue',
      lastName: 'Caro',
      role: 'TECHNICIAN',
      isActive: true,
    },
  });
  console.log('   3 users creados');

  // Providers
  await Promise.all([
    prisma.provider.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Filtros Col',
        specialty: 'FILTROS',
        status: 'ACTIVE',
        nit: '900111222',
        siigoIdType: 'NIT',
        siigoPersonType: 'COMPANY',
        stateCode: '11',
        cityCode: '11001',
        fiscalResponsibilities: ['O-15'],
        vatResponsible: true,
      },
    }),
    prisma.provider.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Taller Norte',
        specialty: 'SERVICIOS_GENERALES',
        status: 'ACTIVE',
        nit: '800555444',
        siigoIdType: 'NIT',
        siigoPersonType: 'COMPANY',
        stateCode: '76', // Valle
        cityCode: '76001',
        fiscalResponsibilities: ['O-15', 'O-47'],
        vatResponsible: true,
      },
    }),
    prisma.provider.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Electricidad Auto',
        specialty: 'ELECTRICO',
        status: 'ACTIVE',
        nit: '1098765432',
        siigoIdType: 'CC',
        siigoPersonType: 'PERSON',
        stateCode: '11',
        cityCode: '11001',
        fiscalResponsibilities: ['R-99-PN'],
        vatResponsible: false,
      },
    }),
  ]);
  console.log('   3 proveedores creados');

  // Technicians
  await Promise.all([
    prisma.technician.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Taller Servicios',
        specialty: 'ELECTRICO',
        status: 'ACTIVE',
        hourlyRate: 28000,
      },
    }),
    prisma.technician.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Mecanica Express',
        specialty: 'GENERAL',
        status: 'ACTIVE',
        hourlyRate: 30000,
      },
    }),
  ]);
  console.log('   2 tecnicos creados');

  // Drivers
  const t2Drivers = await Promise.all([
    prisma.driver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Alberto Ruiz',
        licenseNumber: 'LIC-T2-001',
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: 'Sandra Castro',
        licenseNumber: 'LIC-T2-002',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log('   2 conductores creados');

  // Vehicles
  const t2Vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'XYZ-111',
        brandId: chevrolet.id,
        lineId: dmax.id,
        typeId: type4x4.id,
        year: 2023,
        mileage: 8500,
        color: 'Blanco',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        fuelType: 'DIESEL',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'XYZ-222',
        brandId: mitsubishi.id,
        lineId: l200.id,
        typeId: type4x4.id,
        year: 2022,
        mileage: 35000,
        color: 'Rojo',
        status: 'ACTIVE',
        situation: 'IN_USE',
        fuelType: 'DIESEL',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'XYZ-333',
        brandId: ford.id,
        lineId: ranger.id,
        typeId: type4x4.id,
        year: 2021,
        mileage: 58000,
        color: 'Gris',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        fuelType: 'DIESEL',
      },
    }),
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'XYZ-444',
        brandId: toyota.id,
        lineId: hilux.id,
        typeId: type4x4.id,
        year: 2020,
        mileage: 82000,
        color: 'Negro',
        status: 'ACTIVE',
        situation: 'IN_USE',
        fuelType: 'DIESEL',
      },
    }),
  ]);
  console.log('   4 vehiculos creados');

  // Vehicle-Driver assignments
  await Promise.all([
    prisma.vehicleDriver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t2Vehicles[0].id,
        driverId: t2Drivers[0].id,
        isPrimary: true,
        assignedBy: t2OwnerUser.id,
      },
    }),
    prisma.vehicleDriver.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t2Vehicles[1].id,
        driverId: t2Drivers[1].id,
        isPrimary: true,
        assignedBy: t2OwnerUser.id,
      },
    }),
  ]);
  console.log('   2 asignaciones vehiculo-conductor creadas');

  // Maintenance Programs
  console.log('   Creando programas de mantenimiento...');
  // XYZ-111 D-MAX 8.5K -> 5K COMPLETED, 10K PENDING
  await createProgramFromTemplate(
    DEMO_TENANT_ID,
    t2Vehicles[0].id,
    'D-MAX XYZ-111',
    tplDmax.id,
    'Chevrolet D-MAX Standard',
    0,
    8500,
    t2OwnerUser.id
  );
  // XYZ-222 L200 35K -> no template for L200, skip
  // XYZ-333 Ranger 58K -> all COMPLETED, next ~35K
  await createProgramFromTemplate(
    DEMO_TENANT_ID,
    t2Vehicles[2].id,
    'Ranger XYZ-333',
    tplRanger.id,
    'Ford Ranger Standard',
    0,
    58000,
    t2OwnerUser.id
  );
  // XYZ-444 Hilux 82K -> all COMPLETED, next ~35K
  await createProgramFromTemplate(
    DEMO_TENANT_ID,
    t2Vehicles[3].id,
    'Hilux XYZ-444',
    tplHilux.id,
    'Toyota Hilux Standard',
    0,
    82000,
    t2OwnerUser.id
  );
  console.log('   3 programas creados (XYZ-222 sin template)');

  // Inventory (Tenant 2)
  console.log('   Creando inventario...');
  const t2InventoryData = [
    { masterPartId: pCastrolGTX.id, quantity: 15, minStock: 5, avgCost: 35000 },
    { masterPartId: pMannFiltAce.id, quantity: 5, minStock: 2, avgCost: 32000 },
    {
      masterPartId: pMannFiltAire.id,
      quantity: 3,
      minStock: 1,
      avgCost: 48000,
    },
    {
      masterPartId: pBoschFiltComb.id,
      quantity: 2,
      minStock: 1,
      avgCost: 55000,
    },
    {
      masterPartId: pBoschPastillas.id,
      quantity: 3,
      minStock: 1,
      avgCost: 185000,
    },
    { masterPartId: pCastrolDOT4.id, quantity: 6, minStock: 2, avgCost: 22000 },
  ];
  for (const inv of t2InventoryData) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        masterPartId: inv.masterPartId,
        warehouse: 'PRINCIPAL',
        quantity: inv.quantity,
        minStock: inv.minStock,
        averageCost: inv.avgCost,
        totalValue: inv.quantity * inv.avgCost,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`   ${t2InventoryData.length} items de inventario creados`);

  // ========================================
  // WORK ORDERS - Tenant 2
  // ========================================
  console.log('   Creando Work Orders Tenant 2...');
  
  const t2VehiclesList = await prisma.vehicle.findMany({ where: { tenantId: DEMO_TENANT_ID } });
  const t2ProviderList = await prisma.provider.findMany({ where: { tenantId: DEMO_TENANT_ID } });
  const t2TechnicianList = await prisma.technician.findMany({ where: { tenantId: DEMO_TENANT_ID } });
  const t2UsersList = await prisma.user.findMany({ where: { tenantId: DEMO_TENANT_ID } });
  const t2MantItems = await prisma.mantItem.findMany({ where: { isGlobal: true } });
  
  const filtrosCol = t2ProviderList.find(p => p.name === 'Filtros Col');
  const tallerNorte = t2ProviderList.find(p => p.name === 'Taller Norte');
  const t2OwnerUserUser = t2UsersList.find(u => u.role === 'OWNER');
  
  if (t2VehiclesList.length > 0 && filtrosCol && t2OwnerUserUser) {
    // WO 1: Mantenimiento XYZ-111
    const wo1 = await prisma.workOrder.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t2VehiclesList[0].id,
        title: 'Mantenimiento 10,000 km',
        description: 'Servicio preventivo',
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        workType: 'EXTERNAL',
        providerId: filtrosCol?.id,
        creationMileage: 10000,
        requestedBy: t2OwnerUser.id,
        authorizedBy: t2OwnerUser.id,
        estimatedCost: 380000,
        actualCost: 395000,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-01'),
        completionMileage: 10000,
      },
    });
    
    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo1.id,
        mantItemId: t2MantItems.find(i => i.name === 'Cambio aceite motor')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Aceite Castrol GTX 15W-40',
        partNumber: 'CASTROL-GTX-15W40',
        brand: 'Castrol',
        supplier: 'Filtros Col',
        unitPrice: 35000,
        quantity: 5,
        totalCost: 175000,
        purchasedBy: t2OwnerUser.id,
        masterPartId: pCastrolGTX.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });
    
    // WO 2: Cambio filtro
    const wo2 = await prisma.workOrder.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t2VehiclesList[1].id,
        title: 'Cambio filtros',
        description: 'Filtros de aceite y aire',
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        workType: 'EXTERNAL',
        providerId: filtrosCol?.id,
        creationMileage: 35000,
        requestedBy: t2OwnerUser.id,
        authorizedBy: t2OwnerUser.id,
        estimatedCost: 120000,
        actualCost: 128000,
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-02-15'),
        completionMileage: 35000,
      },
    });
    
    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo2.id,
        mantItemId: t2MantItems.find(i => i.name === 'Cambio filtro aceite')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Filtro Aceite MANN',
        partNumber: 'MANN-W920/21',
        brand: 'Mann',
        supplier: 'Filtros Col',
        unitPrice: 32000,
        quantity: 1,
        totalCost: 32000,
        purchasedBy: t2OwnerUser.id,
        masterPartId: pMannFiltAce.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });
    
    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo2.id,
        mantItemId: t2MantItems.find(i => i.name === 'Cambio filtro aire')?.id || '',
        tenantId: DEMO_TENANT_ID,
        description: 'Filtro Aire MANN',
        partNumber: 'MANN-C25114',
        brand: 'Mann',
        supplier: 'Filtros Col',
        unitPrice: 48000,
        quantity: 1,
        totalCost: 48000,
        purchasedBy: t2OwnerUser.id,
        masterPartId: pMannFiltAire.id,
        itemSource: 'EXTERNAL',
        status: 'COMPLETED',
      },
    });
    
    // WO 3: Ranger XYZ-333
    const wo3 = await prisma.workOrder.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t2VehiclesList[2].id,
        title: 'Mantenimiento 60,000 km',
        description: 'Servicio mayor',
        mantType: 'PREVENTIVE',
        priority: 'HIGH',
        status: 'COMPLETED',
        workType: 'MIXED',
        technicianId: t2TechnicianList[0]?.id,
        providerId: tallerNorte?.id,
        creationMileage: 60000,
        requestedBy: t2OwnerUser.id,
        authorizedBy: t2OwnerUser.id,
        estimatedCost: 920000,
        actualCost: 985000,
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-02'),
        completionMileage: 60000,
      },
    });
    
    console.log('   3 Work Orders Tenant 2 creados');
  }

  // ========================================
  // INVOICES - Tenant 2
  // ========================================
  console.log('   Creando Invoices Tenant 2...');
  
  if (filtrosCol && t2OwnerUser) {
    const inv1 = await prisma.invoice.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        invoiceNumber: 'FAC-HFD-2025-001',
        invoiceDate: new Date('2025-02-02'),
        dueDate: new Date('2025-03-02'),
        supplierId: filtrosCol.id,
        subtotal: 175000,
        taxAmount: 33250,
        totalAmount: 208250,
        currency: 'COP',
        status: 'PAID',
        approvedBy: t2OwnerUser.id,
        approvedAt: new Date('2025-02-05'),
        registeredBy: t2OwnerUser.id,
      },
    });
    
    await prisma.invoiceItem.create({
      data: {
        invoiceId: inv1.id,
        tenantId: DEMO_TENANT_ID,
        masterPartId: pCastrolGTX.id,
        description: 'Aceite Castrol GTX 15W-40',
        quantity: 5,
        unitPrice: 35000,
        subtotal: 175000,
        taxRate: 19,
        taxAmount: 33250,
        total: 208250,
      },
    });
    
    const inv2 = await prisma.invoice.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        invoiceNumber: 'FAC-HFD-2025-002',
        invoiceDate: new Date('2025-02-16'),
        dueDate: new Date('2025-03-16'),
        supplierId: filtrosCol.id,
        subtotal: 80000,
        taxAmount: 15200,
        totalAmount: 95200,
        currency: 'COP',
        status: 'PAID',
        approvedBy: t2OwnerUser.id,
        approvedAt: new Date('2025-02-18'),
        registeredBy: t2OwnerUser.id,
      },
    });
    
    await prisma.invoiceItem.create({
      data: {
        invoiceId: inv2.id,
        tenantId: DEMO_TENANT_ID,
        masterPartId: pMannFiltAce.id,
        description: 'Filtro Aceite MANN W920/21',
        quantity: 1,
        unitPrice: 32000,
        subtotal: 32000,
        taxRate: 19,
        taxAmount: 6080,
        total: 38080,
      },
    });
    
    await prisma.invoiceItem.create({
      data: {
        invoiceId: inv2.id,
        tenantId: DEMO_TENANT_ID,
        masterPartId: pMannFiltAire.id,
        description: 'Filtro Aire MANN C25114',
        quantity: 1,
        unitPrice: 48000,
        subtotal: 48000,
        taxRate: 19,
        taxAmount: 9120,
        total: 57120,
      },
    });
    
    console.log('   2 Invoices Tenant 2 creadas');
  }

  // ========================================
  // MAINTENANCE ALERTS - Tenant 2
  // ========================================
  console.log('   Creando Maintenance Alerts Tenant 2...');
  
  const t2VehiclesWithProgram = await prisma.vehicle.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    include: { vehicleMantProgram: { include: { packages: { include: { items: true } } } } }
  });
  
  if (t2VehiclesWithProgram.length > 0) {
    const xyz111 = t2VehiclesWithProgram.find(v => v.licensePlate === 'XYZ-111');
    if (xyz111 && xyz111.vehicleMantProgram) {
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          vehicleId: xyz111.id,
          programItemId: xyz111.vehicleMantProgram.packages[0]?.items[0]?.id || '',
          type: 'PREVENTIVE',
          category: 'ROUTINE',
          itemName: 'Cambio filtro combustible',
          packageName: 'Mantenimiento 15,000 km',
          scheduledKm: 15000,
          currentKmAtCreation: 8500,
          currentKm: 9200,
          kmToMaintenance: 15000 - 9200,
          alertThresholdKm: 1000,
          priority: 'MEDIUM',
          alertLevel: 'LOW',
          priorityScore: 35,
          status: 'PENDING',
        },
      });
    }
    
    console.log('   1 Maintenance Alert Tenant 2 creado');
  }

  console.log(`\n   Tenant 2 COMPLETO.\n`);
  */

  // Suppress unused variable warnings
  void ALL_TENANT_IDS;

  // ========================================
  // SUMMARY
  // ========================================
  console.log('==============================================');
  console.log('  SEED MULTI-TENANT COMPLETADO');
  console.log('==============================================\n');

  console.log('KNOWLEDGE BASE GLOBAL (tenantId: null):');
  console.log('  - 7 Brands, 17 Lines, 5 Types');
  console.log('  - 11 Categories, 38 MantItems');
  console.log('  - 14 MasterParts');
  console.log('  - 5 Templates con paquetes');
  console.log('  - 5 DocumentTypeConfigs (CO)');
  console.log(
    `  - ${kbEntries.length} MantItemVehiclePart (KB auto-sugerencia)`
  );

  console.log('\nPLATFORM TENANT:');
  console.log('  - Fleet Care Platform');
  console.log('  - SUPER_ADMIN: grivarol69@gmail.com');

  console.log('\nDEMO TENANT:');
  console.log(`  - ID: ${DEMO_TENANT_ID}`);
  console.log(`  - OWNER: ${ownerEmail}`);
  console.log(`  - MANAGER: ${managerEmail}`);
  console.log(`  - TECHNICIAN: ${techEmail}`);
  console.log(`  - PURCHASER: ${purchaserEmail}`);
  console.log(`  - ${t1Vehicles.length} vehicles`);
  console.log('  - 3 proveedores, 2 tecnicos, 3 conductores');
  console.log('  - 3 programas de mantenimiento');
  console.log(`  - ${t1InventoryData.length} items de inventario`);
  console.log('  - 4 Work Orders');
  console.log('  - 3 Invoices');
  console.log('  - 3 Maintenance Alerts');
  console.log('  - 1 Financial Alert');

  // ========================================
  // SEEDS ESPECÍFICOS
  // ========================================
  console.log('\n6. Seeds específicos...\n');

  // Hino 300 Dutro
  await seedHino300Dutro(prisma);

  // International 7400 WorkStar
  await seedInternational7400WorkStar(prisma);

  // Tempario Automotriz
  await seedTemparioAutomotriz(prisma);

  console.log('\nAISLAMIENTO:');
  console.log('  - Demo tenant tiene datos propios');
  console.log('  - SUPER_ADMIN ve todos los tenants');
  console.log('  - Ambos ven KB global (marcas, lineas, items, templates)');
}

main()
  .catch(e => {
    console.error('Error durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
