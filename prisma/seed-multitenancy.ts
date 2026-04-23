import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedGlobalKB } from './seed';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ========================================
// IDs - Usar el ID de Clerk para demo
// ========================================
const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_TENANT_ID =
  process.env.DEMO_TENANT_ID || 'org_3AuH8sVTPmnCYuzEyqPkFlrSVrw'; // Tu org de Clerk
const TENANT_2_ID = 'org_demo_tenant_2_hfd_sa';
const ALL_TENANT_IDS = [PLATFORM_TENANT_ID, DEMO_TENANT_ID, TENANT_2_ID];

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
  // ========================================
  // HELPERS FOR REALISTIC DATA
  // ========================================
  const now = new Date();
  const getRelativeDate = (monthOffset: number, day: number = 15) => {
    return new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
  };

  console.log('==============================================');
  console.log('  SEED MULTI-TENANT - Fleet Care SaaS');
  console.log('==============================================\n');

  // ========================================
  // STEP 1: CLEANUP
  // ========================================
  console.log('1. CLEANUP - Borrando datos existentes...\n');
  await prisma.auditLog.deleteMany({});
  await prisma.watchdogConfiguration.deleteMany({});
  await prisma.financialAlert.deleteMany({});
  await prisma.maintenanceAlert.deleteMany({});
  await prisma.expenseAuditLog.deleteMany({});
  await prisma.workOrderApproval.deleteMany({});
  await prisma.workOrderExpense.deleteMany({});
  await prisma.workOrderItem.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.internalWorkTicket.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.vehicleProgramItem.deleteMany({});
  await prisma.vehicleProgramPackage.deleteMany({});
  await prisma.vehicleMantProgram.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.dailyChecklist.deleteMany({});
  await prisma.checklistTemplateItem.deleteMany({});
  await prisma.checklistTemplate.deleteMany({});
  await prisma.vehicleDriver.deleteMany({});
  await prisma.odometerLog.deleteMany({});
  await prisma.fuelVoucher.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.technician.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.partPriceHistory.deleteMany({});
  await prisma.provider.deleteMany({});
  await prisma.mantItemRequest.deleteMany({});
  await prisma.mantItemVehiclePart.deleteMany({});
  await prisma.mantItemProcedure.deleteMany({});
  await prisma.packageItem.deleteMany({});
  await prisma.maintenancePackage.deleteMany({});
  await prisma.maintenanceTemplate.deleteMany({});
  await prisma.mantItemProcedureStep.deleteMany({});
  await prisma.mantItem.deleteMany({});
  await prisma.mantCategory.deleteMany({});
  await prisma.temparioItem.deleteMany({});
  await prisma.tempario.deleteMany({});
  await prisma.partCompatibility.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
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
  // STEP 2: GLOBAL KNOWLEDGE BASE (delegado a seedGlobalKB)
  // ========================================
  console.log('2. KNOWLEDGE BASE GLOBAL...');
  await seedGlobalKB(prisma);
  console.log('   Knowledge Base Global COMPLETA.\n');

  // ========================================
  // RE-LOOKUP: Variables KB necesarias en secciones tenant
  // ========================================
  const toyota = await prisma.vehicleBrand.findFirstOrThrow({
    where: { name: 'Toyota', isGlobal: true },
  });
  const ford = await prisma.vehicleBrand.findFirstOrThrow({
    where: { name: 'Ford', isGlobal: true },
  });
  const chevrolet = await prisma.vehicleBrand.findFirstOrThrow({
    where: { name: 'Chevrolet', isGlobal: true },
  });
  const nissan = await prisma.vehicleBrand.findFirstOrThrow({
    where: { name: 'Nissan', isGlobal: true },
  });
  const mitsubishi = await prisma.vehicleBrand.findFirstOrThrow({
    where: { name: 'Mitsubishi', isGlobal: true },
  });
  void nissan;
  const hilux = await prisma.vehicleLine.findFirstOrThrow({
    where: { name: 'Hilux', isGlobal: true },
  });
  const landCruiser = await prisma.vehicleLine.findFirstOrThrow({
    where: { name: 'Land Cruiser', isGlobal: true },
  });
  const ranger = await prisma.vehicleLine.findFirstOrThrow({
    where: { name: 'Ranger', isGlobal: true },
  });
  const dmax = await prisma.vehicleLine.findFirstOrThrow({
    where: { name: 'D-MAX', isGlobal: true },
  });
  const l200 = await prisma.vehicleLine.findFirstOrThrow({
    where: { name: 'L200', isGlobal: true },
  });
  const type4x4 = await prisma.vehicleType.findFirstOrThrow({
    where: { name: 'Camioneta 4x4', isGlobal: true },
  });
  const typeSUV = await prisma.vehicleType.findFirstOrThrow({
    where: { name: 'SUV', isGlobal: true },
  });
  const tplHilux = await prisma.maintenanceTemplate.findFirstOrThrow({
    where: { name: 'Toyota Hilux Standard', isGlobal: true },
  });
  const tplRanger = await prisma.maintenanceTemplate.findFirstOrThrow({
    where: { name: 'Ford Ranger Standard', isGlobal: true },
  });
  const tplDmax = await prisma.maintenanceTemplate.findFirstOrThrow({
    where: { name: 'Chevrolet D-MAX Standard', isGlobal: true },
  });
  const pShell = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'SHELL-HELIX-HX7-10W40', isGlobal: true },
  });
  const pCastrolGTX = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'CASTROL-GTX-15W40', isGlobal: true },
  });
  const pBoschFiltAce = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'BOSCH-0986AF0134', isGlobal: true },
  });
  const pMannFiltAce = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'MANN-W920-21', isGlobal: true },
  });
  const pBoschFiltAire = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'BOSCH-F026400364', isGlobal: true },
  });
  const pMannFiltAire = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'MANN-C25114', isGlobal: true },
  });
  const pBoschFiltComb = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'BOSCH-F026402065', isGlobal: true },
  });
  const pBoschPastillas = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'BOSCH-0986AB1234', isGlobal: true },
  });
  const pCastrolDOT4 = await prisma.masterPart.findFirstOrThrow({
    where: { code: 'CASTROL-DOT4-500ML', isGlobal: true },
  });
  const iSvcCambioAceite = await prisma.mantItem.findFirstOrThrow({
    where: { name: 'Cambio aceite motor', isGlobal: true },
  });
  const iSvcPastillasDelant = await prisma.mantItem.findFirstOrThrow({
    where: { name: 'Cambio pastillas freno delanteras', isGlobal: true },
  });
  const docTypeSOAT = await prisma.documentTypeConfig.findFirstOrThrow({
    where: { code: 'SOAT', isGlobal: true },
  });
  const docTypeTecno = await prisma.documentTypeConfig.findFirstOrThrow({
    where: { code: 'TECNOMECANICA', isGlobal: true },
  });
  const docTypeInsurance = await prisma.documentTypeConfig.findFirstOrThrow({
    where: { code: 'INSURANCE', isGlobal: true },
  });
  const docTypeRegistration = await prisma.documentTypeConfig.findFirstOrThrow({
    where: { code: 'REGISTRATION', isGlobal: true },
  });

  // ========================================
  // STEP 2b: GLOBAL CHECKLIST TEMPLATES
  // ========================================
  console.log('2b. CHECKLIST TEMPLATES GLOBALES...\n');

  const tplChecklist4x4 = await prisma.checklistTemplate.create({
    data: {
      tenantId: null,
      isGlobal: true,
      name: 'Inspección Diaria Camioneta 4x4',
      vehicleTypeId: type4x4.id,
      countryCode: null,
      isActive: true,
      items: {
        create: [
          {
            category: 'Luces',
            label: 'Luces delanteras (altas y bajas)',
            isRequired: true,
            order: 1,
          },
          {
            category: 'Luces',
            label: 'Luces traseras y stop',
            isRequired: true,
            order: 2,
          },
          {
            category: 'Luces',
            label: 'Luces de reversa y direccionales',
            isRequired: true,
            order: 3,
          },
          {
            category: 'Frenos',
            label: 'Freno de servicio',
            isRequired: true,
            order: 4,
          },
          {
            category: 'Frenos',
            label: 'Freno de parqueo',
            isRequired: true,
            order: 5,
          },
          {
            category: 'Llantas',
            label: 'Presión y estado de llantas delanteras',
            isRequired: true,
            order: 6,
          },
          {
            category: 'Llantas',
            label: 'Presión y estado de llantas traseras',
            isRequired: true,
            order: 7,
          },
          {
            category: 'Llantas',
            label: 'Llanta de repuesto',
            isRequired: false,
            order: 8,
          },
          {
            category: 'Motor',
            label: 'Nivel de aceite motor',
            isRequired: true,
            order: 9,
          },
          {
            category: 'Motor',
            label: 'Nivel de refrigerante',
            isRequired: true,
            order: 10,
          },
          {
            category: 'Motor',
            label: 'Sin fugas visibles (aceite, refrigerante, combustible)',
            isRequired: true,
            order: 11,
          },
          {
            category: 'Seguridad',
            label: 'Cinturón de seguridad conductor',
            isRequired: true,
            order: 12,
          },
          {
            category: 'Seguridad',
            label: 'Extintor vigente y accesible',
            isRequired: true,
            order: 13,
          },
          {
            category: 'Seguridad',
            label: 'Botiquín de primeros auxilios',
            isRequired: false,
            order: 14,
          },
          {
            category: 'Documentos',
            label: 'SOAT vigente',
            isRequired: true,
            order: 15,
          },
          {
            category: 'Documentos',
            label: 'Revisión técnico-mecánica vigente',
            isRequired: true,
            order: 16,
          },
          {
            category: 'Documentos',
            label: 'Tarjeta de propiedad / licencia de tránsito',
            isRequired: true,
            order: 17,
          },
          {
            category: 'Carrocería',
            label: 'Espejos laterales y retrovisor en buen estado',
            isRequired: true,
            order: 18,
          },
          {
            category: 'Carrocería',
            label: 'Limpiaparabrisas funcional',
            isRequired: false,
            order: 19,
          },
          {
            category: 'Carga',
            label: 'Carga asegurada correctamente',
            isRequired: false,
            order: 20,
          },
        ],
      },
    },
  });
  void tplChecklist4x4;
  console.log(
    '   1 ChecklistTemplate global creado (Camioneta 4x4, 20 ítems)\n'
  );

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
  const ownerEmail = process.env.DEMO_OWNER_EMAIL || 'guillerivar69@gmail.com';
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
        licensePlate: 'FIN-001',
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
        licensePlate: 'FIN-002',
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
        licensePlate: 'FIN-003',
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
        licensePlate: 'FIN-004',
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
    prisma.vehicle.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        licensePlate: 'FIN-005',
        brandId: toyota.id,
        lineId: hilux.id,
        typeId: type4x4.id,
        year: 2023,
        mileage: 12000,
        color: 'Azul',
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        fuelType: 'DIESEL',
      },
    }),
  ]);
  console.log('   5 vehiculos creados (FIN-001 a FIN-005)');

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

  // DRIVER user para pruebas PWA (grivarol1975@gmail.com)
  const pwaDriverEmail = 'grivarol1975@gmail.com';
  await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: DEMO_TENANT_ID, email: pwaDriverEmail },
    },
    update: { role: 'DRIVER', isActive: true },
    create: {
      tenantId: DEMO_TENANT_ID,
      email: pwaDriverEmail,
      firstName: 'Guillermo',
      lastName: 'Rivarola',
      role: 'DRIVER',
      isActive: true,
    },
  });

  // Driver profile vinculado por email (userId se asigna via webhook al primer login)
  const pwaDriver = await prisma.driver.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      name: 'Guillermo Rivarola',
      email: pwaDriverEmail,
      licenseNumber: 'LIC-PWA-001',
      status: 'ACTIVE',
    },
  });

  // Asignar FIN-001 (Toyota Hilux) al driver PWA
  await prisma.vehicleDriver.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      vehicleId: t1Vehicles[0].id,
      driverId: pwaDriver.id,
      isPrimary: false,
      assignedBy: t1Owner.id,
      status: 'ACTIVE',
    },
  });
  console.log('   1 DRIVER PWA + asignación FIN-001 creada');

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

  // ========================================
  // DOCUMENTOS - Tenant 1 (variedad de estados)
  // FIN-001: todo vigente
  // FIN-002: SOAT por vencer (20 días), seguro vencido
  // FIN-003: SOAT vencido, Tecno por vencer (10 días = CRITICAL)
  // FIN-004: todo vigente, sin seguro
  // FIN-005: todo vigente
  // ========================================
  console.log('   Creando documentos de vehículos...');

  const daysMs = (d: number) => d * 24 * 60 * 60 * 1000;
  const futureDate = (days: number) => new Date(Date.now() + daysMs(days));
  const pastDate = (days: number) => new Date(Date.now() - daysMs(days));

  await Promise.all([
    // FIN-001: todo vigente
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[0].id,
        documentTypeId: docTypeSOAT.id,
        fileName: 'soat-fin001-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-soat-fin001.pdf',
        documentNumber: 'SOAT-2024-001001',
        entity: 'SURA',
        expiryDate: futureDate(240),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[0].id,
        documentTypeId: docTypeTecno.id,
        fileName: 'tecno-fin001-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-tecno-fin001.pdf',
        documentNumber: 'TECNO-2024-001001',
        entity: 'CDA Movilidad',
        expiryDate: futureDate(365),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[0].id,
        documentTypeId: docTypeInsurance.id,
        fileName: 'seguro-fin001-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-insurance-fin001.pdf',
        documentNumber: 'POL-2024-001',
        entity: 'Seguros Bolivar',
        expiryDate: futureDate(180),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[0].id,
        documentTypeId: docTypeRegistration.id,
        fileName: 'tarjeta-propiedad-fin001.pdf',
        fileUrl: 'https://utfs.io/f/demo-reg-fin001.pdf',
        documentNumber: 'REG-001-ABC',
        entity: 'RUNT',
      },
    }),

    // FIN-002: SOAT por vencer (20 días = WARNING), seguro vencido (-30 días = EXPIRED)
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[1].id,
        documentTypeId: docTypeSOAT.id,
        fileName: 'soat-fin002-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-soat-fin002.pdf',
        documentNumber: 'SOAT-2024-002001',
        entity: 'Equidad Seguros',
        expiryDate: futureDate(20),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[1].id,
        documentTypeId: docTypeTecno.id,
        fileName: 'tecno-fin002-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-tecno-fin002.pdf',
        documentNumber: 'TECNO-2024-002001',
        entity: 'CDA Centro',
        expiryDate: futureDate(120),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[1].id,
        documentTypeId: docTypeInsurance.id,
        fileName: 'seguro-fin002-2023.pdf',
        fileUrl: 'https://utfs.io/f/demo-insurance-fin002.pdf',
        documentNumber: 'POL-2023-002',
        entity: 'AXA Seguros',
        expiryDate: pastDate(30),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[1].id,
        documentTypeId: docTypeRegistration.id,
        fileName: 'tarjeta-propiedad-fin002.pdf',
        fileUrl: 'https://utfs.io/f/demo-reg-fin002.pdf',
        documentNumber: 'REG-002-DEF',
        entity: 'RUNT',
      },
    }),

    // FIN-003: SOAT vencido (-15 días), Tecno por vencer crítico (10 días < 15 días critical)
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[2].id,
        documentTypeId: docTypeSOAT.id,
        fileName: 'soat-fin003-2023.pdf',
        fileUrl: 'https://utfs.io/f/demo-soat-fin003.pdf',
        documentNumber: 'SOAT-2023-003001',
        entity: 'Mapfre',
        expiryDate: pastDate(15),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[2].id,
        documentTypeId: docTypeTecno.id,
        fileName: 'tecno-fin003-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-tecno-fin003.pdf',
        documentNumber: 'TECNO-2024-003001',
        entity: 'CDA Sur',
        expiryDate: futureDate(10),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[2].id,
        documentTypeId: docTypeInsurance.id,
        fileName: 'seguro-fin003-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-insurance-fin003.pdf',
        documentNumber: 'POL-2024-003',
        entity: 'Generali',
        expiryDate: futureDate(200),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[2].id,
        documentTypeId: docTypeRegistration.id,
        fileName: 'tarjeta-propiedad-fin003.pdf',
        fileUrl: 'https://utfs.io/f/demo-reg-fin003.pdf',
        documentNumber: 'REG-003-GHI',
        entity: 'RUNT',
      },
    }),

    // FIN-004: todo vigente, sin seguro (no se crea Insurance doc)
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[3].id,
        documentTypeId: docTypeSOAT.id,
        fileName: 'soat-fin004-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-soat-fin004.pdf',
        documentNumber: 'SOAT-2024-004001',
        entity: 'Allianz',
        expiryDate: futureDate(120),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[3].id,
        documentTypeId: docTypeTecno.id,
        fileName: 'tecno-fin004-2024.pdf',
        fileUrl: 'https://utfs.io/f/demo-tecno-fin004.pdf',
        documentNumber: 'TECNO-2024-004001',
        entity: 'CDA Norte',
        expiryDate: futureDate(180),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[3].id,
        documentTypeId: docTypeRegistration.id,
        fileName: 'tarjeta-propiedad-fin004.pdf',
        fileUrl: 'https://utfs.io/f/demo-reg-fin004.pdf',
        documentNumber: 'REG-004-JKL',
        entity: 'RUNT',
      },
    }),

    // FIN-005: todo vigente (nuevo)
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[4].id,
        documentTypeId: docTypeSOAT.id,
        fileName: 'soat-fin005-2025.pdf',
        fileUrl: 'https://utfs.io/f/demo-soat-fin005.pdf',
        documentNumber: 'SOAT-2025-005001',
        entity: 'SURA',
        expiryDate: futureDate(330),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[4].id,
        documentTypeId: docTypeTecno.id,
        fileName: 'tecno-fin005-2025.pdf',
        fileUrl: 'https://utfs.io/f/demo-tecno-fin005.pdf',
        documentNumber: 'TECNO-2025-005001',
        entity: 'CDA Movilidad',
        expiryDate: futureDate(730),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[4].id,
        documentTypeId: docTypeInsurance.id,
        fileName: 'seguro-fin005-2025.pdf',
        fileUrl: 'https://utfs.io/f/demo-insurance-fin005.pdf',
        documentNumber: 'POL-2025-005',
        entity: 'Seguros Bolivar',
        expiryDate: futureDate(365),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        vehicleId: t1Vehicles[4].id,
        documentTypeId: docTypeRegistration.id,
        fileName: 'tarjeta-propiedad-fin005.pdf',
        fileUrl: 'https://utfs.io/f/demo-reg-fin005.pdf',
        documentNumber: 'REG-005-MNO',
        entity: 'RUNT',
      },
    }),
  ]);
  console.log(
    '   19 documentos creados (SOAT/Tecno/Seguro/Tarjeta × 5 vehículos)'
  );

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

  // ========================================
  // WORK ORDERS & INVOICES - Tenant 1 (Historical Data 12 Months)
  // ========================================
  console.log('   Enriqueciendo historial financiero (12 meses)...');

  // Categorías de interés para el Dashboard
  // Categorías de interés para el Dashboard
  const t1CatMotor =
    t1MantItems.find(i => i.name.includes('aceite motor'))?.id || '';
  const t1CatFiltros =
    t1MantItems.find(i => i.name.includes('filtro aceite'))?.id || '';
  const t1CatFrenos =
    t1MantItems.find(i => i.name.includes('pastillas freno'))?.id || '';
  const t1CatLlantas =
    t1MantItems.find(i => i.name.includes('neumaticos'))?.id || '';
  const t1CatSuspension =
    t1MantItems.find(i => i.name.includes('amortiguadores'))?.id || '';

  const categories = [
    { name: 'Motor', itemId: t1CatMotor, basePrice: 450000 },
    { name: 'Filtros', itemId: t1CatFiltros, basePrice: 120000 },
    { name: 'Frenos', itemId: t1CatFrenos, basePrice: 350000 },
    { name: 'Llantas', itemId: t1CatLlantas, basePrice: 850000 },
    { name: 'Suspension', itemId: t1CatSuspension, basePrice: 600000 },
  ];

  if (owner && repuestosToyota && lubricantesShell) {
    for (let m = 0; m <= 12; m++) {
      const monthDate = getRelativeDate(m);
      const isCurrentMonth = m === 0;

      // 2-3 OTs por mes
      const numWOs = isCurrentMonth ? 5 : 2;

      for (let i = 0; i < numWOs; i++) {
        const vehicle = t1Vehicles[i % t1Vehicles.length];
        const category = categories[i % categories.length];
        const isPreventive = i % 2 === 0;

        const wo = await prisma.workOrder.create({
          data: {
            tenant: { connect: { id: DEMO_TENANT_ID } },
            vehicle: { connect: { id: vehicle.id } },
            title: `${isPreventive ? 'Mantenimiento Preventivo' : 'Reparación'} - ${category.name}`,
            description: `Servicio mensual de ${category.name.toLowerCase()}`,
            mantType: (isPreventive ? 'PREVENTIVE' : 'CORRECTIVE') as
              | 'PREVENTIVE'
              | 'CORRECTIVE',
            priority: 'MEDIUM' as 'MEDIUM',
            status: 'COMPLETED' as 'COMPLETED',
            workType: 'EXTERNAL' as 'EXTERNAL',
            provider: (i % 2 === 0 ? lubricantesShell : repuestosToyota)
              ? {
                  connect: {
                    id:
                      i % 2 === 0 ? lubricantesShell?.id : repuestosToyota?.id,
                  },
                }
              : undefined,
            creationMileage: vehicle.mileage - m * 2000 - i * 100,
            requestedBy: owner.id,
            authorizedBy: owner.id,
            actualCost: category.basePrice * (1 + Math.random() * 0.2),
            startDate: monthDate,
            endDate: monthDate,
            completionMileage: vehicle.mileage - m * 2000 - i * 100,
          },
        });

        // Crear Ítem de OT vinculado
        const woItem = await prisma.workOrderItem.create({
          data: {
            workOrder: { connect: { id: wo.id } },
            mantItem: { connect: { id: category.itemId as string } },
            tenant: { connect: { id: DEMO_TENANT_ID } },
            description: `Servicio de ${category.name}`,
            unitPrice: Number(wo.actualCost),
            quantity: 1,
            totalCost: Number(wo.actualCost),
            itemSource: 'EXTERNAL' as 'EXTERNAL',
            status: 'COMPLETED' as 'COMPLETED',
            purchasedBy: owner.id,
            supplier: i % 2 === 0 ? 'Lubricantes Shell' : 'Repuestos Toyota',
          },
        });

        // Crear Factura VINCULADA
        const subtotal = Number(wo.actualCost);
        const tax = subtotal * 0.19;
        const total = subtotal + tax;

        const inv = await prisma.invoice.create({
          data: {
            tenant: { connect: { id: DEMO_TENANT_ID } },
            workOrder: { connect: { id: wo.id } },
            invoiceNumber: `FAC-${2026 - m}-${monthDate.getMonth() + 1}-${i}`,
            invoiceDate: monthDate,
            dueDate: monthDate,
            supplier: { connect: { id: wo.providerId! } },
            subtotal,
            taxAmount: tax,
            totalAmount: total,
            status: isCurrentMonth && i === 0 ? 'APPROVED' : 'PAID', // Una por aprobar en el mes actual
            approver: { connect: { id: owner.id } },
            registrar: { connect: { id: owner.id } },
          },
        });

        // Crear Item de Factura VINCULADO a Item de OT
        await prisma.invoiceItem.create({
          data: {
            invoice: { connect: { id: inv.id } },
            workOrderItem: { connect: { id: woItem.id } }, // Vínculo CRÍTICO para el dashboard
            tenant: { connect: { id: DEMO_TENANT_ID } },
            description: woItem.description,
            quantity: 1,
            unitPrice: subtotal,
            subtotal: subtotal,
            taxRate: 19,
            taxAmount: tax,
            total: total,
          },
        });
      }
    }
    console.log('   Historial financiero de 12 meses generado con éxito.');
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
    // Alert para FIN-001 (próximo mantenimiento)
    const fin001 = t1VehiclesWithProgram.find(
      v => v.licensePlate === 'FIN-001'
    );
    if (fin001 && fin001.vehicleMantProgram) {
      const nextPkg = fin001.vehicleMantProgram.packages.find(
        p => p.status === 'PENDING'
      );
      if (nextPkg && nextPkg.items.length > 0) {
        const nextItem = nextPkg.items[0];
        await prisma.maintenanceAlert.create({
          data: {
            tenantId: DEMO_TENANT_ID,
            vehicleId: fin001.id,
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

    // Alert para FIN-002 (crítico - próximo)
    const fin002 = t1VehiclesWithProgram.find(
      v => v.licensePlate === 'FIN-002'
    );
    if (fin002 && fin002.vehicleMantProgram) {
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          vehicleId: fin002.id,
          programItemId:
            fin002.vehicleMantProgram.packages[0]?.items[0]?.id || '',
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

    // Alert para FIN-003 (pendiente)
    const fin003 = t1VehiclesWithProgram.find(
      v => v.licensePlate === 'FIN-003'
    );
    if (fin003 && fin003.vehicleMantProgram) {
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          vehicleId: fin003.id,
          programItemId:
            fin003.vehicleMantProgram.packages[0]?.items[0]?.id || '',
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

  // Crear alertas financieras representativas para el demo
  const recentInvoice = await prisma.invoice.findFirst({
    where: { tenantId: DEMO_TENANT_ID, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
  });

  await Promise.all([
    prisma.financialAlert.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        invoiceId: recentInvoice?.id,
        masterPartId: pShell.id,
        type: 'PRICE_DEVIATION',
        severity: 'HIGH',
        status: 'PENDING',
        message:
          'Desviación del 32.5% en compra de Aceite Shell Helix HX7 10W-40. Referencia: $42.000, Compra: $55.650',
        details: { expected: 42000, actual: 55650, deviation: '32.5' },
      },
    }),
    prisma.financialAlert.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        type: 'BUDGET_OVERRUN',
        severity: 'CRITICAL',
        status: 'PENDING',
        message:
          'Gasto mensual supera el presupuesto en $1.250.000 (FIN-004 acumula $2.8M este mes)',
        details: { budget: 1500000, actual: 2750000, overrun: 1250000 },
      },
    }),
  ]);
  console.log('   2 Financial Alerts creados');

  // ========================================
  // WATCHDOG CONFIGURATION - Tenant 1
  // ========================================
  console.log('   Creando WatchdogConfiguration Tenant 1...');

  await prisma.watchdogConfiguration.createMany({
    data: [
      // Umbral global (aplica a todas las categorías sin config específica)
      {
        tenantId: DEMO_TENANT_ID,
        category: null,
        threshold: 15,
        isActive: true,
      },
      // Lubricantes: más tolerancia (precios volátiles)
      {
        tenantId: DEMO_TENANT_ID,
        category: 'LUBRICANTES',
        threshold: 20,
        isActive: true,
      },
      // Repuestos: estricto
      {
        tenantId: DEMO_TENANT_ID,
        category: 'REPUESTOS',
        threshold: 10,
        isActive: true,
      },
      // Frenos: medio
      {
        tenantId: DEMO_TENANT_ID,
        category: 'FRENOS',
        threshold: 12,
        isActive: true,
      },
    ],
  });
  console.log('   4 WatchdogConfigurations Tenant 1 creadas');

  // ========================================
  // AUDIT LOG - Tenant 1
  // Muestra el historial de acciones en la tabla de auditoría del admin
  // ========================================
  console.log('   Creando AuditLog entries Tenant 1...');

  await prisma.auditLog.createMany({
    data: [
      // Onboarding: owner creó la organización
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Owner.id,
        action: 'CREATED',
        resource: 'Tenant',
        resourceId: DEMO_TENANT_ID,
        changes: { name: 'Transportes Demo SAS' },
        createdAt: getRelativeDate(3, 1),
      },
      // Owner asignó rol MANAGER al manager
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Owner.id,
        action: 'USER_ROLE_CHANGED',
        resource: 'User',
        resourceId: t1Manager.id,
        changes: { before: { role: 'DRIVER' }, after: { role: 'MANAGER' } },
        createdAt: getRelativeDate(3, 2),
      },
      // Owner asignó rol TECHNICIAN
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Owner.id,
        action: 'USER_ROLE_CHANGED',
        resource: 'User',
        resourceId: t1Tech.id,
        changes: { before: { role: 'DRIVER' }, after: { role: 'TECHNICIAN' } },
        createdAt: getRelativeDate(3, 3),
      },
      // Owner asignó rol PURCHASER
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Owner.id,
        action: 'USER_ROLE_CHANGED',
        resource: 'User',
        resourceId: t1Purchaser.id,
        changes: { before: { role: 'DRIVER' }, after: { role: 'PURCHASER' } },
        createdAt: getRelativeDate(3, 4),
      },
      // Manager aprobó una OT
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Manager.id,
        action: 'APPROVED',
        resource: 'WorkOrder',
        changes: {
          status: 'APPROVED',
          note: 'Aprobación de mantenimiento preventivo',
        },
        createdAt: getRelativeDate(2, 10),
      },
      // Owner aprobó una factura
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Owner.id,
        action: 'APPROVED',
        resource: 'Invoice',
        changes: { invoiceNumber: 'FAC-2026-3-0', totalAmount: 535500 },
        createdAt: getRelativeDate(1, 5),
      },
      // Alerta financiera marcada como reconocida por el manager
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Manager.id,
        action: 'ACKNOWLEDGED',
        resource: 'FinancialAlert',
        changes: {
          severity: 'HIGH',
          message: 'Desviación de precio reconocida',
        },
        createdAt: getRelativeDate(1, 8),
      },
      // OT completada por técnico
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Tech.id,
        action: 'COMPLETED',
        resource: 'WorkOrder',
        changes: { status: 'COMPLETED', completionMileage: 44500 },
        createdAt: getRelativeDate(1, 15),
      },
      // Manager modificó una OT
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Manager.id,
        action: 'MODIFIED',
        resource: 'WorkOrder',
        changes: { before: { priority: 'LOW' }, after: { priority: 'HIGH' } },
        createdAt: getRelativeDate(0, 3),
      },
      // Purchaser cambió rol de technician (simulación de error + corrección)
      {
        tenantId: DEMO_TENANT_ID,
        actorId: t1Owner.id,
        action: 'USER_ROLE_CHANGED',
        resource: 'User',
        resourceId: t1Purchaser.id,
        changes: {
          before: { role: 'TECHNICIAN' },
          after: { role: 'PURCHASER' },
          reason: 'Corrección de rol incorrecto',
        },
        createdAt: getRelativeDate(0, 5),
      },
    ],
  });
  console.log('   10 AuditLog entries creadas');

  // ========================================
  // FUEL VOUCHERS - Tenant 1 (Demo)
  // ========================================
  console.log('   Creando Fuel Vouchers Tenant 1...');

  const t1VehiclesForFuel = await prisma.vehicle.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: { licensePlate: 'asc' },
  });
  const t1DriversForFuel = await prisma.driver.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: { name: 'asc' },
  });
  const t1ProvidersForFuel = await prisma.provider.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: { name: 'asc' },
  });
  const t1OwnerForFuel = await prisma.user.findFirst({
    where: { tenantId: DEMO_TENANT_ID, role: 'OWNER' },
  });

  if (t1VehiclesForFuel.length > 0 && t1OwnerForFuel) {
    // =====================================================================
    // FUEL DATA PARA ANALYTICS:
    // - FIN-001 (Hilux diesel): 6 entradas ~ 8 L/100km EXCEPTO mes 3 → 12 L/100km (ANOMALY HIGH_CONSUMPTION)
    // - FIN-002 (Ranger diesel): 5 entradas, consumo estable ~8.5 L/100km
    // - FIN-003 (D-MAX diesel):  5 entradas, consumo estable ~8 L/100km
    // - FIN-004 (Land Cruiser gasolina): 4 entradas ~9.5 L/100km
    // =====================================================================
    const fuelData = [
      // === FIN-001 (Hilux, diesel) — consumo normal ~8 L/100km, ANOMALÍA en mes 3 ===
      {
        vehicleId: t1VehiclesForFuel[0].id,
        driverId: t1DriversForFuel[0]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(5, 8),
        fuelType: 'DIESEL',
        quantity: 65.0,
        volumeUnit: 'LITERS',
        odometer: 43000,
        pricePerUnit: 1800.0,
        voucherPrefix: 'COMB-FIN001',
        seq: 1,
      },
      {
        vehicleId: t1VehiclesForFuel[0].id,
        driverId: t1DriversForFuel[0]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(4, 8),
        fuelType: 'DIESEL',
        quantity: 62.0,
        volumeUnit: 'LITERS',
        // 750 km → 8.27 L/100km (normal)
        odometer: 43750,
        pricePerUnit: 1820.0,
        voucherPrefix: 'COMB-FIN001',
        seq: 2,
      },
      {
        vehicleId: t1VehiclesForFuel[0].id,
        driverId: t1DriversForFuel[0]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(3, 8),
        fuelType: 'DIESEL',
        quantity: 60.0,
        volumeUnit: 'LITERS',
        // 750 km → 8.0 L/100km (normal)
        odometer: 44500,
        pricePerUnit: 1840.0,
        voucherPrefix: 'COMB-FIN001',
        seq: 3,
      },
      // ANOMALÍA: 90 L para 750 km → 12.0 L/100km (+50% sobre baseline ~8) = HIGH_CONSUMPTION
      {
        vehicleId: t1VehiclesForFuel[0].id,
        driverId: t1DriversForFuel[0]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(2, 8),
        fuelType: 'DIESEL',
        quantity: 90.0,
        volumeUnit: 'LITERS',
        odometer: 45250,
        pricePerUnit: 1860.0,
        voucherPrefix: 'COMB-FIN001',
        seq: 4,
      },
      {
        vehicleId: t1VehiclesForFuel[0].id,
        driverId: t1DriversForFuel[0]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(1, 8),
        fuelType: 'DIESEL',
        quantity: 63.0,
        volumeUnit: 'LITERS',
        // 750 km → 8.4 L/100km (vuelve a normal)
        odometer: 46000,
        pricePerUnit: 1880.0,
        voucherPrefix: 'COMB-FIN001',
        seq: 5,
      },
      {
        vehicleId: t1VehiclesForFuel[0].id,
        driverId: t1DriversForFuel[0]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(0, 8),
        fuelType: 'DIESEL',
        quantity: 64.0,
        volumeUnit: 'LITERS',
        // 700 km → 9.14 L/100km (normal)
        odometer: 46700,
        pricePerUnit: 1900.0,
        voucherPrefix: 'COMB-FIN001',
        seq: 6,
      },

      // === FIN-002 (Ranger, diesel) — consumo estable ~8.5 L/100km ===
      {
        vehicleId: t1VehiclesForFuel[1].id,
        driverId: t1DriversForFuel[1]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(4, 12),
        fuelType: 'DIESEL',
        quantity: 68.0,
        volumeUnit: 'LITERS',
        odometer: 59000,
        pricePerUnit: 1820.0,
        voucherPrefix: 'COMB-FIN002',
        seq: 1,
      },
      {
        vehicleId: t1VehiclesForFuel[1].id,
        driverId: t1DriversForFuel[1]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(3, 12),
        fuelType: 'DIESEL',
        quantity: 70.0,
        volumeUnit: 'LITERS',
        // 850 km → 8.24 L/100km
        odometer: 59850,
        pricePerUnit: 1840.0,
        voucherPrefix: 'COMB-FIN002',
        seq: 2,
      },
      {
        vehicleId: t1VehiclesForFuel[1].id,
        driverId: t1DriversForFuel[1]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(2, 12),
        fuelType: 'DIESEL',
        quantity: 67.0,
        volumeUnit: 'LITERS',
        // 850 km → 7.88 L/100km
        odometer: 60700,
        pricePerUnit: 1855.0,
        voucherPrefix: 'COMB-FIN002',
        seq: 3,
      },
      {
        vehicleId: t1VehiclesForFuel[1].id,
        driverId: t1DriversForFuel[1]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(1, 12),
        fuelType: 'DIESEL',
        quantity: 69.0,
        volumeUnit: 'LITERS',
        // 800 km → 8.63 L/100km
        odometer: 61500,
        pricePerUnit: 1870.0,
        voucherPrefix: 'COMB-FIN002',
        seq: 4,
      },
      {
        vehicleId: t1VehiclesForFuel[1].id,
        driverId: t1DriversForFuel[1]?.id ?? null,
        providerId: t1ProvidersForFuel[0]?.id ?? null,
        date: getRelativeDate(0, 12),
        fuelType: 'DIESEL',
        quantity: 71.0,
        volumeUnit: 'LITERS',
        // 800 km → 8.88 L/100km
        odometer: 62300,
        pricePerUnit: 1900.0,
        voucherPrefix: 'COMB-FIN002',
        seq: 5,
      },

      // === FIN-003 (D-MAX, diesel) — consumo estable ~8 L/100km ===
      {
        vehicleId: t1VehiclesForFuel[2].id,
        driverId: t1DriversForFuel[2]?.id ?? null,
        providerId: null,
        date: getRelativeDate(4, 18),
        fuelType: 'DIESEL',
        quantity: 55.0,
        volumeUnit: 'LITERS',
        odometer: 15500,
        pricePerUnit: 1810.0,
        voucherPrefix: 'COMB-FIN003',
        seq: 1,
      },
      {
        vehicleId: t1VehiclesForFuel[2].id,
        driverId: t1DriversForFuel[2]?.id ?? null,
        providerId: null,
        date: getRelativeDate(3, 18),
        fuelType: 'DIESEL',
        quantity: 58.0,
        volumeUnit: 'LITERS',
        // 700 km → 8.29 L/100km
        odometer: 16200,
        pricePerUnit: 1830.0,
        voucherPrefix: 'COMB-FIN003',
        seq: 2,
      },
      {
        vehicleId: t1VehiclesForFuel[2].id,
        driverId: t1DriversForFuel[2]?.id ?? null,
        providerId: null,
        date: getRelativeDate(2, 18),
        fuelType: 'DIESEL',
        quantity: 52.0,
        volumeUnit: 'LITERS',
        // 700 km → 7.43 L/100km
        odometer: 16900,
        pricePerUnit: 1845.0,
        voucherPrefix: 'COMB-FIN003',
        seq: 3,
      },
      {
        vehicleId: t1VehiclesForFuel[2].id,
        driverId: t1DriversForFuel[2]?.id ?? null,
        providerId: null,
        date: getRelativeDate(1, 18),
        fuelType: 'DIESEL',
        quantity: 56.0,
        volumeUnit: 'LITERS',
        // 700 km → 8.0 L/100km
        odometer: 17600,
        pricePerUnit: 1860.0,
        voucherPrefix: 'COMB-FIN003',
        seq: 4,
      },
      {
        vehicleId: t1VehiclesForFuel[2].id,
        driverId: t1DriversForFuel[2]?.id ?? null,
        providerId: null,
        date: getRelativeDate(0, 18),
        fuelType: 'DIESEL',
        quantity: 53.0,
        volumeUnit: 'LITERS',
        // 600 km → 8.83 L/100km
        odometer: 18200,
        pricePerUnit: 1890.0,
        voucherPrefix: 'COMB-FIN003',
        seq: 5,
      },

      // === FIN-004 (Land Cruiser, gasolina) — 4 entradas ~9.5 L/100km ===
      {
        vehicleId: t1VehiclesForFuel[3]?.id ?? t1VehiclesForFuel[0].id,
        driverId: null,
        providerId: t1ProvidersForFuel[1]?.id ?? null,
        date: getRelativeDate(3, 22),
        fuelType: 'NAFTA_SUPER',
        quantity: 72.0,
        volumeUnit: 'LITERS',
        odometer: 93500,
        pricePerUnit: 2100.0,
        voucherPrefix: 'COMB-FIN004',
        seq: 1,
      },
      {
        vehicleId: t1VehiclesForFuel[3]?.id ?? t1VehiclesForFuel[0].id,
        driverId: null,
        providerId: t1ProvidersForFuel[1]?.id ?? null,
        date: getRelativeDate(2, 22),
        fuelType: 'NAFTA_SUPER',
        quantity: 75.0,
        volumeUnit: 'LITERS',
        // 800 km → 9.38 L/100km
        odometer: 94300,
        pricePerUnit: 2130.0,
        voucherPrefix: 'COMB-FIN004',
        seq: 2,
      },
      {
        vehicleId: t1VehiclesForFuel[3]?.id ?? t1VehiclesForFuel[0].id,
        driverId: null,
        providerId: t1ProvidersForFuel[1]?.id ?? null,
        date: getRelativeDate(1, 22),
        fuelType: 'NAFTA_SUPER',
        quantity: 73.0,
        volumeUnit: 'LITERS',
        // 750 km → 9.73 L/100km
        odometer: 95050,
        pricePerUnit: 2160.0,
        voucherPrefix: 'COMB-FIN004',
        seq: 3,
      },
      {
        vehicleId: t1VehiclesForFuel[3]?.id ?? t1VehiclesForFuel[0].id,
        driverId: null,
        providerId: t1ProvidersForFuel[1]?.id ?? null,
        date: getRelativeDate(0, 22),
        fuelType: 'NAFTA_SUPER',
        quantity: 74.0,
        volumeUnit: 'LITERS',
        // 750 km → 9.87 L/100km
        odometer: 95800,
        pricePerUnit: 2190.0,
        voucherPrefix: 'COMB-FIN004',
        seq: 4,
      },
    ];

    for (const fd of fuelData) {
      const { Decimal } = await import('@prisma/client/runtime/library');
      const totalAmount =
        fd.pricePerUnit !== null
          ? new Decimal(fd.quantity).mul(new Decimal(fd.pricePerUnit))
          : null;

      const voucherNumber = `${fd.voucherPrefix}-${String(fd.seq).padStart(5, '0')}`;

      const fv = await prisma.fuelVoucher.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          voucherNumber,
          vehicleId: fd.vehicleId,
          driverId: fd.driverId,
          providerId: fd.providerId,
          date: fd.date,
          fuelType: fd.fuelType as import('@prisma/client').FuelVoucherFuelType,
          quantity: new Decimal(fd.quantity),
          volumeUnit: fd.volumeUnit as import('@prisma/client').VolumeUnit,
          odometer: fd.odometer,
          pricePerUnit:
            fd.pricePerUnit !== null ? new Decimal(fd.pricePerUnit) : null,
          totalAmount,
          createdBy: t1OwnerForFuel.id,
        },
      });

      await prisma.odometerLog.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          vehicleId: fd.vehicleId,
          driverId: fd.driverId,
          kilometers: fd.odometer,
          measureType: 'KILOMETERS',
          recordedAt: fd.date,
          fuelVoucherId: fv.id,
        },
      });
    }

    console.log(
      `   ${fuelData.length} Fuel Vouchers creados con OdometerLogs vinculados`
    );
  }

  const t1TenantSummary = await prisma.tenant.findUnique({
    where: { id: DEMO_TENANT_ID },
  });
  console.log(`\n   Demo Tenant "${t1TenantSummary?.name}" COMPLETO.\n`);

  // ========================================
  // SUMMARY
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
  const t2OwnerUser = await prisma.user.create({
    data: {
      tenantId: TENANT_2_ID,
      email: 'grivarol69@gmail.com',
      firstName: 'Guillermo',
      lastName: 'Rivarola',
      role: 'OWNER',
      isActive: true,
    },
  });
  await prisma.user.create({
    data: {
      tenantId: TENANT_2_ID,
      email: 'grivarol69driver@gmail.com',
      firstName: 'Yeison',
      lastName: 'Montaño',
      role: 'MANAGER',
      isActive: true,
    },
  });
  await prisma.user.create({
    data: {
      tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
        name: 'Taller Servicios',
        specialty: 'ELECTRICO',
        status: 'ACTIVE',
        hourlyRate: 28000,
      },
    }),
    prisma.technician.create({
      data: {
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
        name: 'Alberto Ruiz',
        licenseNumber: 'LIC-T2-001',
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
        vehicleId: t2Vehicles[0].id,
        driverId: t2Drivers[0].id,
        isPrimary: true,
        assignedBy: t2OwnerUser.id,
      },
    }),
    prisma.vehicleDriver.create({
      data: {
        tenantId: TENANT_2_ID,
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
    TENANT_2_ID,
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
    TENANT_2_ID,
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
    TENANT_2_ID,
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

  // ========================================
  // WORK ORDERS - Tenant 2
  // ========================================
  console.log('   Creando Work Orders Tenant 2...');

  const t2VehiclesList = await prisma.vehicle.findMany({
    where: { tenantId: TENANT_2_ID },
  });
  const t2ProviderList = await prisma.provider.findMany({
    where: { tenantId: TENANT_2_ID },
  });
  const t2TechnicianList = await prisma.technician.findMany({
    where: { tenantId: TENANT_2_ID },
  });
  const t2UsersList = await prisma.user.findMany({
    where: { tenantId: TENANT_2_ID },
  });
  const t2MantItems = await prisma.mantItem.findMany({
    where: { isGlobal: true },
  });

  const filtrosCol = t2ProviderList.find(p => p.name === 'Filtros Col');
  const tallerNorte = t2ProviderList.find(p => p.name === 'Taller Norte');
  const t2OwnerUserUser = t2UsersList.find(u => u.role === 'OWNER');

  if (t2VehiclesList.length > 0 && filtrosCol && t2OwnerUserUser) {
    // WO 1: Mantenimiento XYZ-111
    const wo1 = await prisma.workOrder.create({
      data: {
        tenantId: TENANT_2_ID,
        vehicleId: t2VehiclesList[0].id,
        title: 'Mantenimiento 10,000 km',
        description: 'Servicio preventivo',
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
        mantType: 'PREVENTIVE',
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo1.id,
        mantItemId:
          t2MantItems.find(i => i.name === 'Cambio aceite motor')?.id || '',
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
        vehicleId: t2VehiclesList[1].id,
        title: 'Cambio filtros',
        description: 'Filtros de aceite y aire',
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
        mantType: 'PREVENTIVE',
      },
    });

    await prisma.workOrderItem.create({
      data: {
        workOrderId: wo2.id,
        mantItemId:
          t2MantItems.find(i => i.name === 'Cambio filtro aceite')?.id || '',
        tenantId: TENANT_2_ID,
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
        mantItemId:
          t2MantItems.find(i => i.name === 'Cambio filtro aire')?.id || '',
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
        vehicleId: t2VehiclesList[2].id,
        title: 'Mantenimiento 60,000 km',
        description: 'Servicio mayor',
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
        mantType: 'PREVENTIVE',
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
        tenantId: TENANT_2_ID,
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
    where: { tenantId: TENANT_2_ID },
    include: {
      vehicleMantProgram: {
        include: { packages: { include: { items: true } } },
      },
    },
  });

  if (t2VehiclesWithProgram.length > 0) {
    const xyz111 = t2VehiclesWithProgram.find(
      v => v.licensePlate === 'XYZ-111'
    );
    if (xyz111 && xyz111.vehicleMantProgram) {
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: TENANT_2_ID,
          vehicleId: xyz111.id,
          programItemId:
            xyz111.vehicleMantProgram.packages[0]?.items[0]?.id || '',
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

  // ========================================
  // WATCHDOG CONFIGURATION - Tenant 2
  // ========================================
  console.log('   Creando WatchdogConfiguration Tenant 2...');

  await prisma.watchdogConfiguration.createMany({
    data: [
      { tenantId: TENANT_2_ID, category: null, threshold: 10, isActive: true },
      {
        tenantId: TENANT_2_ID,
        category: 'FILTROS',
        threshold: 8,
        isActive: true,
      },
    ],
  });
  console.log('   2 WatchdogConfigurations Tenant 2 creadas');

  console.log(`\n   Tenant 2 COMPLETO.\n`);

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
  console.log('  - 17 Categories, 38 MantItems + 13 ServiceItems');
  console.log('  - 2 Procedimientos KB con pasos de tempario');
  console.log('  - 14 MasterParts');
  console.log('  - 5 Templates con paquetes');
  console.log('  - 5 DocumentTypeConfigs (CO)');
  console.log('  - MantItemVehiclePart (KB auto-sugerencia, ver seedGlobalKB)');

  console.log('\nPLATFORM TENANT:');
  console.log('  - Fleet Care Platform');
  console.log('  - SUPER_ADMIN: grivarol69@gmail.com');

  console.log('\nDEMO TENANT 1 (Transportes Demo SAS):');
  console.log(`  - ID: ${DEMO_TENANT_ID}`);
  console.log(`  - OWNER: ${ownerEmail}`);
  console.log(`  - MANAGER: ${managerEmail}`);
  console.log(`  - TECHNICIAN: ${techEmail}`);
  console.log(`  - PURCHASER: ${purchaserEmail}`);
  console.log(`  - ${t1Vehicles.length} vehicles`);
  console.log('  - 3 proveedores, 2 tecnicos, 3 conductores');
  console.log('  - 3 programas de mantenimiento');
  console.log(`  - ${t1InventoryData.length} items de inventario`);
  console.log('  - ~30 Work Orders (historial 12 meses)');
  console.log('  - Invoices vinculadas');
  console.log('  - 3 Maintenance Alerts, 2 Financial Alerts');
  console.log('  - 4 WatchdogConfigurations (global + por categoría)');
  console.log('  - 10 AuditLog entries (roles, aprobaciones, OTs)');
  console.log(
    '  - 20 FuelVouchers + OdometerLogs (analítica L/100km, anomalía en FIN-001)'
  );

  // ========================================
  // ========================================
  // SEEDS ESPECÍFICOS
  // ========================================
  console.log('\n6. Seeds específicos (ya incluidos en seedGlobalKB)...\n');

  // Hino 300 y International 7400 ya llamados en seedGlobalKB.
  // Obtener temparioItemsMap desde la DB (seedTemparioAutomotriz ya fue ejecutado en seedGlobalKB).
  const temparioForMap = await prisma.tempario.findFirstOrThrow({
    where: { name: 'Tempario Automotriz Standard' },
  });
  const temparioItemsList = await prisma.temparioItem.findMany({
    where: { temparioId: temparioForMap.id },
  });
  const temparioItemsMap: Record<string, string> = {};
  for (const item of temparioItemsList) {
    temparioItemsMap[item.code] = item.id;
  }

  // --- PROCEDIMIENTOS KB (MantItemProcedure) ---
  console.log('   Creando procedimientos KB (MantItemProcedure)...');

  const procAceite = await prisma.mantItemProcedure.create({
    data: {
      mantItemId: iSvcCambioAceite.id,
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

  const procPastillas = await prisma.mantItemProcedure.create({
    data: {
      mantItemId: iSvcPastillasDelant.id,
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
      },
      {
        procedureId: procPastillas.id,
        temparioItemId: temparioItemsMap['F001']!,
        order: 2,
        standardHours: 0.8,
      },
    ],
  });
  console.log('   Procedimientos KB creados.');

  // Demo: SerializedItems (neumáticos)
  try {
    const demoTires = await Promise.all([
      prisma.serializedItem.create({
        data: {
          tenantId: tenant1.id,
          serialNumber: 'DEMO-SN-001',
          type: 'TIRE',
          status: 'INSTALLED',
          specs: { treadDepthMm: 8.0, usefulLifePct: 100 },
          receivedAt: new Date(),
        },
      }),
      prisma.serializedItem.create({
        data: {
          tenantId: tenant1.id,
          serialNumber: 'DEMO-SN-002',
          type: 'TIRE',
          status: 'INSTALLED',
          specs: { treadDepthMm: 8.0, usefulLifePct: 100 },
          receivedAt: new Date(),
        },
      }),
      prisma.serializedItem.create({
        data: {
          tenantId: tenant1.id,
          serialNumber: 'DEMO-SN-003',
          type: 'TIRE',
          status: 'IN_STOCK',
          specs: { treadDepthMm: 8.0, usefulLifePct: 100 },
          receivedAt: new Date(),
        },
      }),
      prisma.serializedItem.create({
        data: {
          tenantId: tenant1.id,
          serialNumber: 'DEMO-SN-004',
          type: 'TIRE',
          status: 'IN_STOCK',
          specs: { treadDepthMm: 8.0, usefulLifePct: 100 },
          receivedAt: new Date(),
        },
      }),
    ]);

    // Asignar los primeros 2 al primer vehículo demo
    if (t1Vehicles[0]) {
      await prisma.vehicleItemAssignment.create({
        data: {
          tenantId: tenant1.id,
          vehicleId: t1Vehicles[0].id,
          serializedItemId: demoTires[0].id,
          position: 'FL',
          installedAt: new Date(),
        },
      });
      await prisma.vehicleItemAssignment.create({
        data: {
          tenantId: tenant1.id,
          vehicleId: t1Vehicles[0].id,
          serializedItemId: demoTires[1].id,
          position: 'FR',
          installedAt: new Date(),
        },
      });
    }
    console.log('✅ Demo serialized items creados');
  } catch (e) {
    console.error('Error creando demo serialized items:', e);
  }

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
