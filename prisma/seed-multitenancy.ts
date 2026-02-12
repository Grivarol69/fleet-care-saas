import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ========================================
// IDs CONFIRMADOS
// ========================================
const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TENANT_1_ID = 'org_38zCXuXqy5Urw5CuaisTHu3jLTq'; // Transportes Demo SAS
const TENANT_2_ID = 'org_39SGMg0wtIdphVg1AK7ZIslCxDc'; // HFD SA

const ALL_TENANT_IDS = [PLATFORM_TENANT_ID, TENANT_1_ID, TENANT_2_ID];

// ========================================
// HELPER: Create maintenance program for a vehicle from a template
// ========================================
async function createProgramFromTemplate(
  tenantId: string,
  vehicleId: number,
  vehicleName: string,
  templateId: number,
  templateName: string,
  assignmentKm: number,
  currentMileage: number,
  generatedBy: string,
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
        startDate: pkgStatus === 'COMPLETED' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : undefined,
        endDate: pkgStatus === 'COMPLETED' ? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) : undefined,
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
    prisma.vehicleBrand.create({ data: { name: 'Toyota', isGlobal: true, tenantId: null } }),
    prisma.vehicleBrand.create({ data: { name: 'Ford', isGlobal: true, tenantId: null } }),
    prisma.vehicleBrand.create({ data: { name: 'Chevrolet', isGlobal: true, tenantId: null } }),
    prisma.vehicleBrand.create({ data: { name: 'Nissan', isGlobal: true, tenantId: null } }),
    prisma.vehicleBrand.create({ data: { name: 'Mitsubishi', isGlobal: true, tenantId: null } }),
  ]);
  const [toyota, ford, chevrolet, nissan, mitsubishi] = brands;

  // --- LINES ---
  console.log('   Creando lines...');
  const lines = await Promise.all([
    // Toyota [0-2]
    prisma.vehicleLine.create({ data: { name: 'Hilux', brandId: toyota.id, isGlobal: true, tenantId: null } }),
    prisma.vehicleLine.create({ data: { name: 'Land Cruiser', brandId: toyota.id, isGlobal: true, tenantId: null } }),
    prisma.vehicleLine.create({ data: { name: 'Prado', brandId: toyota.id, isGlobal: true, tenantId: null } }),
    // Ford [3-5]
    prisma.vehicleLine.create({ data: { name: 'Ranger', brandId: ford.id, isGlobal: true, tenantId: null } }),
    prisma.vehicleLine.create({ data: { name: 'F-150', brandId: ford.id, isGlobal: true, tenantId: null } }),
    prisma.vehicleLine.create({ data: { name: 'Transit', brandId: ford.id, isGlobal: true, tenantId: null } }),
    // Chevrolet [6-8]
    prisma.vehicleLine.create({ data: { name: 'D-MAX', brandId: chevrolet.id, isGlobal: true, tenantId: null } }),
    prisma.vehicleLine.create({ data: { name: 'Silverado', brandId: chevrolet.id, isGlobal: true, tenantId: null } }),
    prisma.vehicleLine.create({ data: { name: 'NPR', brandId: chevrolet.id, isGlobal: true, tenantId: null } }),
    // Nissan [9-10]
    prisma.vehicleLine.create({ data: { name: 'Frontier', brandId: nissan.id, isGlobal: true, tenantId: null } }),
    prisma.vehicleLine.create({ data: { name: 'Navara', brandId: nissan.id, isGlobal: true, tenantId: null } }),
    // Mitsubishi [11-12]
    prisma.vehicleLine.create({ data: { name: 'L200', brandId: mitsubishi.id, isGlobal: true, tenantId: null } }),
    prisma.vehicleLine.create({ data: { name: 'Montero', brandId: mitsubishi.id, isGlobal: true, tenantId: null } }),
  ]);
  const [hilux, landCruiser, , ranger, , , dmax, , , frontier, , l200] = lines;

  // --- TYPES ---
  console.log('   Creando types...');
  const types = await Promise.all([
    prisma.vehicleType.create({ data: { name: 'Camioneta 4x4', isGlobal: true, tenantId: null } }),
    prisma.vehicleType.create({ data: { name: 'Camion de Carga', isGlobal: true, tenantId: null } }),
    prisma.vehicleType.create({ data: { name: 'Camioneta Pasajeros', isGlobal: true, tenantId: null } }),
    prisma.vehicleType.create({ data: { name: 'Vehiculo Urbano', isGlobal: true, tenantId: null } }),
    prisma.vehicleType.create({ data: { name: 'SUV', isGlobal: true, tenantId: null } }),
  ]);
  const [type4x4, , , , typeSUV] = types;

  // --- CATEGORIES ---
  console.log('   Creando categories...');
  const cats = await Promise.all([
    prisma.mantCategory.create({ data: { name: 'Motor', description: 'Sistema de motor y combustible', isGlobal: true, tenantId: null } }),
    prisma.mantCategory.create({ data: { name: 'Transmision', description: 'Caja de cambios y embrague', isGlobal: true, tenantId: null } }),
    prisma.mantCategory.create({ data: { name: 'Frenos', description: 'Sistema de frenado', isGlobal: true, tenantId: null } }),
    prisma.mantCategory.create({ data: { name: 'Suspension', description: 'Amortiguadores y resortes', isGlobal: true, tenantId: null } }),
    prisma.mantCategory.create({ data: { name: 'Electrico', description: 'Sistema electrico y bateria', isGlobal: true, tenantId: null } }),
    prisma.mantCategory.create({ data: { name: 'Lubricacion', description: 'Aceites y lubricantes', isGlobal: true, tenantId: null } }),
    prisma.mantCategory.create({ data: { name: 'Filtros', description: 'Filtros aire, aceite, combustible', isGlobal: true, tenantId: null } }),
    prisma.mantCategory.create({ data: { name: 'Neumaticos', description: 'Llantas y neumaticos', isGlobal: true, tenantId: null } }),
    prisma.mantCategory.create({ data: { name: 'Carroceria', description: 'Elementos de carroceria', isGlobal: true, tenantId: null } }),
  ]);
  const [catMotor, catTransmision, catFrenos, catSuspension, catElectrico, catLubricacion, catFiltros, catNeumaticos] = cats;

  // --- MANT ITEMS (17 preventivos + 16 correctivos = 33) ---
  console.log('   Creando mant items (33)...');
  const items = await Promise.all([
    // PREVENTIVOS [0-16]
    // Motor [0-2]
    prisma.mantItem.create({ data: { name: 'Cambio aceite motor', description: 'Cambio de aceite motor sintetico', mantType: 'PREVENTIVE', categoryId: catMotor.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Inspeccion sistema combustible', mantType: 'PREVENTIVE', categoryId: catMotor.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Ajuste valvulas', mantType: 'PREVENTIVE', categoryId: catMotor.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    // Filtros [3-5]
    prisma.mantItem.create({ data: { name: 'Cambio filtro aceite', mantType: 'PREVENTIVE', categoryId: catFiltros.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio filtro aire', mantType: 'PREVENTIVE', categoryId: catFiltros.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio filtro combustible', mantType: 'PREVENTIVE', categoryId: catFiltros.id, type: 'PART', isGlobal: true, tenantId: null } }),
    // Frenos preventivo [6-7]
    prisma.mantItem.create({ data: { name: 'Inspeccion pastillas freno', mantType: 'PREVENTIVE', categoryId: catFrenos.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio liquido frenos', mantType: 'PREVENTIVE', categoryId: catFrenos.id, type: 'PART', isGlobal: true, tenantId: null } }),
    // Suspension preventivo [8-9]
    prisma.mantItem.create({ data: { name: 'Inspeccion amortiguadores', mantType: 'PREVENTIVE', categoryId: catSuspension.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Lubricacion rotulas', mantType: 'PREVENTIVE', categoryId: catSuspension.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    // Electrico preventivo [10-11]
    prisma.mantItem.create({ data: { name: 'Inspeccion bateria', mantType: 'PREVENTIVE', categoryId: catElectrico.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Limpieza terminales bateria', mantType: 'PREVENTIVE', categoryId: catElectrico.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    // Transmision preventivo [12-13]
    prisma.mantItem.create({ data: { name: 'Cambio aceite transmision', mantType: 'PREVENTIVE', categoryId: catTransmision.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Ajuste embrague', mantType: 'PREVENTIVE', categoryId: catTransmision.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    // Neumaticos preventivo [14-15]
    prisma.mantItem.create({ data: { name: 'Rotacion neumaticos', mantType: 'PREVENTIVE', categoryId: catNeumaticos.id, type: 'ACTION', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Balanceo y alineacion', mantType: 'PREVENTIVE', categoryId: catNeumaticos.id, type: 'SERVICE', isGlobal: true, tenantId: null } }),
    // Lubricacion preventivo [16]
    prisma.mantItem.create({ data: { name: 'Cambio liquido direccion hidraulica', mantType: 'PREVENTIVE', categoryId: catLubricacion.id, type: 'PART', isGlobal: true, tenantId: null } }),

    // CORRECTIVOS [17-32]
    // Frenos [17-20]
    prisma.mantItem.create({ data: { name: 'Cambio pastillas freno delanteras', description: 'Reemplazo de pastillas desgastadas delanteras', mantType: 'CORRECTIVE', categoryId: catFrenos.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio pastillas freno traseras', description: 'Reemplazo de pastillas desgastadas traseras', mantType: 'CORRECTIVE', categoryId: catFrenos.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio discos freno', description: 'Reemplazo de discos de freno desgastados', mantType: 'CORRECTIVE', categoryId: catFrenos.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Reparacion cilindro maestro', mantType: 'CORRECTIVE', categoryId: catFrenos.id, type: 'SERVICE', isGlobal: true, tenantId: null } }),
    // Motor [21-23]
    prisma.mantItem.create({ data: { name: 'Cambio correa distribucion', mantType: 'CORRECTIVE', categoryId: catMotor.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Reparacion empaque culata', mantType: 'CORRECTIVE', categoryId: catMotor.id, type: 'SERVICE', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio bomba agua', mantType: 'CORRECTIVE', categoryId: catMotor.id, type: 'PART', isGlobal: true, tenantId: null } }),
    // Suspension [24-26]
    prisma.mantItem.create({ data: { name: 'Cambio amortiguadores', mantType: 'CORRECTIVE', categoryId: catSuspension.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio rotulas', mantType: 'CORRECTIVE', categoryId: catSuspension.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio bujes suspension', mantType: 'CORRECTIVE', categoryId: catSuspension.id, type: 'PART', isGlobal: true, tenantId: null } }),
    // Electrico [27-29]
    prisma.mantItem.create({ data: { name: 'Cambio bateria', mantType: 'CORRECTIVE', categoryId: catElectrico.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio alternador', mantType: 'CORRECTIVE', categoryId: catElectrico.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Cambio motor arranque', mantType: 'CORRECTIVE', categoryId: catElectrico.id, type: 'PART', isGlobal: true, tenantId: null } }),
    // Transmision [30-31]
    prisma.mantItem.create({ data: { name: 'Cambio kit embrague', mantType: 'CORRECTIVE', categoryId: catTransmision.id, type: 'PART', isGlobal: true, tenantId: null } }),
    prisma.mantItem.create({ data: { name: 'Reparacion caja cambios', mantType: 'CORRECTIVE', categoryId: catTransmision.id, type: 'SERVICE', isGlobal: true, tenantId: null } }),
    // Neumaticos [32]
    prisma.mantItem.create({ data: { name: 'Cambio neumaticos', mantType: 'CORRECTIVE', categoryId: catNeumaticos.id, type: 'PART', isGlobal: true, tenantId: null } }),
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
  const iPastillasDelant = items[17];

  // --- MASTER PARTS (10) ---
  console.log('   Creando master parts (10)...');
  const parts = await Promise.all([
    // Aceites [0-2]
    prisma.masterPart.create({ data: { tenantId: null, code: 'SHELL-HELIX-HX7-10W40', description: 'Aceite Shell Helix HX7 10W-40 Semi-Sintetico', category: 'LUBRICANTES', subcategory: 'ACEITE_MOTOR', unit: 'LITRO', referencePrice: 45000, lastPriceUpdate: new Date(), isActive: true } }),
    prisma.masterPart.create({ data: { tenantId: null, code: 'MOBIL-SUPER-3000-5W40', description: 'Aceite Mobil Super 3000 5W-40 Sintetico', category: 'LUBRICANTES', subcategory: 'ACEITE_MOTOR', unit: 'LITRO', referencePrice: 58000, lastPriceUpdate: new Date(), isActive: true } }),
    prisma.masterPart.create({ data: { tenantId: null, code: 'CASTROL-GTX-15W40', description: 'Aceite Castrol GTX 15W-40 Mineral', category: 'LUBRICANTES', subcategory: 'ACEITE_MOTOR', unit: 'LITRO', referencePrice: 35000, lastPriceUpdate: new Date(), isActive: true } }),
    // Filtros [3-7]
    prisma.masterPart.create({ data: { tenantId: null, code: 'BOSCH-0986AF0134', description: 'Filtro Aceite BOSCH 0986AF0134', category: 'FILTROS', subcategory: 'FILTRO_ACEITE', unit: 'UNIDAD', referencePrice: 28000, lastPriceUpdate: new Date(), isActive: true } }),
    prisma.masterPart.create({ data: { tenantId: null, code: 'MANN-W920/21', description: 'Filtro Aceite MANN W920/21', category: 'FILTROS', subcategory: 'FILTRO_ACEITE', unit: 'UNIDAD', referencePrice: 32000, lastPriceUpdate: new Date(), isActive: true } }),
    prisma.masterPart.create({ data: { tenantId: null, code: 'BOSCH-F026400364', description: 'Filtro Aire BOSCH F026400364', category: 'FILTROS', subcategory: 'FILTRO_AIRE', unit: 'UNIDAD', referencePrice: 42000, lastPriceUpdate: new Date(), isActive: true } }),
    prisma.masterPart.create({ data: { tenantId: null, code: 'MANN-C25114', description: 'Filtro Aire MANN C25114', category: 'FILTROS', subcategory: 'FILTRO_AIRE', unit: 'UNIDAD', referencePrice: 48000, lastPriceUpdate: new Date(), isActive: true } }),
    prisma.masterPart.create({ data: { tenantId: null, code: 'BOSCH-F026402065', description: 'Filtro Combustible BOSCH F026402065', category: 'FILTROS', subcategory: 'FILTRO_COMBUSTIBLE', unit: 'UNIDAD', referencePrice: 55000, lastPriceUpdate: new Date(), isActive: true } }),
    // Frenos [8-9]
    prisma.masterPart.create({ data: { tenantId: null, code: 'BOSCH-0986AB1234', description: 'Pastillas Freno Delanteras BOSCH', category: 'FRENOS', subcategory: 'PASTILLAS', unit: 'JUEGO', referencePrice: 185000, lastPriceUpdate: new Date(), isActive: true } }),
    prisma.masterPart.create({ data: { tenantId: null, code: 'CASTROL-DOT4-500ML', description: 'Liquido Frenos Castrol DOT4 500ml', category: 'FRENOS', subcategory: 'LIQUIDO_FRENOS', unit: 'UNIDAD', referencePrice: 22000, lastPriceUpdate: new Date(), isActive: true } }),
  ]);
  const [pShell, pMobil, pCastrolGTX, pBoschFiltAce, pMannFiltAce, pBoschFiltAire, pMannFiltAire, pBoschFiltComb, pBoschPastillas, pCastrolDOT4] = parts;
  console.log(`   ${parts.length} master parts creados`);

  // --- TEMPLATES (3) with packages ---
  console.log('   Creando templates (3) con paquetes (12)...');

  // Helper to create packages with items for a template
  async function createTemplatePackages(
    templateId: number,
    packages: Array<{
      name: string;
      triggerKm: number;
      estimatedCost: number;
      estimatedTime: number;
      priority: 'MEDIUM' | 'HIGH';
      items: Array<{ mantItemId: number; triggerKm: number; estimatedTime: number; order: number; priority: 'LOW' | 'MEDIUM' | 'HIGH' }>;
    }>,
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
        pkg.items.map((item) =>
          prisma.packageItem.create({
            data: {
              packageId: created.id,
              mantItemId: item.mantItemId,
              triggerKm: item.triggerKm,
              estimatedTime: item.estimatedTime,
              order: item.order,
              priority: item.priority,
            },
          }),
        ),
      );
    }
  }

  // Template: Toyota Hilux Standard
  const tplHilux = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Toyota Hilux Standard', description: 'Programa mantenimiento preventivo Toyota Hilux',
      vehicleBrandId: toyota.id, vehicleLineId: hilux.id, version: '1.0', isDefault: true, isGlobal: true, tenantId: null,
    },
  });
  await createTemplatePackages(tplHilux.id, [
    {
      name: 'Mantenimiento 5,000 km', triggerKm: 5000, estimatedCost: 450000, estimatedTime: 2.5, priority: 'MEDIUM',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 5000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 5000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 5000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iInspFreno.id, triggerKm: 5000, estimatedTime: 0.5, order: 4, priority: 'HIGH' },
        { mantItemId: iInspBateria.id, triggerKm: 5000, estimatedTime: 0.3, order: 5, priority: 'LOW' },
        { mantItemId: iRotNeumaticos.id, triggerKm: 5000, estimatedTime: 0.7, order: 6, priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Mantenimiento 10,000 km', triggerKm: 10000, estimatedCost: 550000, estimatedTime: 3.0, priority: 'MEDIUM',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 10000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 10000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 10000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 10000, estimatedTime: 0.3, order: 4, priority: 'MEDIUM' },
        { mantItemId: iInspFreno.id, triggerKm: 10000, estimatedTime: 0.5, order: 5, priority: 'HIGH' },
        { mantItemId: iInspAmort.id, triggerKm: 10000, estimatedTime: 0.5, order: 6, priority: 'MEDIUM' },
        { mantItemId: iLubRotulas.id, triggerKm: 10000, estimatedTime: 0.4, order: 7, priority: 'MEDIUM' },
        { mantItemId: iBalanceo.id, triggerKm: 10000, estimatedTime: 0.8, order: 8, priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Mantenimiento 20,000 km', triggerKm: 20000, estimatedCost: 750000, estimatedTime: 4.0, priority: 'HIGH',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 20000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 20000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 20000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 20000, estimatedTime: 0.3, order: 4, priority: 'MEDIUM' },
        { mantItemId: iAjusteValvulas.id, triggerKm: 20000, estimatedTime: 1.0, order: 5, priority: 'HIGH' },
        { mantItemId: iInspFreno.id, triggerKm: 20000, estimatedTime: 0.5, order: 6, priority: 'HIGH' },
        { mantItemId: iLiquidoFreno.id, triggerKm: 20000, estimatedTime: 0.5, order: 7, priority: 'HIGH' },
        { mantItemId: iAceiteTransm.id, triggerKm: 20000, estimatedTime: 1.2, order: 8, priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Mantenimiento 30,000 km', triggerKm: 30000, estimatedCost: 950000, estimatedTime: 5.0, priority: 'HIGH',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 30000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 30000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 30000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 30000, estimatedTime: 0.3, order: 4, priority: 'MEDIUM' },
        { mantItemId: iAjusteValvulas.id, triggerKm: 30000, estimatedTime: 1.0, order: 5, priority: 'HIGH' },
        { mantItemId: iInspFreno.id, triggerKm: 30000, estimatedTime: 0.5, order: 6, priority: 'HIGH' },
        { mantItemId: iLiquidoFreno.id, triggerKm: 30000, estimatedTime: 0.5, order: 7, priority: 'HIGH' },
        { mantItemId: iAceiteTransm.id, triggerKm: 30000, estimatedTime: 1.2, order: 8, priority: 'MEDIUM' },
        { mantItemId: iAjusteEmbrague.id, triggerKm: 30000, estimatedTime: 1.5, order: 9, priority: 'MEDIUM' },
        { mantItemId: iLiqDireccion.id, triggerKm: 30000, estimatedTime: 0.5, order: 10, priority: 'MEDIUM' },
      ],
    },
  ]);

  // Template: Ford Ranger Standard
  const tplRanger = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Ford Ranger Standard', description: 'Programa mantenimiento preventivo Ford Ranger',
      vehicleBrandId: ford.id, vehicleLineId: ranger.id, version: '1.0', isDefault: true, isGlobal: true, tenantId: null,
    },
  });
  await createTemplatePackages(tplRanger.id, [
    {
      name: 'Mantenimiento 5,000 km', triggerKm: 5000, estimatedCost: 430000, estimatedTime: 2.5, priority: 'MEDIUM',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 5000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 5000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 5000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iInspBateria.id, triggerKm: 5000, estimatedTime: 0.3, order: 4, priority: 'LOW' },
      ],
    },
    {
      name: 'Mantenimiento 10,000 km', triggerKm: 10000, estimatedCost: 520000, estimatedTime: 3.0, priority: 'MEDIUM',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 10000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 10000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 10000, estimatedTime: 0.3, order: 3, priority: 'MEDIUM' },
        { mantItemId: iInspFreno.id, triggerKm: 10000, estimatedTime: 0.5, order: 4, priority: 'HIGH' },
      ],
    },
    {
      name: 'Mantenimiento 20,000 km', triggerKm: 20000, estimatedCost: 720000, estimatedTime: 4.0, priority: 'HIGH',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 20000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 20000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 20000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 20000, estimatedTime: 0.3, order: 4, priority: 'MEDIUM' },
        { mantItemId: iInspFreno.id, triggerKm: 20000, estimatedTime: 0.5, order: 5, priority: 'HIGH' },
        { mantItemId: iLiquidoFreno.id, triggerKm: 20000, estimatedTime: 0.5, order: 6, priority: 'HIGH' },
        { mantItemId: iAceiteTransm.id, triggerKm: 20000, estimatedTime: 1.2, order: 7, priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Mantenimiento 30,000 km', triggerKm: 30000, estimatedCost: 920000, estimatedTime: 5.0, priority: 'HIGH',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 30000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 30000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 30000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 30000, estimatedTime: 0.3, order: 4, priority: 'MEDIUM' },
        { mantItemId: iAjusteValvulas.id, triggerKm: 30000, estimatedTime: 1.0, order: 5, priority: 'HIGH' },
        { mantItemId: iInspFreno.id, triggerKm: 30000, estimatedTime: 0.5, order: 6, priority: 'HIGH' },
        { mantItemId: iLiquidoFreno.id, triggerKm: 30000, estimatedTime: 0.5, order: 7, priority: 'HIGH' },
        { mantItemId: iAceiteTransm.id, triggerKm: 30000, estimatedTime: 1.2, order: 8, priority: 'MEDIUM' },
        { mantItemId: iAjusteEmbrague.id, triggerKm: 30000, estimatedTime: 1.5, order: 9, priority: 'MEDIUM' },
      ],
    },
  ]);

  // Template: Chevrolet D-MAX Standard
  const tplDmax = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Chevrolet D-MAX Standard', description: 'Programa mantenimiento preventivo Chevrolet D-MAX',
      vehicleBrandId: chevrolet.id, vehicleLineId: dmax.id, version: '1.0', isDefault: true, isGlobal: true, tenantId: null,
    },
  });
  await createTemplatePackages(tplDmax.id, [
    {
      name: 'Mantenimiento 5,000 km', triggerKm: 5000, estimatedCost: 440000, estimatedTime: 2.5, priority: 'MEDIUM',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 5000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 5000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 5000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iRotNeumaticos.id, triggerKm: 5000, estimatedTime: 0.7, order: 4, priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Mantenimiento 10,000 km', triggerKm: 10000, estimatedCost: 540000, estimatedTime: 3.0, priority: 'MEDIUM',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 10000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 10000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 10000, estimatedTime: 0.3, order: 3, priority: 'MEDIUM' },
        { mantItemId: iAceiteTransm.id, triggerKm: 10000, estimatedTime: 1.2, order: 4, priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Mantenimiento 20,000 km', triggerKm: 20000, estimatedCost: 700000, estimatedTime: 4.0, priority: 'HIGH',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 20000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 20000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 20000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 20000, estimatedTime: 0.3, order: 4, priority: 'MEDIUM' },
        { mantItemId: iInspFreno.id, triggerKm: 20000, estimatedTime: 0.5, order: 5, priority: 'HIGH' },
        { mantItemId: iLiquidoFreno.id, triggerKm: 20000, estimatedTime: 0.5, order: 6, priority: 'HIGH' },
        { mantItemId: iAceiteTransm.id, triggerKm: 20000, estimatedTime: 1.2, order: 7, priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Mantenimiento 30,000 km', triggerKm: 30000, estimatedCost: 900000, estimatedTime: 5.0, priority: 'HIGH',
      items: [
        { mantItemId: iCambioAceite.id, triggerKm: 30000, estimatedTime: 0.5, order: 1, priority: 'MEDIUM' },
        { mantItemId: iFiltroAceite.id, triggerKm: 30000, estimatedTime: 0.3, order: 2, priority: 'MEDIUM' },
        { mantItemId: iFiltroAire.id, triggerKm: 30000, estimatedTime: 0.2, order: 3, priority: 'MEDIUM' },
        { mantItemId: iFiltroComb.id, triggerKm: 30000, estimatedTime: 0.3, order: 4, priority: 'MEDIUM' },
        { mantItemId: iAjusteValvulas.id, triggerKm: 30000, estimatedTime: 1.0, order: 5, priority: 'HIGH' },
        { mantItemId: iInspFreno.id, triggerKm: 30000, estimatedTime: 0.5, order: 6, priority: 'HIGH' },
        { mantItemId: iLiquidoFreno.id, triggerKm: 30000, estimatedTime: 0.5, order: 7, priority: 'HIGH' },
        { mantItemId: iAceiteTransm.id, triggerKm: 30000, estimatedTime: 1.2, order: 8, priority: 'MEDIUM' },
        { mantItemId: iAjusteEmbrague.id, triggerKm: 30000, estimatedTime: 1.5, order: 9, priority: 'MEDIUM' },
      ],
    },
  ]);
  console.log('   3 templates con 12 paquetes creados');

  // --- DOCUMENT TYPE CONFIGS (CO) ---
  console.log('   Creando document type configs (CO)...');
  await Promise.all([
    prisma.documentTypeConfig.create({ data: { tenantId: null, isGlobal: true, countryCode: 'CO', code: 'SOAT', name: 'SOAT', description: 'Seguro Obligatorio de Accidentes de Transito', requiresExpiry: true, isMandatory: true, expiryWarningDays: 30, expiryCriticalDays: 7, sortOrder: 1 } }),
    prisma.documentTypeConfig.create({ data: { tenantId: null, isGlobal: true, countryCode: 'CO', code: 'TECNOMECANICA', name: 'Revision Tecnico-Mecanica', requiresExpiry: true, isMandatory: true, expiryWarningDays: 45, expiryCriticalDays: 15, sortOrder: 2 } }),
    prisma.documentTypeConfig.create({ data: { tenantId: null, isGlobal: true, countryCode: 'CO', code: 'INSURANCE', name: 'Seguro / Poliza', requiresExpiry: true, isMandatory: false, expiryWarningDays: 30, expiryCriticalDays: 7, sortOrder: 3 } }),
    prisma.documentTypeConfig.create({ data: { tenantId: null, isGlobal: true, countryCode: 'CO', code: 'REGISTRATION', name: 'Tarjeta de Propiedad', requiresExpiry: false, isMandatory: true, sortOrder: 4 } }),
    prisma.documentTypeConfig.create({ data: { tenantId: null, isGlobal: true, countryCode: 'CO', code: 'OTHER', name: 'Otro', requiresExpiry: false, isMandatory: false, sortOrder: 5 } }),
  ]);
  console.log('   5 document type configs creados');

  // --- MANT ITEM VEHICLE PARTS (KB auto-sugerencia ~26 entries) ---
  console.log('   Creando MantItemVehiclePart KB (~26 entradas)...');
  const kbEntries = [
    // Cambio aceite motor -> cada marca/linea con su aceite
    { mantItemId: iCambioAceite.id, brandId: toyota.id, lineId: hilux.id, masterPartId: pShell.id, qty: 5.5 },
    { mantItemId: iCambioAceite.id, brandId: ford.id, lineId: ranger.id, masterPartId: pMobil.id, qty: 6.0 },
    { mantItemId: iCambioAceite.id, brandId: chevrolet.id, lineId: dmax.id, masterPartId: pCastrolGTX.id, qty: 5.0 },
    { mantItemId: iCambioAceite.id, brandId: mitsubishi.id, lineId: l200.id, masterPartId: pShell.id, qty: 5.0 },
    { mantItemId: iCambioAceite.id, brandId: nissan.id, lineId: frontier.id, masterPartId: pMobil.id, qty: 5.5 },
    // Cambio filtro aceite
    { mantItemId: iFiltroAceite.id, brandId: toyota.id, lineId: hilux.id, masterPartId: pBoschFiltAce.id, qty: 1 },
    { mantItemId: iFiltroAceite.id, brandId: ford.id, lineId: ranger.id, masterPartId: pMannFiltAce.id, qty: 1 },
    { mantItemId: iFiltroAceite.id, brandId: chevrolet.id, lineId: dmax.id, masterPartId: pBoschFiltAce.id, qty: 1 },
    { mantItemId: iFiltroAceite.id, brandId: mitsubishi.id, lineId: l200.id, masterPartId: pMannFiltAce.id, qty: 1 },
    { mantItemId: iFiltroAceite.id, brandId: nissan.id, lineId: frontier.id, masterPartId: pBoschFiltAce.id, qty: 1 },
    // Cambio filtro aire
    { mantItemId: iFiltroAire.id, brandId: toyota.id, lineId: hilux.id, masterPartId: pBoschFiltAire.id, qty: 1 },
    { mantItemId: iFiltroAire.id, brandId: ford.id, lineId: ranger.id, masterPartId: pMannFiltAire.id, qty: 1 },
    { mantItemId: iFiltroAire.id, brandId: chevrolet.id, lineId: dmax.id, masterPartId: pBoschFiltAire.id, qty: 1 },
    { mantItemId: iFiltroAire.id, brandId: mitsubishi.id, lineId: l200.id, masterPartId: pMannFiltAire.id, qty: 1 },
    { mantItemId: iFiltroAire.id, brandId: nissan.id, lineId: frontier.id, masterPartId: pBoschFiltAire.id, qty: 1 },
    // Cambio filtro combustible (solo 3: Toyota, Ford, Chevy)
    { mantItemId: iFiltroComb.id, brandId: toyota.id, lineId: hilux.id, masterPartId: pBoschFiltComb.id, qty: 1 },
    { mantItemId: iFiltroComb.id, brandId: ford.id, lineId: ranger.id, masterPartId: pBoschFiltComb.id, qty: 1 },
    { mantItemId: iFiltroComb.id, brandId: chevrolet.id, lineId: dmax.id, masterPartId: pBoschFiltComb.id, qty: 1 },
    // Cambio pastillas freno delanteras
    { mantItemId: iPastillasDelant.id, brandId: toyota.id, lineId: hilux.id, masterPartId: pBoschPastillas.id, qty: 1 },
    { mantItemId: iPastillasDelant.id, brandId: ford.id, lineId: ranger.id, masterPartId: pBoschPastillas.id, qty: 1 },
    { mantItemId: iPastillasDelant.id, brandId: chevrolet.id, lineId: dmax.id, masterPartId: pBoschPastillas.id, qty: 1 },
    // Cambio liquido frenos
    { mantItemId: iLiquidoFreno.id, brandId: toyota.id, lineId: hilux.id, masterPartId: pCastrolDOT4.id, qty: 2 },
    { mantItemId: iLiquidoFreno.id, brandId: ford.id, lineId: ranger.id, masterPartId: pCastrolDOT4.id, qty: 2 },
    { mantItemId: iLiquidoFreno.id, brandId: chevrolet.id, lineId: dmax.id, masterPartId: pCastrolDOT4.id, qty: 2 },
    { mantItemId: iLiquidoFreno.id, brandId: mitsubishi.id, lineId: l200.id, masterPartId: pCastrolDOT4.id, qty: 2 },
    { mantItemId: iLiquidoFreno.id, brandId: nissan.id, lineId: frontier.id, masterPartId: pCastrolDOT4.id, qty: 2 },
  ];

  await Promise.all(
    kbEntries.map((e) =>
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
      }),
    ),
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

  const tenant1 = await prisma.tenant.create({
    data: {
      id: TENANT_1_ID,
      name: 'Transportes Demo SAS',
      slug: 'transportes-demo',
      country: 'CO',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@transportesdemo.co',
    },
  });

  // Users (emails reales de Clerk para poder loguearse)
  const t1Owner = await prisma.user.create({ data: { tenantId: TENANT_1_ID, email: 'grivarol69@gmail.com', firstName: 'Guillermo', lastName: 'Rivarola', role: 'OWNER', isActive: true } });
  await prisma.user.create({ data: { tenantId: TENANT_1_ID, email: 'guillerivar69@gmail.com', firstName: 'Andres', lastName: 'Montaño', role: 'MANAGER', isActive: true } });
  await prisma.user.create({ data: { tenantId: TENANT_1_ID, email: 'grivarol1969@gmail.com', firstName: 'Brayan', lastName: 'Saavedra', role: 'MANAGER', isActive: true } });
  await prisma.user.create({ data: { tenantId: TENANT_1_ID, email: 'dyaponter@gmail.com', firstName: 'Diana', lastName: 'Aponte', role: 'DRIVER', isActive: true } });
  console.log('   4 users creados');

  // Providers
  await Promise.all([
    prisma.provider.create({ data: { tenantId: TENANT_1_ID, name: 'Repuestos Toyota', specialty: 'REPUESTOS', status: 'ACTIVE' } }),
    prisma.provider.create({ data: { tenantId: TENANT_1_ID, name: 'Lubricantes Shell', specialty: 'LUBRICANTES', status: 'ACTIVE' } }),
    prisma.provider.create({ data: { tenantId: TENANT_1_ID, name: 'Taller ABC Frenos', specialty: 'FRENOS', status: 'ACTIVE' } }),
  ]);
  console.log('   3 proveedores creados');

  // Technicians
  await Promise.all([
    prisma.technician.create({ data: { tenantId: TENANT_1_ID, name: 'Taller Central', specialty: 'GENERAL', status: 'ACTIVE', hourlyRate: 25000 } }),
    prisma.technician.create({ data: { tenantId: TENANT_1_ID, name: 'Especialista Motor', specialty: 'MOTOR', status: 'ACTIVE', hourlyRate: 35000 } }),
  ]);
  console.log('   2 tecnicos creados');

  // Drivers
  const t1Drivers = await Promise.all([
    prisma.driver.create({ data: { tenantId: TENANT_1_ID, name: 'Juan Lopez', licenseNumber: 'LIC-T1-001', status: 'ACTIVE' } }),
    prisma.driver.create({ data: { tenantId: TENANT_1_ID, name: 'Pedro Gomez', licenseNumber: 'LIC-T1-002', status: 'ACTIVE' } }),
    prisma.driver.create({ data: { tenantId: TENANT_1_ID, name: 'Maria Fernandez', licenseNumber: 'LIC-T1-003', status: 'ACTIVE' } }),
  ]);
  console.log('   3 conductores creados');

  // Vehicles
  const t1Vehicles = await Promise.all([
    prisma.vehicle.create({ data: { tenantId: TENANT_1_ID, licensePlate: 'ABC-123', brandId: toyota.id, lineId: hilux.id, typeId: type4x4.id, year: 2022, mileage: 45000, color: 'Blanco', status: 'ACTIVE', situation: 'AVAILABLE', fuelType: 'DIESEL' } }),
    prisma.vehicle.create({ data: { tenantId: TENANT_1_ID, licensePlate: 'DEF-456', brandId: ford.id, lineId: ranger.id, typeId: type4x4.id, year: 2021, mileage: 62000, color: 'Negro', status: 'ACTIVE', situation: 'IN_USE', fuelType: 'DIESEL' } }),
    prisma.vehicle.create({ data: { tenantId: TENANT_1_ID, licensePlate: 'GHI-789', brandId: chevrolet.id, lineId: dmax.id, typeId: type4x4.id, year: 2023, mileage: 18000, color: 'Rojo', status: 'ACTIVE', situation: 'AVAILABLE', fuelType: 'DIESEL' } }),
    prisma.vehicle.create({ data: { tenantId: TENANT_1_ID, licensePlate: 'JKL-012', brandId: toyota.id, lineId: landCruiser.id, typeId: typeSUV.id, year: 2020, mileage: 95000, color: 'Gris', status: 'ACTIVE', situation: 'AVAILABLE', fuelType: 'GASOLINA' } }),
  ]);
  console.log('   4 vehiculos creados');

  // Vehicle-Driver assignments
  await Promise.all([
    prisma.vehicleDriver.create({ data: { tenantId: TENANT_1_ID, vehicleId: t1Vehicles[0].id, driverId: t1Drivers[0].id, isPrimary: true, assignedBy: t1Owner.id } }),
    prisma.vehicleDriver.create({ data: { tenantId: TENANT_1_ID, vehicleId: t1Vehicles[1].id, driverId: t1Drivers[1].id, isPrimary: true, assignedBy: t1Owner.id } }),
    prisma.vehicleDriver.create({ data: { tenantId: TENANT_1_ID, vehicleId: t1Vehicles[2].id, driverId: t1Drivers[2].id, isPrimary: true, assignedBy: t1Owner.id } }),
  ]);
  console.log('   3 asignaciones vehiculo-conductor creadas');

  // Maintenance Programs (from templates)
  console.log('   Creando programas de mantenimiento...');
  // ABC-123 Hilux 45K -> all packages COMPLETED, next ~35K
  await createProgramFromTemplate(TENANT_1_ID, t1Vehicles[0].id, 'Hilux ABC-123', tplHilux.id, 'Toyota Hilux Standard', 0, 45000, t1Owner.id);
  // DEF-456 Ranger 62K -> all packages COMPLETED, next ~35K
  await createProgramFromTemplate(TENANT_1_ID, t1Vehicles[1].id, 'Ranger DEF-456', tplRanger.id, 'Ford Ranger Standard', 0, 62000, t1Owner.id);
  // GHI-789 D-MAX 18K -> 5K, 10K COMPLETED, 20K PENDING
  await createProgramFromTemplate(TENANT_1_ID, t1Vehicles[2].id, 'D-MAX GHI-789', tplDmax.id, 'Chevrolet D-MAX Standard', 0, 18000, t1Owner.id);
  // JKL-012 Land Cruiser -> no template available, skip
  console.log('   3 programas creados (JKL-012 sin template)');

  // Inventory (Tenant 1)
  console.log('   Creando inventario...');
  const t1InventoryData = [
    { masterPartId: pShell.id, quantity: 20, minStock: 5, avgCost: 45000 },
    { masterPartId: pBoschFiltAce.id, quantity: 6, minStock: 2, avgCost: 28000 },
    { masterPartId: pBoschFiltAire.id, quantity: 4, minStock: 2, avgCost: 42000 },
    { masterPartId: pBoschFiltComb.id, quantity: 3, minStock: 1, avgCost: 55000 },
    { masterPartId: pBoschPastillas.id, quantity: 4, minStock: 2, avgCost: 185000 },
    { masterPartId: pCastrolDOT4.id, quantity: 8, minStock: 2, avgCost: 22000 },
  ];
  for (const inv of t1InventoryData) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: TENANT_1_ID,
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

  console.log(`\n   Tenant 1 "${tenant1.name}" COMPLETO.\n`);

  // ========================================
  // STEP 5: TENANT 2 - HFD SA
  // ========================================
  console.log('5. TENANT 2 - HFD SA...\n');

  const tenant2 = await prisma.tenant.create({
    data: {
      id: TENANT_2_ID,
      name: 'HFD SA',
      slug: 'hfd-sa',
      country: 'CO',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@hfdsa.co',
    },
  });

  // Users (emails reales de Clerk para poder loguearse)
  const t2Owner = await prisma.user.create({ data: { tenantId: TENANT_2_ID, email: 'grivarol69@gmail.com', firstName: 'Guillermo', lastName: 'Rivarola', role: 'OWNER', isActive: true } });
  await prisma.user.create({ data: { tenantId: TENANT_2_ID, email: 'grivarol69driver@gmail.com', firstName: 'Yeison', lastName: 'Montaño', role: 'MANAGER', isActive: true } });
  await prisma.user.create({ data: { tenantId: TENANT_2_ID, email: 'grivarol1975@gmail.com', firstName: 'Josue', lastName: 'Caro', role: 'TECHNICIAN', isActive: true } });
  console.log('   3 users creados');

  // Providers
  await Promise.all([
    prisma.provider.create({ data: { tenantId: TENANT_2_ID, name: 'Autopartes del Valle', specialty: 'REPUESTOS', status: 'ACTIVE' } }),
    prisma.provider.create({ data: { tenantId: TENANT_2_ID, name: 'Llantas y Servicios', specialty: 'NEUMATICOS', status: 'ACTIVE' } }),
    prisma.provider.create({ data: { tenantId: TENANT_2_ID, name: 'Taller Frenos Rapidos', specialty: 'FRENOS', status: 'ACTIVE' } }),
  ]);
  console.log('   3 proveedores creados');

  // Technicians
  await Promise.all([
    prisma.technician.create({ data: { tenantId: TENANT_2_ID, name: 'Taller Servicios', specialty: 'ELECTRICO', status: 'ACTIVE', hourlyRate: 28000 } }),
    prisma.technician.create({ data: { tenantId: TENANT_2_ID, name: 'Mecanica Express', specialty: 'GENERAL', status: 'ACTIVE', hourlyRate: 30000 } }),
  ]);
  console.log('   2 tecnicos creados');

  // Drivers
  const t2Drivers = await Promise.all([
    prisma.driver.create({ data: { tenantId: TENANT_2_ID, name: 'Alberto Ruiz', licenseNumber: 'LIC-T2-001', status: 'ACTIVE' } }),
    prisma.driver.create({ data: { tenantId: TENANT_2_ID, name: 'Sandra Castro', licenseNumber: 'LIC-T2-002', status: 'ACTIVE' } }),
  ]);
  console.log('   2 conductores creados');

  // Vehicles
  const t2Vehicles = await Promise.all([
    prisma.vehicle.create({ data: { tenantId: TENANT_2_ID, licensePlate: 'XYZ-111', brandId: chevrolet.id, lineId: dmax.id, typeId: type4x4.id, year: 2023, mileage: 8500, color: 'Blanco', status: 'ACTIVE', situation: 'AVAILABLE', fuelType: 'DIESEL' } }),
    prisma.vehicle.create({ data: { tenantId: TENANT_2_ID, licensePlate: 'XYZ-222', brandId: mitsubishi.id, lineId: l200.id, typeId: type4x4.id, year: 2022, mileage: 35000, color: 'Rojo', status: 'ACTIVE', situation: 'IN_USE', fuelType: 'DIESEL' } }),
    prisma.vehicle.create({ data: { tenantId: TENANT_2_ID, licensePlate: 'XYZ-333', brandId: ford.id, lineId: ranger.id, typeId: type4x4.id, year: 2021, mileage: 58000, color: 'Gris', status: 'ACTIVE', situation: 'AVAILABLE', fuelType: 'DIESEL' } }),
    prisma.vehicle.create({ data: { tenantId: TENANT_2_ID, licensePlate: 'XYZ-444', brandId: toyota.id, lineId: hilux.id, typeId: type4x4.id, year: 2020, mileage: 82000, color: 'Negro', status: 'ACTIVE', situation: 'IN_USE', fuelType: 'DIESEL' } }),
  ]);
  console.log('   4 vehiculos creados');

  // Vehicle-Driver assignments
  await Promise.all([
    prisma.vehicleDriver.create({ data: { tenantId: TENANT_2_ID, vehicleId: t2Vehicles[0].id, driverId: t2Drivers[0].id, isPrimary: true, assignedBy: t2Owner.id } }),
    prisma.vehicleDriver.create({ data: { tenantId: TENANT_2_ID, vehicleId: t2Vehicles[1].id, driverId: t2Drivers[1].id, isPrimary: true, assignedBy: t2Owner.id } }),
  ]);
  console.log('   2 asignaciones vehiculo-conductor creadas');

  // Maintenance Programs
  console.log('   Creando programas de mantenimiento...');
  // XYZ-111 D-MAX 8.5K -> 5K COMPLETED, 10K PENDING
  await createProgramFromTemplate(TENANT_2_ID, t2Vehicles[0].id, 'D-MAX XYZ-111', tplDmax.id, 'Chevrolet D-MAX Standard', 0, 8500, t2Owner.id);
  // XYZ-222 L200 35K -> no template for L200, skip
  // XYZ-333 Ranger 58K -> all COMPLETED, next ~35K
  await createProgramFromTemplate(TENANT_2_ID, t2Vehicles[2].id, 'Ranger XYZ-333', tplRanger.id, 'Ford Ranger Standard', 0, 58000, t2Owner.id);
  // XYZ-444 Hilux 82K -> all COMPLETED, next ~35K
  await createProgramFromTemplate(TENANT_2_ID, t2Vehicles[3].id, 'Hilux XYZ-444', tplHilux.id, 'Toyota Hilux Standard', 0, 82000, t2Owner.id);
  console.log('   3 programas creados (XYZ-222 sin template)');

  // Inventory (Tenant 2)
  console.log('   Creando inventario...');
  const t2InventoryData = [
    { masterPartId: pCastrolGTX.id, quantity: 15, minStock: 5, avgCost: 35000 },
    { masterPartId: pMannFiltAce.id, quantity: 5, minStock: 2, avgCost: 32000 },
    { masterPartId: pMannFiltAire.id, quantity: 3, minStock: 1, avgCost: 48000 },
    { masterPartId: pBoschFiltComb.id, quantity: 2, minStock: 1, avgCost: 55000 },
    { masterPartId: pBoschPastillas.id, quantity: 3, minStock: 1, avgCost: 185000 },
    { masterPartId: pCastrolDOT4.id, quantity: 6, minStock: 2, avgCost: 22000 },
  ];
  for (const inv of t2InventoryData) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: TENANT_2_ID,
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

  console.log(`\n   Tenant 2 "${tenant2.name}" COMPLETO.\n`);

  // Suppress unused variable warnings
  void ALL_TENANT_IDS;

  // ========================================
  // SUMMARY
  // ========================================
  console.log('==============================================');
  console.log('  SEED MULTI-TENANT COMPLETADO');
  console.log('==============================================\n');

  console.log('KNOWLEDGE BASE GLOBAL (tenantId: null):');
  console.log('  - 5 Brands, 13 Lines, 5 Types');
  console.log('  - 9 Categories, 33 MantItems');
  console.log('  - 10 MasterParts');
  console.log('  - 3 Templates con 12 paquetes');
  console.log('  - 5 DocumentTypeConfigs (CO)');
  console.log(`  - ${kbEntries.length} MantItemVehiclePart (KB auto-sugerencia)`);

  console.log('\nPLATFORM TENANT:');
  console.log('  - Fleet Care Platform');
  console.log('  - SUPER_ADMIN: grivarol69@gmail.com');

  console.log('\nTENANT 1 - Transportes Demo SAS:');
  console.log('  - OWNER: grivarol69@gmail.com (Guillermo Rivarola)');
  console.log('  - MANAGER: guillerivar69@gmail.com (Andres Montaño)');
  console.log('  - MANAGER: grivarol1969@gmail.com (Brayan Saavedra)');
  console.log('  - DRIVER: dyaponter@gmail.com (Diana Aponte)');
  console.log('  - 4 vehiculos (ABC-123, DEF-456, GHI-789, JKL-012)');
  console.log('  - 3 proveedores, 2 tecnicos, 3 conductores');
  console.log('  - 3 programas mantenimiento (GHI-789 con 20K PENDING)');
  console.log(`  - ${t1InventoryData.length} items inventario`);

  console.log('\nTENANT 2 - HFD SA:');
  console.log('  - OWNER: grivarol69@gmail.com (Guillermo Rivarola)');
  console.log('  - MANAGER: grivarol69driver@gmail.com (Yeison Montaño)');
  console.log('  - TECHNICIAN: grivarol1975@gmail.com (Josue Caro)');
  console.log('  - 4 vehiculos (XYZ-111, XYZ-222, XYZ-333, XYZ-444)');
  console.log('  - 3 proveedores, 2 tecnicos, 2 conductores');
  console.log('  - 3 programas mantenimiento (XYZ-111 con 10K PENDING)');
  console.log(`  - ${t2InventoryData.length} items inventario`);

  console.log('\nAISLAMIENTO:');
  console.log('  - Tenant 1 ve ABC-*/DEF-*/GHI-*/JKL-*, NO ve XYZ-*');
  console.log('  - Tenant 2 ve XYZ-*, NO ve ABC-*/DEF-*/GHI-*/JKL-*');
  console.log('  - Ambos ven KB global (marcas, lineas, items, templates)\n');
}

main()
  .catch((e) => {
    console.error('Error durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
