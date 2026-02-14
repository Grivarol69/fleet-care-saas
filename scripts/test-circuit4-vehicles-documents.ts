/**
 * ============================================================
 * CIRCUITO 4: Vehículos, DocumentTypeConfig, Documentos y Odómetro
 * ============================================================
 *
 * Ejecutar: npx tsx scripts/test-circuit4-vehicles-documents.ts
 *
 * NO requiere dev server. Trabaja directo con Prisma.
 *
 * Verifica:
 *   4.1 Tablas maestras: Brands, Lines, Types (globales + tenant)
 *   4.2 CRUD de vehículos con constraints
 *   4.3 DocumentTypeConfig (nueva estructura dinámica)
 *   4.4 CRUD de documentos vinculados a DocumentTypeConfig
 *   4.5 Lógica de documentos por vencer (expiring)
 *   4.6 Registro de odómetro + actualización del vehículo
 *   4.7 Cleanup
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ─── Setup ─────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TENANT_ID = 'org_36M1mCUcHm4ShrsTQQK3etw9FEk';

// ─── Counters ──────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

// IDs para cleanup
const cleanup: {
  vehicleId?: number;
  documentId?: string;
  documentTypeId?: number;
  odometerId?: number;
  document2Id?: string;
} = {};

// ─── Helpers ───────────────────────────────────────────────
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

// ─── 4.1 Tablas Maestras ──────────────────────────────────
async function test_4_1_masterTables() {
  section('4.1 Tablas Maestras (Brands, Lines, Types)');

  // Marcas globales
  const globalBrands = await prisma.vehicleBrand.findMany({
    where: { isGlobal: true, tenantId: null, status: 'ACTIVE' },
  });
  assert(
    globalBrands.length >= 5,
    `>= 5 marcas globales (got ${globalBrands.length})`
  );

  const brandNames = globalBrands.map(b => b.name);
  assert(brandNames.includes('Toyota'), 'Existe marca Toyota');
  assert(brandNames.includes('Chevrolet'), 'Existe marca Chevrolet');
  assert(brandNames.includes('Ford'), 'Existe marca Ford');

  // Marcas visibles para el tenant (globales + propias)
  const tenantBrands = await prisma.vehicleBrand.findMany({
    where: {
      OR: [{ tenantId: TENANT_ID }, { isGlobal: true, tenantId: null }],
      status: 'ACTIVE',
    },
  });
  assert(
    tenantBrands.length >= 5,
    `Tenant ve >= 5 marcas (got ${tenantBrands.length})`
  );

  // Líneas globales
  const globalLines = await prisma.vehicleLine.findMany({
    where: { isGlobal: true, tenantId: null, status: 'ACTIVE' },
    include: { brand: true },
  });
  assert(
    globalLines.length >= 5,
    `>= 5 líneas globales (got ${globalLines.length})`
  );

  // Verificar que cada línea tiene marca asociada
  const allLinesHaveBrand = globalLines.every(l => l.brand !== null);
  assert(allLinesHaveBrand, 'Todas las líneas globales tienen marca');

  // Tipos globales
  const globalTypes = await prisma.vehicleType.findMany({
    where: { isGlobal: true, tenantId: null, status: 'ACTIVE' },
  });
  assert(
    globalTypes.length >= 3,
    `>= 3 tipos globales (got ${globalTypes.length})`
  );

  const typeNames = globalTypes.map(t => t.name);
  assert(typeNames.includes('Camioneta 4x4'), 'Existe tipo Camioneta 4x4');
  assert(typeNames.includes('SUV'), 'Existe tipo SUV');
}

// ─── 4.2 CRUD Vehículos ──────────────────────────────────
async function test_4_2_vehicles() {
  section('4.2 CRUD de Vehículos');

  // Vehículos existentes del seed
  const existing = await prisma.vehicle.findMany({
    where: { tenantId: TENANT_ID, status: 'ACTIVE' },
    include: { brand: true, line: true, type: true },
  });
  assert(
    existing.length >= 8,
    `Tenant tiene >= 8 vehículos activos (got ${existing.length})`
  );

  // Verificar relaciones
  const v1 = existing[0];
  if (v1) {
    assert(v1.brand !== null, 'Vehículo tiene relación brand');
    assert(v1.line !== null, 'Vehículo tiene relación line');
    assert(v1.type !== null, 'Vehículo tiene relación type');
    assert(
      v1.licensePlate.length > 0,
      `Vehículo tiene placa: ${v1.licensePlate}`
    );
  }

  // Crear vehículo de prueba
  const toyota = await prisma.vehicleBrand.findFirst({
    where: { isGlobal: true, name: 'Toyota' },
  });
  const hilux = await prisma.vehicleLine.findFirst({
    where: { isGlobal: true, name: 'Hilux' },
  });
  const suv = await prisma.vehicleType.findFirst({
    where: { isGlobal: true, name: 'SUV' },
  });

  if (toyota && hilux && suv) {
    const testVehicle = await prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        licensePlate: 'C4-TEST-001',
        brandId: toyota.id,
        lineId: hilux.id,
        typeId: suv.id,
        year: 2024,
        color: 'Azul Test',
        mileage: 10000,
        status: 'ACTIVE',
        situation: 'AVAILABLE',
        owner: 'OWN',
        typePlate: 'PARTICULAR',
      },
    });
    cleanup.vehicleId = testVehicle.id;
    assert(
      testVehicle !== null,
      `Vehículo C4-TEST-001 creado (id: ${testVehicle.id})`
    );
    assert(
      testVehicle.mileage === 10000,
      'Kilometraje inicial correcto: 10000'
    );

    // Actualizar color
    const updated = await prisma.vehicle.update({
      where: { id: testVehicle.id },
      data: { color: 'Rojo Actualizado' },
    });
    assert(updated.color === 'Rojo Actualizado', 'Update de color correcto');

    // Placa duplicada en mismo tenant → error
    let dupError = false;
    try {
      await prisma.vehicle.create({
        data: {
          tenantId: TENANT_ID,
          licensePlate: 'C4-TEST-001',
          brandId: toyota.id,
          lineId: hilux.id,
          typeId: suv.id,
          year: 2025,
          color: 'Negro',
          mileage: 0,
          status: 'ACTIVE',
          situation: 'AVAILABLE',
          owner: 'OWN',
          typePlate: 'PARTICULAR',
        },
      });
    } catch {
      dupError = true;
    }
    assert(dupError, 'Placa duplicada en mismo tenant rechazada');

    // GET individual con relaciones
    const fetched = await prisma.vehicle.findUnique({
      where: { id: testVehicle.id },
      include: { brand: true, line: true, type: true },
    });
    assert(fetched !== null, 'GET individual retorna el vehículo');
    assert(fetched?.brand.name === 'Toyota', 'Relación brand cargada: Toyota');
    assert(fetched?.line.name === 'Hilux', 'Relación line cargada: Hilux');
  } else {
    assert(false, 'Datos globales necesarios para crear vehículo');
  }
}

// ─── 4.3 DocumentTypeConfig ──────────────────────────────
async function test_4_3_documentTypeConfig() {
  section('4.3 DocumentTypeConfig (Tipos de Documento Dinámicos)');

  // Tipos globales de Colombia
  const globalTypes = await prisma.documentTypeConfig.findMany({
    where: {
      isGlobal: true,
      tenantId: null,
      countryCode: 'CO',
      status: 'ACTIVE',
    },
    orderBy: { sortOrder: 'asc' },
  });
  assert(
    globalTypes.length >= 5,
    `>= 5 tipos globales CO (got ${globalTypes.length})`
  );

  const codes = globalTypes.map(t => t.code);
  assert(codes.includes('SOAT'), 'Existe SOAT');
  assert(codes.includes('TECNOMECANICA'), 'Existe TECNOMECANICA');
  assert(codes.includes('INSURANCE'), 'Existe INSURANCE');
  assert(codes.includes('REGISTRATION'), 'Existe REGISTRATION');
  assert(codes.includes('OTHER'), 'Existe OTHER');

  // Verificar campos del SOAT
  const soat = globalTypes.find(t => t.code === 'SOAT');
  if (soat) {
    assert(soat.requiresExpiry === true, 'SOAT requiresExpiry = true');
    assert(soat.isMandatory === true, 'SOAT isMandatory = true');
    assert(soat.expiryWarningDays === 30, 'SOAT expiryWarningDays = 30');
    assert(soat.expiryCriticalDays === 7, 'SOAT expiryCriticalDays = 7');
  }

  // REGISTRATION no requiere vencimiento
  const reg = globalTypes.find(t => t.code === 'REGISTRATION');
  if (reg) {
    assert(reg.requiresExpiry === false, 'REGISTRATION requiresExpiry = false');
    assert(reg.isMandatory === true, 'REGISTRATION isMandatory = true');
  }

  // TECNOMECANICA tiene umbrales distintos
  const tecno = globalTypes.find(t => t.code === 'TECNOMECANICA');
  if (tecno) {
    assert(tecno.expiryWarningDays === 45, 'TECNOMECANICA warning = 45 días');
    assert(tecno.expiryCriticalDays === 15, 'TECNOMECANICA critical = 15 días');
  }

  // Crear tipo custom del tenant
  const customType = await prisma.documentTypeConfig.create({
    data: {
      tenantId: TENANT_ID,
      isGlobal: false,
      countryCode: 'CO',
      code: 'TEST_EXTINTOR',
      name: 'Certificado Extintor (Test)',
      description: 'Test del circuito 4',
      requiresExpiry: true,
      isMandatory: false,
      expiryWarningDays: 15,
      expiryCriticalDays: 5,
      sortOrder: 99,
    },
  });
  cleanup.documentTypeId = customType.id;
  assert(
    customType !== null,
    `Tipo custom TEST_EXTINTOR creado (id: ${customType.id})`
  );
  assert(customType.isGlobal === false, 'Tipo custom no es global');
  assert(customType.tenantId === TENANT_ID, 'Tipo custom pertenece al tenant');

  // Consulta que simula lo que hace la API: globales del país + custom del tenant
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const countryCode = tenant?.country || 'CO';

  const allTypesForTenant = await prisma.documentTypeConfig.findMany({
    where: {
      OR: [
        { isGlobal: true, countryCode, status: 'ACTIVE' },
        { tenantId: TENANT_ID, status: 'ACTIVE' },
      ],
    },
    orderBy: { sortOrder: 'asc' },
  });
  assert(
    allTypesForTenant.length >= 6,
    `Tenant ve >= 6 tipos (5 globales + 1 custom) (got ${allTypesForTenant.length})`
  );

  const hasBoth =
    allTypesForTenant.some(t => t.isGlobal) &&
    allTypesForTenant.some(t => !t.isGlobal);
  assert(hasBoth, 'Lista combina tipos globales + custom del tenant');

  // Unique constraint: no duplicar código en mismo tenant
  let dupCodeError = false;
  try {
    await prisma.documentTypeConfig.create({
      data: {
        tenantId: TENANT_ID,
        isGlobal: false,
        countryCode: 'CO',
        code: 'TEST_EXTINTOR', // Ya existe
        name: 'Duplicado',
      },
    });
  } catch {
    dupCodeError = true;
  }
  assert(dupCodeError, 'Código duplicado en mismo tenant rechazado');
}

// ─── 4.4 Documentos de Vehículo ─────────────────────────
async function test_4_4_documents() {
  section('4.4 CRUD de Documentos (vinculados a DocumentTypeConfig)');

  if (!cleanup.vehicleId) {
    console.log('  [SKIP] No hay vehículo de prueba');
    return;
  }

  // Obtener IDs de tipos de documento
  const soat = await prisma.documentTypeConfig.findFirst({
    where: { isGlobal: true, code: 'SOAT', status: 'ACTIVE' },
  });
  assert(soat !== null, 'Tipo SOAT encontrado para crear documento');
  if (!soat) return;

  // Crear documento SOAT con vencimiento en 20 días
  const expiryIn20 = new Date();
  expiryIn20.setDate(expiryIn20.getDate() + 20);

  const doc1 = await prisma.document.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: cleanup.vehicleId,
      documentTypeId: soat.id,
      fileName: 'soat-test-c4.pdf',
      fileUrl: 'https://utfs.io/f/test-soat-c4.pdf',
      documentNumber: 'SOAT-C4-2026-001',
      entity: 'SURA Test',
      expiryDate: expiryIn20,
      status: 'ACTIVE',
    },
    include: { documentType: true },
  });
  cleanup.documentId = doc1.id;
  assert(doc1 !== null, `Documento SOAT creado (id: ${doc1.id})`);
  assert(
    doc1.documentType.code === 'SOAT',
    'Relación documentType cargada: SOAT'
  );
  assert(
    doc1.documentNumber === 'SOAT-C4-2026-001',
    'Número de documento correcto'
  );
  assert(doc1.entity === 'SURA Test', 'Entidad emisora correcta');

  // Crear documento con tipo custom
  if (cleanup.documentTypeId) {
    const expiryIn3 = new Date();
    expiryIn3.setDate(expiryIn3.getDate() + 3); // 3 días → critical

    const doc2 = await prisma.document.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId: cleanup.vehicleId,
        documentTypeId: cleanup.documentTypeId,
        fileName: 'extintor-test.pdf',
        fileUrl: 'https://utfs.io/f/test-extintor.pdf',
        documentNumber: 'EXT-C4-001',
        entity: 'Bomberos Test',
        expiryDate: expiryIn3,
        status: 'ACTIVE',
      },
      include: { documentType: true },
    });
    cleanup.document2Id = doc2.id;
    assert(
      doc2.documentType.code === 'TEST_EXTINTOR',
      'Documento con tipo custom vinculado correctamente'
    );
  }

  // Crear documento REGISTRATION (sin vencimiento)
  const registration = await prisma.documentTypeConfig.findFirst({
    where: { isGlobal: true, code: 'REGISTRATION', status: 'ACTIVE' },
  });
  if (registration) {
    const doc3 = await prisma.document.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId: cleanup.vehicleId,
        documentTypeId: registration.id,
        fileName: 'tarjeta-propiedad.pdf',
        fileUrl: 'https://utfs.io/f/test-registration.pdf',
        documentNumber: 'TP-C4-001',
        entity: 'Tránsito Test',
        expiryDate: null, // Sin vencimiento
        status: 'ACTIVE',
      },
      include: { documentType: true },
    });
    assert(
      doc3.expiryDate === null,
      'REGISTRATION creado sin fecha de vencimiento'
    );
    assert(
      doc3.documentType.requiresExpiry === false,
      'Tipo REGISTRATION no requiere vencimiento'
    );
    // Eliminar inmediatamente
    await prisma.document.delete({ where: { id: doc3.id } });
    assert(true, 'REGISTRATION eliminado (hard delete)');
  }

  // Listar documentos del vehículo
  const vehicleDocs = await prisma.document.findMany({
    where: { tenantId: TENANT_ID, vehicleId: cleanup.vehicleId },
    include: { documentType: true },
    orderBy: { createdAt: 'desc' },
  });
  assert(
    vehicleDocs.length >= 2,
    `Vehículo tiene >= 2 documentos (got ${vehicleDocs.length})`
  );

  // Todos los documentos tienen documentType cargado
  const allHaveType = vehicleDocs.every(d => d.documentType !== null);
  assert(allHaveType, 'Todos los documentos tienen documentType');

  // Update de documento
  const updated = await prisma.document.update({
    where: { id: doc1.id },
    data: {
      entity: 'Seguros Bolívar Test',
      documentNumber: 'SOAT-C4-2026-002',
    },
  });
  assert(
    updated.entity === 'Seguros Bolívar Test',
    'Update de entidad exitoso'
  );
  assert(
    updated.documentNumber === 'SOAT-C4-2026-002',
    'Update de número exitoso'
  );
}

// ─── 4.5 Documentos por vencer (lógica expiring) ────────
async function test_4_5_expiring() {
  section('4.5 Lógica de Documentos por Vencer');

  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  // Simular la query del endpoint /api/vehicles/documents/expiring
  const expiringDocs = await prisma.document.findMany({
    where: {
      tenantId: TENANT_ID,
      expiryDate: { lte: sixtyDaysFromNow },
    },
    include: {
      vehicle: true,
      documentType: true,
    },
    orderBy: { expiryDate: 'asc' },
  });

  assert(
    expiringDocs.length >= 1,
    `>= 1 documento por vencer (got ${expiringDocs.length})`
  );

  // Verificar la lógica de semaforización
  let dangerCount = 0;
  let warningCount = 0;
  let successCount = 0;

  for (const doc of expiringDocs) {
    if (!doc.expiryDate) continue;

    const daysLeft = Math.floor(
      (doc.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const criticalDays = doc.documentType.expiryCriticalDays;
    const warningDays = doc.documentType.expiryWarningDays;

    let status: string;
    if (daysLeft < 0) {
      status = 'danger';
      dangerCount++;
    } else if (daysLeft <= criticalDays) {
      status = 'danger';
      dangerCount++;
    } else if (daysLeft <= warningDays) {
      status = 'warning';
      warningCount++;
    } else {
      status = 'success';
      successCount++;
    }

    console.log(
      `    ${doc.vehicle.licensePlate} | ${doc.documentType.name} | ${daysLeft} días | ${status}`
    );
  }

  console.log(
    `    → danger: ${dangerCount}, warning: ${warningCount}, success: ${successCount}`
  );

  // El documento extintor (3 días) debería ser critical (expiryCriticalDays=5)
  if (cleanup.document2Id) {
    const extDoc = expiringDocs.find(d => d.id === cleanup.document2Id);
    if (extDoc && extDoc.expiryDate) {
      const daysLeft = Math.floor(
        (extDoc.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      assert(
        daysLeft <= extDoc.documentType.expiryCriticalDays,
        `Extintor (${daysLeft} días) está en rango critical (<= ${extDoc.documentType.expiryCriticalDays})`
      );
    }
  }

  // El documento SOAT (20 días) debería ser warning (expiryWarningDays=30, criticalDays=7)
  if (cleanup.documentId) {
    const soatDoc = expiringDocs.find(d => d.id === cleanup.documentId);
    if (soatDoc && soatDoc.expiryDate) {
      const daysLeft = Math.floor(
        (soatDoc.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      const isWarning =
        daysLeft > soatDoc.documentType.expiryCriticalDays &&
        daysLeft <= soatDoc.documentType.expiryWarningDays;
      assert(
        isWarning,
        `SOAT (${daysLeft} días) está en rango warning (> ${soatDoc.documentType.expiryCriticalDays}, <= ${soatDoc.documentType.expiryWarningDays})`
      );
    }
  }

  // Estadísticas (simular POST /expiring)
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const criticalCount = await prisma.document.count({
    where: { tenantId: TENANT_ID, expiryDate: { lte: sevenDays } },
  });
  const warningCountDB = await prisma.document.count({
    where: {
      tenantId: TENANT_ID,
      expiryDate: { gt: sevenDays, lte: thirtyDays },
    },
  });
  const totalCount = await prisma.document.count({
    where: { tenantId: TENANT_ID },
  });

  assert(typeof criticalCount === 'number', `Stats critical: ${criticalCount}`);
  assert(
    typeof warningCountDB === 'number',
    `Stats warning: ${warningCountDB}`
  );
  assert(totalCount >= 2, `Total docs del tenant: ${totalCount}`);
}

// ─── 4.6 Odómetro ─────────────────────────────────────────
async function test_4_6_odometer() {
  section('4.6 Registro de Odómetro');

  if (!cleanup.vehicleId) {
    console.log('  [SKIP] No hay vehículo de prueba');
    return;
  }

  // Registrar lectura
  const log1 = await prisma.odometerLog.create({
    data: {
      vehicleId: cleanup.vehicleId,
      kilometers: 10500,
      measureType: 'KILOMETERS',
      recordedAt: new Date(),
    },
  });
  cleanup.odometerId = log1.id;
  assert(log1 !== null, `Lectura registrada (id: ${log1.id}, km: 10500)`);

  // Actualizar el vehículo (simular lo que hace la API)
  await prisma.vehicle.update({
    where: { id: cleanup.vehicleId },
    data: {
      mileage: 10500,
      lastKilometers: 10500,
      lastRecorder: new Date(),
    },
  });

  const updatedVehicle = await prisma.vehicle.findUnique({
    where: { id: cleanup.vehicleId },
  });
  assert(
    updatedVehicle?.mileage === 10500,
    'Vehículo actualizó mileage a 10500'
  );
  assert(
    updatedVehicle?.lastKilometers === 10500,
    'Vehículo actualizó lastKilometers'
  );

  // Segunda lectura mayor
  const log2 = await prisma.odometerLog.create({
    data: {
      vehicleId: cleanup.vehicleId,
      kilometers: 11000,
      measureType: 'KILOMETERS',
      recordedAt: new Date(),
    },
  });
  assert(log2.kilometers === 11000, 'Segunda lectura: 11000 km');

  // Historial del vehículo
  const history = await prisma.odometerLog.findMany({
    where: { vehicleId: cleanup.vehicleId },
    orderBy: { recordedAt: 'desc' },
  });
  assert(
    history.length >= 2,
    `Historial tiene >= 2 lecturas (got ${history.length})`
  );
  assert(
    (history[0]?.kilometers ?? 0) >= (history[1]?.kilometers ?? 0),
    'Historial ordenado por fecha desc (más reciente primero)'
  );

  // Cleanup segunda lectura
  await prisma.odometerLog.delete({ where: { id: log2.id } });

  // Lectura con driver
  const driver = await prisma.driver.findFirst({
    where: { tenantId: TENANT_ID, status: 'ACTIVE' },
  });
  if (driver) {
    const logWithDriver = await prisma.odometerLog.create({
      data: {
        vehicleId: cleanup.vehicleId,
        driverId: driver.id,
        kilometers: 11500,
        measureType: 'KILOMETERS',
        recordedAt: new Date(),
      },
    });
    assert(
      logWithDriver.driverId === driver.id,
      `Lectura con conductor (${driver.name})`
    );
    await prisma.odometerLog.delete({ where: { id: logWithDriver.id } });
  }
}

// ─── Cleanup ──────────────────────────────────────────────
async function doCleanup() {
  section('4.7 Cleanup');

  try {
    if (cleanup.document2Id) {
      await prisma.document.delete({ where: { id: cleanup.document2Id } });
      assert(true, 'Documento extintor eliminado');
    }

    if (cleanup.documentId) {
      await prisma.document.delete({ where: { id: cleanup.documentId } });
      assert(true, 'Documento SOAT eliminado');
    }

    if (cleanup.documentTypeId) {
      await prisma.documentTypeConfig.delete({
        where: { id: cleanup.documentTypeId },
      });
      assert(true, 'Tipo custom TEST_EXTINTOR eliminado');
    }

    if (cleanup.odometerId) {
      await prisma.odometerLog.delete({ where: { id: cleanup.odometerId } });
      assert(true, 'Lectura odómetro eliminada');
    }

    if (cleanup.vehicleId) {
      await prisma.vehicle.delete({ where: { id: cleanup.vehicleId } });
      assert(true, 'Vehículo C4-TEST-001 eliminado');
    }
  } catch (error) {
    console.log(`  [WARN] Error en cleanup: ${error}`);
  }

  // Verificar que no queda nada
  const leftover = await prisma.vehicle.findFirst({
    where: { tenantId: TENANT_ID, licensePlate: 'C4-TEST-001' },
  });
  assert(leftover === null, 'No quedan datos de prueba del circuito 4');
}

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log('\n');
  console.log('############################################################');
  console.log('#  CIRCUITO 4: Vehículos, Documentos y Odómetro           #');
  console.log('#  Fleet Care SaaS - Test Automatizado (Prisma Directo)   #');
  console.log('############################################################');
  console.log(`\nTenant: ${TENANT_ID}`);
  console.log(`Fecha: ${new Date().toLocaleString('es-CO')}\n`);

  try {
    await test_4_1_masterTables();
    await test_4_2_vehicles();
    await test_4_3_documentTypeConfig();
    await test_4_4_documents();
    await test_4_5_expiring();
    await test_4_6_odometer();
  } catch (error) {
    console.error('\n[ERROR FATAL]', error);
    failed++;
    failures.push(`Error fatal: ${error}`);
  }

  await doCleanup();

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

  console.log(
    `\n  Resultado: ${failed === 0 ? 'TODOS LOS TESTS PASARON' : 'HAY FALLOS'}`
  );
  console.log('');

  process.exit(failed === 0 ? 0 : 1);
}

main()
  .catch(e => {
    console.error('Error crítico:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
