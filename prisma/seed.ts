import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedTemparioAutomotriz } from './seeds/tempario-automotriz';
import { seedHino300Dutro } from './seeds/hino-300-dutro'; // ADDED
import { seedInternational7400WorkStar } from './seeds/international-7400-workstar'; // ADDED

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================
// SEED DE PRODUCCIÓN — Knowledge Base Global
// ============================================================
// Este seed crea ÚNICAMENTE los datos globales necesarios para
// que el primer usuario que haga onboarding tenga acceso a:
//   - Marcas, líneas y tipos de vehículos
//   - Categorías e ítems de mantenimiento
//   - Templates con paquetes de mantenimiento
//   - Autopartes maestras (catálogo KB)
//   - Vínculos KB (MantItemVehiclePart)
//   - Tipos de documentos por país (CO)
//   - Tenant plataforma + SUPER_ADMIN
//
// NO incluye datos de demo. Para demo usar seed-multitenancy.ts
// ============================================================

const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Helper: crea paquetes con items para un template
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

async function main() {
  console.log('==============================================');
  console.log('  SEED PRODUCCION - Fleet Care SaaS');
  console.log('  Knowledge Base Global');
  console.log('==============================================\n');

  // ============================================================
  // STEP 1: CLEANUP COMPLETO (orden FK-safe)
  // ============================================================
  console.log('1. CLEANUP - Borrando datos existentes...\n');

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
  await prisma.mantItemProcedureStep.deleteMany({});
  await prisma.mantItemProcedure.deleteMany({});
  await prisma.temparioItem.deleteMany({});
  await prisma.tempario.deleteMany({});
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

  // ============================================================
  // STEP 2: KNOWLEDGE BASE GLOBAL (tenantId: null, isGlobal: true)
  // ============================================================
  console.log('2. KNOWLEDGE BASE GLOBAL...\n');

  // ----------------------------------------------------------
  // MARCAS (7): Las más comunes en flotas colombianas
  // ----------------------------------------------------------
  console.log('   Creando marcas (7)...');
  const brands = await Promise.all([
    prisma.vehicleBrand.create({
      data: { name: 'Toyota', isGlobal: true, tenantId: null },
    }), // [0]
    prisma.vehicleBrand.create({
      data: { name: 'Ford', isGlobal: true, tenantId: null },
    }), // [1]
    prisma.vehicleBrand.create({
      data: { name: 'Chevrolet', isGlobal: true, tenantId: null },
    }), // [2]
    prisma.vehicleBrand.create({
      data: { name: 'Nissan', isGlobal: true, tenantId: null },
    }), // [3]
    prisma.vehicleBrand.create({
      data: { name: 'Mitsubishi', isGlobal: true, tenantId: null },
    }), // [4]
    prisma.vehicleBrand.create({
      data: { name: 'Renault', isGlobal: true, tenantId: null },
    }), // [5]
    prisma.vehicleBrand.create({
      data: { name: 'Dongfeng', isGlobal: true, tenantId: null },
    }), // [6]
  ]);
  const [toyota, ford, chevrolet, nissan, mitsubishi, renault, dongfeng] =
    brands;
  console.log(`   ${brands.length} marcas creadas.`);

  // ----------------------------------------------------------
  // LINEAS (17): Modelos más usados por marca
  // ----------------------------------------------------------
  console.log('   Creando lineas (17)...');
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
    ,
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
  console.log(`   ${lines.length} lineas creadas.`);

  // ----------------------------------------------------------
  // TIPOS (7)
  // ----------------------------------------------------------
  console.log('   Creando tipos de vehiculo (7)...');
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
    prisma.vehicleType.create({
      data: { name: 'Camion Liviano', isGlobal: true, tenantId: null },
    }),
    prisma.vehicleType.create({
      data: { name: 'Camion Pesado', isGlobal: true, tenantId: null },
    }),
  ]);
  console.log(`   ${types.length} tipos creados.`);

  // ----------------------------------------------------------
  // CATEGORIAS DE MANTENIMIENTO (11)
  // ----------------------------------------------------------
  console.log('   Creando categorias de mantenimiento (11)...');
  const cats = await Promise.all([
    prisma.mantCategory.create({
      data: {
        name: 'Motor',
        description: 'Sistema de motor y combustible',
        isGlobal: true,
        tenantId: null,
      },
    }), // [0]
    prisma.mantCategory.create({
      data: {
        name: 'Transmision',
        description: 'Caja de cambios y embrague',
        isGlobal: true,
        tenantId: null,
      },
    }), // [1]
    prisma.mantCategory.create({
      data: {
        name: 'Frenos',
        description: 'Sistema de frenado',
        isGlobal: true,
        tenantId: null,
      },
    }), // [2]
    prisma.mantCategory.create({
      data: {
        name: 'Suspension',
        description: 'Amortiguadores y resortes',
        isGlobal: true,
        tenantId: null,
      },
    }), // [3]
    prisma.mantCategory.create({
      data: {
        name: 'Electrico',
        description: 'Sistema electrico y bateria',
        isGlobal: true,
        tenantId: null,
      },
    }), // [4]
    prisma.mantCategory.create({
      data: {
        name: 'Lubricacion',
        description: 'Aceites y lubricantes',
        isGlobal: true,
        tenantId: null,
      },
    }), // [5]
    prisma.mantCategory.create({
      data: {
        name: 'Filtros',
        description: 'Filtros aire, aceite, combustible',
        isGlobal: true,
        tenantId: null,
      },
    }), // [6]
    prisma.mantCategory.create({
      data: {
        name: 'Neumaticos',
        description: 'Llantas y neumaticos',
        isGlobal: true,
        tenantId: null,
      },
    }), // [7]
    prisma.mantCategory.create({
      data: {
        name: 'Carroceria',
        description: 'Elementos de carroceria',
        isGlobal: true,
        tenantId: null,
      },
    }), // [8]
    prisma.mantCategory.create({
      data: {
        name: 'Direccion',
        description: 'Sistema de dirección',
        isGlobal: true,
        tenantId: null,
      },
    }), // [9]
    prisma.mantCategory.create({
      data: {
        name: 'Aire Acondicionado',
        description: 'Sistema de climatización',
        isGlobal: true,
        tenantId: null,
      },
    }), // [10]
    prisma.mantCategory.create({
      data: {
        name: 'Embrague',
        description: 'Sistema de embrague',
        isGlobal: true,
        tenantId: null,
      },
    }), // [11]
    prisma.mantCategory.create({
      data: {
        name: 'Escape',
        description: 'Sistema de escape',
        isGlobal: true,
        tenantId: null,
      },
    }), // [12]
    prisma.mantCategory.create({
      data: {
        name: 'Varios',
        description: 'Otros mantenimientos',
        isGlobal: true,
        tenantId: null,
      },
    }), // [13]
    prisma.mantCategory.create({
      data: {
        name: 'Sistema Termico EV',
        description: 'Enfriamiento de baterias EV y motor',
        isGlobal: true,
        tenantId: null,
      },
    }), // [14]
    prisma.mantCategory.create({
      data: {
        name: 'Alta Tension EV',
        description: 'Sistema Alta Tension Bateria Motores EV',
        isGlobal: true,
        tenantId: null,
      },
    }), // [15]
    prisma.mantCategory.create({
      data: {
        name: 'Refrigeracion',
        description: 'Sistema de enfriamiento de motor',
        isGlobal: true,
        tenantId: null,
      },
    }), // [16]
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
    ,
    catDireccion,
    catAireAcond,
    catEmbrague,
    catEscape,
    catVarios,
    catTermicoEV,
    catAltaTensionEV,
    catRefrigeracion,
  ] = cats;
  console.log(`   ${cats.length} categorias creadas.`);

  // ----------------------------------------------------------
  // ITEMS DE MANTENIMIENTO (33 = 17 preventivos + 16 correctivos)
  // + 5 especificos (SUV + EV) = 38 total
  // ----------------------------------------------------------
  console.log('   Creando items de mantenimiento (38)...');
  const items = await Promise.all([
    // ---- PREVENTIVOS [0-20] ----
    // Motor [0-2]
    prisma.mantItem.create({
      data: {
        name: 'Aceite motor sintetico',
        description: 'Aceite motor sintetico',
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
        type: 'SERVICE', // FIXED
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Filtros [3-5]
    prisma.mantItem.create({
      data: {
        name: 'Filtro aceite',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Filtro aire',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Filtro combustible',
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
        name: 'Liquido frenos',
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
        type: 'SERVICE', // FIXED
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
        name: 'Aceite transmision',
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
        type: 'SERVICE', // FIXED
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
        type: 'SERVICE', // FIXED
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
        name: 'Liquido direccion hidraulica',
        mantType: 'PREVENTIVE',
        categoryId: catLubricacion.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // SUV especificos preventivos [17-18]
    prisma.mantItem.create({
      data: {
        name: 'Filtro habitaculo',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Correa accesorios',
        mantType: 'PREVENTIVE',
        categoryId: catMotor.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // EV especificos preventivos [19-21]
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
        name: 'Aceite engranaje reductor EV',
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

    // ---- CORRECTIVOS [22-37] ----
    // Frenos [22-25]
    prisma.mantItem.create({
      data: {
        name: 'Pastillas freno delanteras',
        description: 'Reemplazo de pastillas desgastadas delanteras',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'SERVICE', // FIXED
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Pastillas freno',
        description: 'Pastillas de Freno',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Discos freno',
        description: 'Discos de freno',
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
    // Motor [26-28]
    prisma.mantItem.create({
      data: {
        name: 'Correa distribucion',
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
        name: 'Bomba agua',
        mantType: 'CORRECTIVE',
        categoryId: catMotor.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Suspension [29-31]
    prisma.mantItem.create({
      data: {
        name: 'Amortiguadores',
        mantType: 'CORRECTIVE',
        categoryId: catSuspension.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Rotulas',
        mantType: 'CORRECTIVE',
        categoryId: catSuspension.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Bujes suspension',
        mantType: 'CORRECTIVE',
        categoryId: catSuspension.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Electrico [32-34]
    prisma.mantItem.create({
      data: {
        name: 'Bateria',
        mantType: 'CORRECTIVE',
        categoryId: catElectrico.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Alternador',
        mantType: 'CORRECTIVE',
        categoryId: catElectrico.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Motor arranque',
        mantType: 'CORRECTIVE',
        categoryId: catElectrico.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Transmision [35-36]
    prisma.mantItem.create({
      data: {
        name: 'Kit embrague',
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
    // Neumaticos [37]
    prisma.mantItem.create({
      data: {
        name: 'Neumaticos',
        mantType: 'CORRECTIVE',
        categoryId: catNeumaticos.id,
        type: 'PART',
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);

  // Aliases legibles
  const iCambioAceite = items[0]!;
  const iAjusteValvulas = items[2]!;
  const iFiltroAceite = items[3]!;
  const iFiltroAire = items[4]!;
  const iFiltroComb = items[5]!;
  const iInspFreno = items[6]!;
  const iLiquidoFreno = items[7]!;
  const iInspAmort = items[8]!;
  const iLubRotulas = items[9]!;
  const iInspBateria = items[10]!;
  const iAceiteTransm = items[12]!;
  const iAjusteEmbrague = items[13]!;
  const iRotNeumaticos = items[14]!;
  const iBalanceo = items[15]!;
  const iLiqDireccion = items[16]!;
  const iFiltroHabitaculo = items[17]!;
  const iCorreaAccesorios = items[18]!;
  const iInspAltaTension = items[19]!;
  const iAceiteReductorEV = items[20]!;
  const iFlushRefriEV = items[21]!;
  const iPastillasDelant = items[22]!;
  const iPastillasFrenoPart = items[23]!; // ADDED alias para PART
  const iLiqFrenosCorr = items[7]!;

  // Suppress unused variable warnings
  void iInspAmort;
  void iLubRotulas;
  void iBalanceo;
  void iLiqDireccion;
  void iAjusteValvulas;
  void iLiqFrenosCorr;

  console.log(`   ${items.length} items de mantenimiento creados.`);

  // ----------------------------------------------------------
  // ITEMS DE MANTENIMIENTO — SERVICIOS (mano de obra)
  // Complementan a los PART items con la operación correspondiente.
  // type: 'SERVICE' → aparecen en el lookup de Servicios en AddItemDialog
  // ----------------------------------------------------------
  console.log('   Creando items de servicio (mano de obra)...');
  const serviceItems = await Promise.all([
    // Preventivos — Motor / Lubricacion
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite motor',
        description: 'Drenado, limpieza y llenado aceite motor',
        mantType: 'PREVENTIVE',
        categoryId: catMotor.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [0]
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aceite',
        description: 'Reemplazo filtro de aceite motor',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [1]
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro aire',
        description: 'Reemplazo filtro de aire motor',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [2]
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro combustible',
        description: 'Reemplazo filtro de combustible',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [3]
    prisma.mantItem.create({
      data: {
        name: 'Cambio liquido frenos',
        description: 'Purga y reemplazo liquido de frenos DOT4',
        mantType: 'PREVENTIVE',
        categoryId: catFrenos.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [4]
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite transmision',
        description: 'Reemplazo aceite caja de cambios',
        mantType: 'PREVENTIVE',
        categoryId: catTransmision.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [5]
    prisma.mantItem.create({
      data: {
        name: 'Cambio liquido direccion hidraulica',
        description: 'Reemplazo liquido de la dirección hidráulica',
        mantType: 'PREVENTIVE',
        categoryId: catDireccion.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [6]
    prisma.mantItem.create({
      data: {
        name: 'Cambio filtro habitaculo',
        description: 'Reemplazo filtro de habitáculo / cabina',
        mantType: 'PREVENTIVE',
        categoryId: catFiltros.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [7]
    prisma.mantItem.create({
      data: {
        name: 'Cambio correa accesorios',
        description: 'Reemplazo correa poly-V de accesorios',
        mantType: 'PREVENTIVE',
        categoryId: catMotor.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [8]
    prisma.mantItem.create({
      data: {
        name: 'Cambio aceite reductor EV',
        description: 'Reemplazo aceite engranaje reductor EV',
        mantType: 'PREVENTIVE',
        categoryId: catTransmision.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [9]
    // Correctivos
    prisma.mantItem.create({
      data: {
        name: 'Cambio pastillas freno delanteras',
        description: 'Reemplazo pastillas freno delanteras',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [10]
    prisma.mantItem.create({
      data: {
        name: 'Cambio pastillas freno traseras',
        description: 'Reemplazo pastillas freno traseras',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [11]
    prisma.mantItem.create({
      data: {
        name: 'Cambio discos freno',
        description: 'Reemplazo discos de freno desgastados',
        mantType: 'CORRECTIVE',
        categoryId: catFrenos.id,
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }), // [12]
  ]);

  const [
    iSvcCambioAceite,
    iSvcFiltroAceite,
    iSvcFiltroAire,
    iSvcFiltroComb,
    iSvcLiqFreno,
    iSvcAceiteTransm,
    iSvcLiqDireccion,
    iSvcFiltroHabitaculo,
    iSvcCorreaAcc,
    iSvcAceiteRedEV,
    iSvcPastillasDelant,
    iSvcPastillasTraseras,
    iSvcDiscosFreno,
  ] = serviceItems;

  void iSvcAceiteTransm;
  void iSvcLiqDireccion;
  void iSvcPastillasTraseras;
  void iSvcDiscosFreno;

  console.log(`   ${serviceItems.length} items de servicio creados.`);

  // ----------------------------------------------------------
  // AUTOPARTES MAESTRAS (14) — Catálogo KB con isGlobal: true
  // Códigos y referencias verificados contra catálogos oficiales
  // de fabricantes: Bosch, Shell, Mobil, Castrol, Mann+Hummel
  // ----------------------------------------------------------
  console.log('   Creando autopartes maestras (14)...');
  const parts = await Promise.all([
    // Aceites de motor [0-2]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        isGlobal: true,
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
        isGlobal: true,
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
        isGlobal: true,
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
    // Filtros de aceite [3-4]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        isGlobal: true,
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
        isGlobal: true,
        code: 'MANN-W920-21',
        description: 'Filtro Aceite MANN W920/21',
        category: 'FILTROS',
        subcategory: 'FILTRO_ACEITE',
        unit: 'UNIDAD',
        referencePrice: 32000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    // Filtros de aire [5-6]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        isGlobal: true,
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
        isGlobal: true,
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
    // Filtro combustible [7]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        isGlobal: true,
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
        isGlobal: true,
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
        isGlobal: true,
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
    // SUV/Renault especificos [10-11]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        isGlobal: true,
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
        isGlobal: true,
        code: 'RENAULT-COR-456',
        description: 'Correa de Accesorios Poly-V Renault',
        category: 'MOTOR',
        subcategory: 'KITS',
        unit: 'UNIDAD',
        referencePrice: 65000,
        lastPriceUpdate: new Date(),
        isActive: true,
      },
    }),
    // Dongfeng EV especificos [12-13]
    prisma.masterPart.create({
      data: {
        tenantId: null,
        isGlobal: true,
        code: 'DONGFENG-RED-789',
        description: 'Aceite para Engranaje Reductor EV (Dongfeng Rich 6)',
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
        isGlobal: true,
        code: 'EV-COOLANT-BC',
        description: 'Liquido Refrigerante EV Baja Conductividad',
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
  console.log(`   ${parts.length} autopartes maestras creadas.`);

  // ----------------------------------------------------------
  // TEMPLATES DE MANTENIMIENTO (5) con paquetes
  // ----------------------------------------------------------
  console.log('   Creando templates (5) con paquetes...');

  // Template 1: Toyota Hilux Standard (4 paquetes: 5K, 10K, 20K, 30K)
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
  console.log('   Template Toyota Hilux Standard (4 paquetes) creado.');

  // Template 2: Ford Ranger Standard (4 paquetes: 5K, 10K, 20K, 30K)
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
  console.log('   Template Ford Ranger Standard (4 paquetes) creado.');

  // Template 3: Chevrolet D-MAX Standard (4 paquetes: 5K, 10K, 20K, 30K)
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
  console.log('   Template Chevrolet D-MAX Standard (4 paquetes) creado.');

  // Template 4: Renault Duster 10K (3 paquetes: 10K, 20K, 60K)
  // El Duster usa intervalos de 10,000 km segun manual oficial Renault Colombia
  const tplDuster = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Renault Duster 10K',
      description: 'Programa mantenimiento 10K SUVs Compactos (Duster/Oroch)',
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
  console.log('   Template Renault Duster 10K (3 paquetes) creado.');

  // Template 5: Dongfeng Rich 6 EV (3 paquetes: 10K, 40K, 60K)
  // Segun guia de mantenimiento Dongfeng Colombia para vehiculos electricos
  const tplEvDongfeng = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Dongfeng Rich 6 EV 10K',
      description: 'Programa mantenimiento EV 10K — Dongfeng Rich 6 Electrico',
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
          mantItemId: iInspFreno.id,
          triggerKm: 10000,
          estimatedTime: 0.5,
          order: 1,
          priority: 'HIGH',
        },
        {
          mantItemId: iInspAltaTension.id,
          triggerKm: 10000,
          estimatedTime: 0.8,
          order: 2,
          priority: 'HIGH',
        },
        {
          mantItemId: iFiltroHabitaculo.id,
          triggerKm: 10000,
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
  console.log('   Template Dongfeng Rich 6 EV (3 paquetes) creado.');

  // Suppress unused template vars
  void tplHilux;
  void tplRanger;
  void tplDmax;
  void tplDuster;
  void tplEvDongfeng;

  // ----------------------------------------------------------
  // DOCUMENT TYPE CONFIGS — Colombia (CO)
  // Segun Ley 769/2002 (Codigo Nacional de Transito) y Decreto 1079/2015
  // ----------------------------------------------------------
  console.log('   Creando document type configs Colombia (5)...');
  await Promise.all([
    prisma.documentTypeConfig.create({
      data: {
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
        code: 'SOAT',
        name: 'SOAT',
        description:
          'Seguro Obligatorio de Accidentes de Transito - Obligatorio por Ley 769/2002',
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
        description:
          'Revision tecnico-mecanica y de emisiones contaminantes - Decreto 1079/2015',
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
        description: 'Poliza de seguro del vehiculo (todo riesgo o RC)',
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
        description:
          'Tarjeta de propiedad del vehiculo - documento sin vencimiento',
        requiresExpiry: false,
        isMandatory: true,
        expiryWarningDays: 0,
        expiryCriticalDays: 0,
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
        description: 'Otro tipo de documento',
        requiresExpiry: false,
        isMandatory: false,
        expiryWarningDays: 30,
        expiryCriticalDays: 7,
        sortOrder: 5,
      },
    }),
  ]);
  console.log('   5 document type configs (CO) creados.');

  // ----------------------------------------------------------
  // VINCULOS KB: MantItemVehiclePart (~30 entradas)
  // Relaciona Item de Mantenimiento + Marca/Linea -> Autoparte específica
  // Esto alimenta la sugerencia automática al crear órdenes de trabajo
  // ----------------------------------------------------------
  console.log('   Creando vinculos KB MantItemVehiclePart (~30 entradas)...');

  const kbEntries = [
    // Cambio aceite motor → aceite específico por marca
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

    // Cambio filtro aceite → filtro específico por marca
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

    // Cambio filtro combustible (Hilux, Ranger, D-MAX)
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
      mantItemId: iPastillasFrenoPart.id, // FIXED
      brandId: toyota.id,
      lineId: hilux.id,
      masterPartId: pBoschPastillas.id,
      qty: 1,
    },
    {
      mantItemId: iPastillasFrenoPart.id, // FIXED
      brandId: ford.id,
      lineId: ranger.id,
      masterPartId: pBoschPastillas.id,
      qty: 1,
    },
    {
      mantItemId: iPastillasFrenoPart.id, // FIXED
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

    // Filtro habitaculo (SUV/EV)
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
      masterPartId: pRenHabitaculo.id,
      qty: 1,
    },

    // Correa accesorios (Duster)
    {
      mantItemId: iCorreaAccesorios.id,
      brandId: renault.id,
      lineId: duster.id,
      masterPartId: pRenCorrea.id,
      qty: 1,
    },

    // Fluidos EV (Dongfeng Rich 6)
    {
      mantItemId: iAceiteReductorEV.id,
      brandId: dongfeng.id,
      lineId: rich6ev.id,
      masterPartId: pDfReductor.id,
      qty: 1,
    }
    // FIXED: Removido iFlushRefriEV porque es un SERVICE, no un PART
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
          yearTo: 2030,
          masterPartId: e.masterPartId,
          quantity: e.qty,
        },
      })
    )
  );
  console.log(`   ${kbEntries.length} vinculos KB creados.`);

  // ----------------------------------------------------------
  // VINCULOS MantItemPart: SERVICE → MasterPart
  // Cada SERVICE item declara qué autopartes requiere.
  // Esto permite sugerir repuestos al agregar un servicio a una OT.
  // ----------------------------------------------------------
  console.log('   Creando vinculos MantItemPart (servicio → autoparte)...');
  const mantItemParts = await Promise.all([
    // Cambio aceite motor → aceites (primary + alternativas)
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcCambioAceite.id,
        masterPartId: pShell.id,
        quantity: 5.5,
        isRequired: true,
        isPrimary: true,
        notes: 'Shell Helix HX7 10W-40',
      },
    }),
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcCambioAceite.id,
        masterPartId: pMobil.id,
        quantity: 5.5,
        isRequired: false,
        isPrimary: false,
        notes: 'Alternativa: Mobil Super 3000 5W-40',
      },
    }),
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcCambioAceite.id,
        masterPartId: pCastrolGTX.id,
        quantity: 5.5,
        isRequired: false,
        isPrimary: false,
        notes: 'Alternativa: Castrol GTX 15W-40',
      },
    }),
    // Cambio filtro aceite
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcFiltroAceite.id,
        masterPartId: pBoschFiltAce.id,
        quantity: 1,
        isRequired: true,
        isPrimary: true,
      },
    }),
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcFiltroAceite.id,
        masterPartId: pMannFiltAce.id,
        quantity: 1,
        isRequired: false,
        isPrimary: false,
        notes: 'Alternativa: MANN W920/21',
      },
    }),
    // Cambio filtro aire
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcFiltroAire.id,
        masterPartId: pBoschFiltAire.id,
        quantity: 1,
        isRequired: true,
        isPrimary: true,
      },
    }),
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcFiltroAire.id,
        masterPartId: pMannFiltAire.id,
        quantity: 1,
        isRequired: false,
        isPrimary: false,
        notes: 'Alternativa: MANN C25114',
      },
    }),
    // Cambio filtro combustible
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcFiltroComb.id,
        masterPartId: pBoschFiltComb.id,
        quantity: 1,
        isRequired: true,
        isPrimary: true,
      },
    }),
    // Cambio liquido frenos
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcLiqFreno.id,
        masterPartId: pCastrolDOT4.id,
        quantity: 2,
        isRequired: true,
        isPrimary: true,
      },
    }),
    // Cambio filtro habitaculo
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcFiltroHabitaculo.id,
        masterPartId: pRenHabitaculo.id,
        quantity: 1,
        isRequired: true,
        isPrimary: true,
      },
    }),
    // Cambio correa accesorios
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcCorreaAcc.id,
        masterPartId: pRenCorrea.id,
        quantity: 1,
        isRequired: true,
        isPrimary: true,
      },
    }),
    // Cambio aceite reductor EV
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcAceiteRedEV.id,
        masterPartId: pDfReductor.id,
        quantity: 1,
        isRequired: true,
        isPrimary: true,
      },
    }),
    // Cambio pastillas freno delanteras
    prisma.mantItemPart.create({
      data: {
        mantItemId: iSvcPastillasDelant.id,
        masterPartId: pBoschPastillas.id,
        quantity: 1,
        isRequired: true,
        isPrimary: true,
      },
    }),
  ]);
  console.log(`   ${mantItemParts.length} vinculos MantItemPart creados.`);

  // ----------------------------------------------------------
  // TEMPARIO AUTOMOTRIZ (Catálogo de tiempos)
  // ----------------------------------------------------------
  console.log('   Iniciando carga de Tempario Automotriz...');
  const { tempario, temparioItemsMap } = await seedTemparioAutomotriz(prisma);
  console.log(`   Tempario "${tempario.name}" cargado con éxito.`);

  // ----------------------------------------------------------
  // PROCEDIMIENTOS KB (MantItemProcedure)
  // Vincula MantItems con pasos del Tempario
  // ----------------------------------------------------------
  console.log('   Creando procedimientos KB (MantItemProcedure)...');

  // Procedimiento: Cambio de Aceite y Filtro
  const procAceite = await prisma.mantItemProcedure.create({
    data: {
      mantItemId: iCambioAceite.id,
      isGlobal: true,
      tenantId: null,
    },
  });
  await prisma.mantItemProcedureStep.createMany({
    data: [
      {
        procedureId: procAceite.id,
        temparioItemId: temparioItemsMap['M001']!,
        order: 1,
        standardHours: 0.5,
      },
      {
        procedureId: procAceite.id,
        temparioItemId: temparioItemsMap['M002']!,
        order: 2,
        standardHours: 0.25,
      },
    ],
  });

  // Procedimiento: Inspección y Cambio de Pastillas
  const procPastillas = await prisma.mantItemProcedure.create({
    data: {
      mantItemId: iPastillasDelant.id,
      isGlobal: true,
      tenantId: null,
    },
  });
  await prisma.mantItemProcedureStep.createMany({
    data: [
      {
        procedureId: procPastillas.id,
        temparioItemId: temparioItemsMap['F019']!,
        order: 1,
        standardHours: 1.0,
      }, // Diagnóstico
      {
        procedureId: procPastillas.id,
        temparioItemId: temparioItemsMap['F001']!,
        order: 2,
        standardHours: 0.8,
      }, // Cambio pastillas adelante
    ],
  });

  console.log('   Procedimientos KB creados.\n');

  // ============================================================
  // STEP 3: PLATFORM TENANT + SUPER_ADMIN
  // ============================================================
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

  // ============================================================
  // RESUMEN FINAL
  // ============================================================
  console.log('============================================================');
  console.log('  SEED PRODUCCION COMPLETADO');
  await seedHino300Dutro(prisma); // ADDED
  await seedInternational7400WorkStar(prisma); // ADDED

  console.log('============================================================\n');
  console.log('KB GLOBAL (tenantId: null, isGlobal: true):');
  console.log(`  Marcas: ${brands.length + 2}`); // FIXED
  console.log(`  Lineas: ${lines.length + 2}`); // FIXED
  console.log(`  Tipos: ${types.length}`);
  console.log(`  Categorias: ${cats.length}`);
  console.log(
    `  Items mantenimiento: ${items.length} (22 preventivos + 16 correctivos)`
  );
  console.log(
    `  Items servicio (MO): ${serviceItems.length} (10 preventivos + 3 correctivos)`
  );
  console.log(`  Autopartes maestras: ${parts.length}`);
  console.log(
    `  Templates: 7 (Hilux x4, Ranger x4, D-MAX x4, Duster x3, Dongfeng EV x3, Hino 300, Intl 7400)` // FIXED
  );
  console.log(`  Vinculos KB (MantItemVehiclePart): ${kbEntries.length}`);
  console.log(`  Document Type Configs (CO): 5`);
  console.log('');
  console.log('PLATAFORMA:');
  console.log(`  Tenant: ${platformTenant.name} (${PLATFORM_TENANT_ID})`);
  console.log(`  SUPER_ADMIN: ${superAdmin.email}`);
  console.log('');
  console.log('IMPORTANTE: Este es un seed de PRODUCCION.');
  console.log('Para datos demo, usar: pnpm seed:multitenancy');
  console.log('============================================================\n');
}

main()
  .catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
