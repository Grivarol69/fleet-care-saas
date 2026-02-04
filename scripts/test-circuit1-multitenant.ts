/**
 * ============================================================
 * CIRCUITO 1: Multi-tenancy y Aislamiento - Test Automatizado
 * ============================================================
 *
 * Ejecutar: npx tsx scripts/test-circuit1-multitenant.ts
 *
 * Este script verifica:
 *   1.1 Datos del seed (Tenant A) existen correctamente
 *   1.2 Creacion de segundo tenant (Tenant B) con datos propios
 *   1.3 Aislamiento: datos de A no se filtran a B y viceversa
 *   1.4 Constraints unicos cross-tenant (ej: misma placa en 2 tenants)
 *   1.5 Datos globales (tenantId=null) visibles desde ambos
 *   1.6 Limpieza del tenant de prueba
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ─── Setup ───────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Tenant IDs
const TENANT_A_ID = 'org_36M1mCUcHm4ShrsTQQK3etw9FEk'; // TransLogistica (seed)
const TENANT_B_ID = 'test-tenant-isolation-b';            // Tenant de prueba

// Counters
let passed = 0;
let failed = 0;
const failures: string[] = [];

// ─── Helpers ─────────────────────────────────────────────────
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    const msg = detail ? `${testName} -- ${detail}` : testName;
    failures.push(msg);
    console.log(`  [FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ─── 1.1  Verificar datos existentes del Seed (Tenant A) ────
async function test_1_1_seedData() {
  section('1.1 Verificar datos del Seed (Tenant A: TransLogistica)');

  // Tenant existe
  const tenantA = await prisma.tenant.findUnique({ where: { id: TENANT_A_ID } });
  assert(tenantA !== null, 'Tenant A existe en la BD');
  assert(tenantA?.name !== undefined && tenantA.name.length > 0, 'Tenant A tiene nombre definido', `got: "${tenantA?.name}"`);

  // Usuarios del tenant
  const users = await prisma.user.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(users.length >= 4, `Tenant A tiene >= 4 usuarios (got ${users.length})`);

  const roles = users.map(u => u.role);
  assert(roles.includes('OWNER'), 'Existe usuario OWNER en Tenant A');
  assert(roles.includes('MANAGER'), 'Existe usuario MANAGER en Tenant A');
  assert(roles.includes('TECHNICIAN'), 'Existe usuario TECHNICIAN en Tenant A');
  assert(roles.includes('DRIVER'), 'Existe usuario DRIVER en Tenant A');

  // Vehiculos
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(vehicles.length === 8, `Tenant A tiene 8 vehiculos (got ${vehicles.length})`);

  const plates = vehicles.map(v => v.licensePlate).sort();
  assert(plates.includes('ABC-123'), 'Vehiculo ABC-123 existe en Tenant A');
  assert(plates.includes('DEF-456'), 'Vehiculo DEF-456 existe en Tenant A');

  // Drivers, Technicians, Providers
  const drivers = await prisma.driver.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(drivers.length === 3, `Tenant A tiene 3 conductores (got ${drivers.length})`);

  const techs = await prisma.technician.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(techs.length === 2, `Tenant A tiene 2 tecnicos (got ${techs.length})`);

  const providers = await prisma.provider.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(providers.length === 3, `Tenant A tiene 3 proveedores (got ${providers.length})`);

  // Work Orders
  const workOrders = await prisma.workOrder.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(workOrders.length >= 3, `Tenant A tiene >= 3 ordenes de trabajo (got ${workOrders.length})`);

  // Invoices
  const invoices = await prisma.invoice.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(invoices.length >= 4, `Tenant A tiene >= 4 facturas (got ${invoices.length})`);

  // Maintenance Programs
  const programs = await prisma.vehicleMantProgram.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(programs.length === 3, `Tenant A tiene 3 programas de mantenimiento (got ${programs.length})`);

  // Maintenance Alerts
  const alerts = await prisma.maintenanceAlert.findMany({ where: { tenantId: TENANT_A_ID } });
  assert(alerts.length >= 1, `Tenant A tiene >= 1 alerta de mantenimiento (got ${alerts.length})`);
}

// ─── 1.2  Crear Tenant B con datos propios ──────────────────
async function test_1_2_createTenantB() {
  section('1.2 Crear Tenant B (Empresa Test Aislamiento)');

  // Limpiar tenant B si existe de corrida anterior
  await cleanupTenantB();

  // Crear Tenant B
  const tenantB = await prisma.tenant.create({
    data: {
      id: TENANT_B_ID,
      name: 'Empresa Test Aislamiento SAS',
      slug: 'test-aislamiento',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@test-aislamiento.com',
    },
  });
  assert(tenantB !== null, 'Tenant B creado exitosamente');
  assert(tenantB.id === TENANT_B_ID, 'Tenant B tiene ID correcto');

  // Crear usuario OWNER en Tenant B
  const ownerB = await prisma.user.create({
    data: {
      tenantId: TENANT_B_ID,
      email: 'owner@test-aislamiento.com',
      firstName: 'Maria',
      lastName: 'Test',
      role: 'OWNER',
      isActive: true,
    },
  });
  assert(ownerB !== null, 'Usuario OWNER creado en Tenant B');

  // Crear usuario MANAGER en Tenant B
  const managerB = await prisma.user.create({
    data: {
      tenantId: TENANT_B_ID,
      email: 'manager@test-aislamiento.com',
      firstName: 'Pedro',
      lastName: 'Test',
      role: 'MANAGER',
      isActive: true,
    },
  });
  assert(managerB !== null, 'Usuario MANAGER creado en Tenant B');

  // Obtener marcas/lineas/tipos globales para crear vehiculos
  const globalBrand = await prisma.vehicleBrand.findFirst({
    where: { isGlobal: true, name: 'Toyota' },
  });
  const globalLine = await prisma.vehicleLine.findFirst({
    where: { isGlobal: true, name: 'Hilux' },
  });
  const globalType = await prisma.vehicleType.findFirst({
    where: { isGlobal: true, name: 'Camioneta 4x4' },
  });

  assert(globalBrand !== null, 'Marca global Toyota accesible');
  assert(globalLine !== null, 'Linea global Hilux accesible');
  assert(globalType !== null, 'Tipo global Camioneta 4x4 accesible');

  if (!globalBrand || !globalLine || !globalType) {
    console.log('  [SKIP] No se pueden crear vehiculos sin datos globales');
    return;
  }

  // Crear vehiculos en Tenant B
  const vehicleB1 = await prisma.vehicle.create({
    data: {
      tenantId: TENANT_B_ID,
      licensePlate: 'ZZZ-999',
      brandId: globalBrand.id,
      lineId: globalLine.id,
      typeId: globalType.id,
      year: 2024,
      color: 'Amarillo',
      mileage: 5000,
      status: 'ACTIVE',
      situation: 'AVAILABLE',
      owner: 'OWN',
      typePlate: 'PARTICULAR',
    },
  });
  assert(vehicleB1 !== null, 'Vehiculo ZZZ-999 creado en Tenant B');

  // Crear vehiculo con MISMA PLACA que Tenant A (debe funcionar: constraint es por tenant)
  const vehicleB2 = await prisma.vehicle.create({
    data: {
      tenantId: TENANT_B_ID,
      licensePlate: 'ABC-123', // Misma placa que en Tenant A
      brandId: globalBrand.id,
      lineId: globalLine.id,
      typeId: globalType.id,
      year: 2025,
      color: 'Negro',
      mileage: 1000,
      status: 'ACTIVE',
      situation: 'AVAILABLE',
      owner: 'OWN',
      typePlate: 'PARTICULAR',
    },
  });
  assert(vehicleB2 !== null, 'Vehiculo ABC-123 creado en Tenant B (misma placa, distinto tenant)');

  // Crear driver en Tenant B
  const driverB = await prisma.driver.create({
    data: {
      tenantId: TENANT_B_ID,
      name: 'Driver Tenant B',
      licenseNumber: '99999999',
      status: 'ACTIVE',
    },
  });
  assert(driverB !== null, 'Conductor creado en Tenant B');

  // Crear technician en Tenant B
  const techB = await prisma.technician.create({
    data: {
      tenantId: TENANT_B_ID,
      name: 'Tecnico Tenant B',
      specialty: 'GENERAL',
      status: 'ACTIVE',
    },
  });
  assert(techB !== null, 'Tecnico creado en Tenant B');

  // Crear provider en Tenant B
  const providerB = await prisma.provider.create({
    data: {
      tenantId: TENANT_B_ID,
      name: 'Proveedor Tenant B',
      specialty: 'SERVICIOS_GENERALES',
      status: 'ACTIVE',
    },
  });
  assert(providerB !== null, 'Proveedor creado en Tenant B');

  // Crear Work Order en Tenant B
  const woB = await prisma.workOrder.create({
    data: {
      tenantId: TENANT_B_ID,
      vehicleId: vehicleB1.id,
      title: 'OT de prueba Tenant B',
      description: 'Orden de trabajo para verificar aislamiento',
      mantType: 'CORRECTIVE',
      priority: 'LOW',
      status: 'PENDING',
      technicianId: techB.id,
      creationMileage: 5000,
      requestedBy: managerB.id,
      estimatedCost: 100000,
    },
  });
  assert(woB !== null, 'Orden de trabajo creada en Tenant B');

  // Crear Invoice en Tenant B
  const invoiceB = await prisma.invoice.create({
    data: {
      tenantId: TENANT_B_ID,
      invoiceNumber: 'TEST-B-001',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      supplierId: providerB.id,
      workOrderId: woB.id,
      subtotal: 100000,
      taxAmount: 19000,
      totalAmount: 119000,
      currency: 'COP',
      status: 'PENDING',
      registeredBy: managerB.id,
    },
  });
  assert(invoiceB !== null, 'Factura creada en Tenant B');
}

// ─── 1.3  Verificar Aislamiento ─────────────────────────────
async function test_1_3_isolation() {
  section('1.3 Verificar Aislamiento entre Tenant A y Tenant B');

  // --- Vehiculos ---
  console.log('\n  --- Vehiculos ---');
  const vehiclesA = await prisma.vehicle.findMany({
    where: { tenantId: TENANT_A_ID, status: 'ACTIVE' },
  });
  const vehiclesB = await prisma.vehicle.findMany({
    where: { tenantId: TENANT_B_ID, status: 'ACTIVE' },
  });

  assert(vehiclesA.length === 8, `Query Tenant A retorna 8 vehiculos (got ${vehiclesA.length})`);
  assert(vehiclesB.length === 2, `Query Tenant B retorna 2 vehiculos (got ${vehiclesB.length})`);

  // Verificar que ningun vehiculo de B aparece en A
  const vehicleIdsA = vehiclesA.map(v => v.id);
  const vehicleIdsB = vehiclesB.map(v => v.id);
  const crossContamination = vehicleIdsA.some(id => vehicleIdsB.includes(id));
  assert(!crossContamination, 'No hay contaminacion cruzada de IDs de vehiculos');

  // Verificar placa duplicada en diferentes tenants
  const abcA = vehiclesA.find(v => v.licensePlate === 'ABC-123');
  const abcB = vehiclesB.find(v => v.licensePlate === 'ABC-123');
  assert(abcA !== undefined, 'ABC-123 existe en Tenant A');
  assert(abcB !== undefined, 'ABC-123 existe en Tenant B');
  assert(abcA?.id !== abcB?.id, 'ABC-123 en A y B son registros diferentes');
  assert(abcA?.tenantId === TENANT_A_ID, 'ABC-123 de A pertenece a Tenant A');
  assert(abcB?.tenantId === TENANT_B_ID, 'ABC-123 de B pertenece a Tenant B');

  // ZZZ-999 solo debe existir en B
  const zzzA = vehiclesA.find(v => v.licensePlate === 'ZZZ-999');
  const zzzB = vehiclesB.find(v => v.licensePlate === 'ZZZ-999');
  assert(zzzA === undefined, 'ZZZ-999 NO existe en Tenant A');
  assert(zzzB !== undefined, 'ZZZ-999 existe en Tenant B');

  // --- Usuarios ---
  console.log('\n  --- Usuarios ---');
  const usersA = await prisma.user.findMany({ where: { tenantId: TENANT_A_ID } });
  const usersB = await prisma.user.findMany({ where: { tenantId: TENANT_B_ID } });

  assert(usersA.length >= 4, `Tenant A tiene >= 4 usuarios (got ${usersA.length})`);
  assert(usersB.length === 2, `Tenant B tiene 2 usuarios (got ${usersB.length})`);

  const emailsA = usersA.map(u => u.email);
  const emailsB = usersB.map(u => u.email);
  assert(!emailsA.includes('owner@test-aislamiento.com'), 'Email de Tenant B no aparece en Tenant A');
  assert(!emailsB.includes('owner@translogistica.co'), 'Email de Tenant A no aparece en Tenant B');

  // --- Drivers ---
  console.log('\n  --- Conductores ---');
  const driversA = await prisma.driver.findMany({ where: { tenantId: TENANT_A_ID } });
  const driversB = await prisma.driver.findMany({ where: { tenantId: TENANT_B_ID } });

  assert(driversA.length === 3, `Tenant A tiene 3 conductores (got ${driversA.length})`);
  assert(driversB.length === 1, `Tenant B tiene 1 conductor (got ${driversB.length})`);
  assert(!driversA.some(d => d.name === 'Driver Tenant B'), 'Driver de B no aparece en A');
  assert(!driversB.some(d => d.name === 'Juan Lopez'), 'Driver de A no aparece en B');

  // --- Technicians ---
  console.log('\n  --- Tecnicos ---');
  const techsA = await prisma.technician.findMany({ where: { tenantId: TENANT_A_ID } });
  const techsB = await prisma.technician.findMany({ where: { tenantId: TENANT_B_ID } });

  assert(techsA.length === 2, `Tenant A tiene 2 tecnicos (got ${techsA.length})`);
  assert(techsB.length === 1, `Tenant B tiene 1 tecnico (got ${techsB.length})`);
  assert(!techsA.some(t => t.name === 'Tecnico Tenant B'), 'Tecnico de B no aparece en A');

  // --- Providers ---
  console.log('\n  --- Proveedores ---');
  const provsA = await prisma.provider.findMany({ where: { tenantId: TENANT_A_ID } });
  const provsB = await prisma.provider.findMany({ where: { tenantId: TENANT_B_ID } });

  assert(provsA.length === 3, `Tenant A tiene 3 proveedores (got ${provsA.length})`);
  assert(provsB.length === 1, `Tenant B tiene 1 proveedor (got ${provsB.length})`);
  assert(!provsA.some(p => p.name === 'Proveedor Tenant B'), 'Proveedor de B no aparece en A');

  // --- Work Orders ---
  console.log('\n  --- Ordenes de Trabajo ---');
  const woA = await prisma.workOrder.findMany({ where: { tenantId: TENANT_A_ID } });
  const woB = await prisma.workOrder.findMany({ where: { tenantId: TENANT_B_ID } });

  assert(woA.length >= 3, `Tenant A tiene >= 3 OTs (got ${woA.length})`);
  assert(woB.length === 1, `Tenant B tiene 1 OT (got ${woB.length})`);
  assert(!woA.some(w => w.title === 'OT de prueba Tenant B'), 'OT de B no aparece en A');
  assert(!woB.some(w => w.title.includes('Preventivo')), 'OTs preventivas de A no aparecen en B');

  // --- Invoices ---
  console.log('\n  --- Facturas ---');
  const invA = await prisma.invoice.findMany({ where: { tenantId: TENANT_A_ID } });
  const invB = await prisma.invoice.findMany({ where: { tenantId: TENANT_B_ID } });

  assert(invA.length >= 4, `Tenant A tiene >= 4 facturas (got ${invA.length})`);
  assert(invB.length === 1, `Tenant B tiene 1 factura (got ${invB.length})`);
  assert(!invA.some(i => i.invoiceNumber === 'TEST-B-001'), 'Factura de B no aparece en A');

  // --- Maintenance Programs ---
  console.log('\n  --- Programas de Mantenimiento ---');
  const progA = await prisma.vehicleMantProgram.findMany({ where: { tenantId: TENANT_A_ID } });
  const progB = await prisma.vehicleMantProgram.findMany({ where: { tenantId: TENANT_B_ID } });

  assert(progA.length === 3, `Tenant A tiene 3 programas (got ${progA.length})`);
  assert(progB.length === 0, `Tenant B tiene 0 programas (got ${progB.length})`);

  // --- Maintenance Alerts ---
  console.log('\n  --- Alertas de Mantenimiento ---');
  const alertsA = await prisma.maintenanceAlert.findMany({ where: { tenantId: TENANT_A_ID } });
  const alertsB = await prisma.maintenanceAlert.findMany({ where: { tenantId: TENANT_B_ID } });

  assert(alertsA.length >= 1, `Tenant A tiene >= 1 alerta (got ${alertsA.length})`);
  assert(alertsB.length === 0, `Tenant B tiene 0 alertas (got ${alertsB.length})`);
}

// ─── 1.4  Constraints unicos cross-tenant ───────────────────
async function test_1_4_uniqueConstraints() {
  section('1.4 Constraints unicos cross-tenant');

  // Ya probamos que ABC-123 puede existir en ambos tenants (1.2)
  // Ahora probemos que NO se puede duplicar DENTRO del mismo tenant

  const globalBrand = await prisma.vehicleBrand.findFirst({ where: { isGlobal: true, name: 'Ford' } });
  const globalLine = await prisma.vehicleLine.findFirst({ where: { isGlobal: true, name: 'Ranger' } });
  const globalType = await prisma.vehicleType.findFirst({ where: { isGlobal: true, name: 'SUV' } });

  if (!globalBrand || !globalLine || !globalType) {
    assert(false, 'Datos globales necesarios para test de constraints');
    return;
  }

  // Intentar crear vehiculo con placa duplicada en mismo tenant → debe fallar
  let duplicateError = false;
  try {
    await prisma.vehicle.create({
      data: {
        tenantId: TENANT_B_ID,
        licensePlate: 'ZZZ-999', // Ya existe en Tenant B
        brandId: globalBrand.id,
        lineId: globalLine.id,
        typeId: globalType.id,
        year: 2024,
        color: 'Rojo',
        mileage: 0,
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      },
    });
  } catch {
    duplicateError = true;
  }
  assert(duplicateError, 'Placa duplicada en MISMO tenant es rechazada (unique constraint)');

  // Intentar crear usuario con email duplicado en mismo tenant → debe fallar
  let duplicateUserError = false;
  try {
    await prisma.user.create({
      data: {
        tenantId: TENANT_B_ID,
        email: 'owner@test-aislamiento.com', // Ya existe en Tenant B
        firstName: 'Duplicado',
        lastName: 'Test',
        role: 'MANAGER',
      },
    });
  } catch {
    duplicateUserError = true;
  }
  assert(duplicateUserError, 'Email duplicado en MISMO tenant es rechazado (unique constraint)');

  // Mismo email en DIFERENTE tenant → debe funcionar
  let crossTenantEmail = false;
  try {
    const crossUser = await prisma.user.create({
      data: {
        tenantId: TENANT_B_ID,
        email: 'owner@translogistica.co', // Existe en Tenant A, no en B
        firstName: 'Cross',
        lastName: 'Tenant',
        role: 'DRIVER',
      },
    });
    crossTenantEmail = crossUser !== null;
  } catch {
    crossTenantEmail = false;
  }
  assert(crossTenantEmail, 'Mismo email en DIFERENTE tenant es permitido (tenant-scoped unique)');
}

// ─── 1.5  Datos Globales visibles desde ambos tenants ───────
async function test_1_5_globalData() {
  section('1.5 Datos Globales (Knowledge Base) visibles desde ambos tenants');

  // Los datos globales tienen tenantId = null, isGlobal = true
  // Simulamos la query que hacen las APIs: WHERE tenantId = X OR (isGlobal = true AND tenantId IS NULL)

  // Marcas globales
  const brandsForA = await prisma.vehicleBrand.findMany({
    where: {
      OR: [
        { tenantId: TENANT_A_ID },
        { isGlobal: true, tenantId: null },
      ],
      status: 'ACTIVE',
    },
  });
  const brandsForB = await prisma.vehicleBrand.findMany({
    where: {
      OR: [
        { tenantId: TENANT_B_ID },
        { isGlobal: true, tenantId: null },
      ],
      status: 'ACTIVE',
    },
  });

  assert(brandsForA.length >= 5, `Tenant A ve >= 5 marcas globales (got ${brandsForA.length})`);
  assert(brandsForB.length >= 5, `Tenant B ve >= 5 marcas globales (got ${brandsForB.length})`);

  // Ambos ven las mismas marcas globales
  const globalBrandNamesA = brandsForA.filter(b => b.isGlobal).map(b => b.name).sort();
  const globalBrandNamesB = brandsForB.filter(b => b.isGlobal).map(b => b.name).sort();
  assert(
    JSON.stringify(globalBrandNamesA) === JSON.stringify(globalBrandNamesB),
    'Ambos tenants ven las mismas marcas globales',
  );

  // Templates globales
  const templatesForA = await prisma.maintenanceTemplate.findMany({
    where: {
      OR: [
        { tenantId: TENANT_A_ID },
        { isGlobal: true, tenantId: null },
      ],
    },
  });
  const templatesForB = await prisma.maintenanceTemplate.findMany({
    where: {
      OR: [
        { tenantId: TENANT_B_ID },
        { isGlobal: true, tenantId: null },
      ],
    },
  });

  assert(templatesForA.length >= 3, `Tenant A ve >= 3 templates globales (got ${templatesForA.length})`);
  assert(templatesForB.length >= 3, `Tenant B ve >= 3 templates globales (got ${templatesForB.length})`);

  const globalTemplateNamesA = templatesForA.filter(t => t.isGlobal).map(t => t.name).sort();
  const globalTemplateNamesB = templatesForB.filter(t => t.isGlobal).map(t => t.name).sort();
  assert(
    JSON.stringify(globalTemplateNamesA) === JSON.stringify(globalTemplateNamesB),
    'Ambos tenants ven los mismos templates globales',
  );

  // Items de mantenimiento globales
  const itemsGlobal = await prisma.mantItem.findMany({
    where: { isGlobal: true, tenantId: null },
  });
  assert(itemsGlobal.length >= 17, `Existen >= 17 items de mantenimiento globales (got ${itemsGlobal.length})`);

  // Categorias globales
  const catsGlobal = await prisma.mantCategory.findMany({
    where: { isGlobal: true, tenantId: null },
  });
  assert(catsGlobal.length >= 9, `Existen >= 9 categorias globales (got ${catsGlobal.length})`);
}

// ─── Cleanup ─────────────────────────────────────────────────
async function cleanupTenantB() {
  // Orden inverso de dependencias FK
  try {
    await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId: TENANT_B_ID } } });
    await prisma.invoice.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.workOrderItem.deleteMany({ where: { workOrder: { tenantId: TENANT_B_ID } } });
    await prisma.workOrder.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.maintenanceAlert.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.vehicleProgramItem.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.vehicleProgramPackage.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.vehicleMantProgram.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.vehicleDriver.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.vehicle.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.driver.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.technician.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.provider.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.user.deleteMany({ where: { tenantId: TENANT_B_ID } });
    await prisma.tenant.deleteMany({ where: { id: TENANT_B_ID } });
  } catch {
    // Puede fallar si no existen datos, es ok
  }
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log('\n');
  console.log('############################################################');
  console.log('#  CIRCUITO 1: Multi-tenancy y Aislamiento                 #');
  console.log('#  Fleet Care SaaS - Test Automatizado                     #');
  console.log('############################################################');
  console.log(`\nTenant A: ${TENANT_A_ID}`);
  console.log(`Tenant B: ${TENANT_B_ID} (se crea y elimina durante el test)\n`);

  try {
    await test_1_1_seedData();
    await test_1_2_createTenantB();
    await test_1_3_isolation();
    await test_1_4_uniqueConstraints();
    await test_1_5_globalData();
  } catch (error) {
    console.error('\n[ERROR FATAL]', error);
    failed++;
    failures.push(`Error fatal: ${error}`);
  }

  // Cleanup
  section('Cleanup');
  await cleanupTenantB();
  const tenantBAfter = await prisma.tenant.findUnique({ where: { id: TENANT_B_ID } });
  assert(tenantBAfter === null, 'Tenant B eliminado correctamente tras las pruebas');

  // Resumen
  console.log('\n');
  console.log('############################################################');
  console.log('#  RESUMEN                                                  #');
  console.log('############################################################');
  console.log(`\n  Total tests:  ${passed + failed}`);
  console.log(`  Passed:       ${passed}`);
  console.log(`  Failed:       ${failed}`);

  if (failures.length > 0) {
    console.log('\n  Fallos:');
    failures.forEach(f => console.log(`    - ${f}`));
  }

  console.log(`\n  Resultado: ${failed === 0 ? 'TODOS LOS TESTS PASARON' : 'HAY FALLOS'}`);
  console.log('');

  process.exit(failed === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error('Error critico:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
