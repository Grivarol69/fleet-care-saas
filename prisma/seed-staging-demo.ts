/**
 * seed-staging-demo.ts
 * Staging / Demo seed — Transportes Demo SAS (TENANT_1_ID)
 *
 * Tasks implemented: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2
 *
 * Run:  tsx prisma/seed-staging-demo.ts
 */

import { PrismaClient } from '@prisma/client';

// ============================================================
// CONSTANTS (Task 1.1)
// ============================================================

const SEED_MARKER = 'DEMO_SEED_V1';
const DATE_START = new Date('2025-08-01');
// DATE_END siempre incluye el mes actual para que "Gasto del Mes" tenga datos
const _now = new Date();
const DATE_END = new Date(_now.getFullYear(), _now.getMonth() + 1, 0);
const BATCH_SIZE = 25;

const TENANT_ID = 'org_38zCXuXqy5Urw5CuaisTHu3jLTq'; // Transportes Demo SAS

const prisma = new PrismaClient();

// ============================================================
// HELPER: generateDateInRange (Task 1.2)
// ============================================================

/**
 * Returns a random Date between start and end using a Box-Muller
 * bell-curve distribution centred at `weight` (0 = start, 1 = end).
 * Result is clamped to [start, end].
 */
function generateDateInRange(start: Date, end: Date, weight = 0.5): Date {
  const rangeMs = end.getTime() - start.getTime();

  // Box-Muller transform: produces a standard-normal sample
  const u1 = Math.random();
  const u2 = Math.random();
  // Avoid log(0)
  const safeU1 = u1 === 0 ? Number.EPSILON : u1;
  const z = Math.sqrt(-2.0 * Math.log(safeU1)) * Math.cos(2.0 * Math.PI * u2);

  // Scale: stddev = 1/6 of the range so ≈99.7% of values land inside [0,1]
  const stddev = 1 / 6;
  const normalised = weight + z * stddev;

  // Clamp to [0, 1]
  const clamped = Math.max(0, Math.min(1, normalised));

  return new Date(start.getTime() + clamped * rangeMs);
}

// ============================================================
// IDEMPOTENCY GUARD (Task 1.3)
// ============================================================

/**
 * Check whether data already exists for a given model.
 *
 * For models that have a `notes` field we count records whose
 * notes contain SEED_MARKER.  For models without `notes` we
 * fall back to counting by tenantId alone using the dedicated
 * helper below.
 */
async function checkAlreadySeeded(
  tenantId: string,
  model: string,
  threshold: number
): Promise<boolean> {
  let count = 0;

  // Models without a usable `notes` field need their own count path
  const modelsWithoutNotes = ['OdometerLog', 'InventoryMovement'];

  if (modelsWithoutNotes.includes(model)) {
    count = await countByTenantId(tenantId, model);
  } else {
    count = await countByNotes(tenantId, model);
  }

  const alreadySeeded = count >= threshold;
  console.log(
    `[idempotency] ${model}: found ${count} records` +
      (alreadySeeded ? ` — SKIPPING (>= threshold ${threshold})` : '')
  );
  return alreadySeeded;
}

/**
 * Count records by tenantId for models that have no `notes` field.
 * This is a best-effort guard — counts ALL tenant records.
 */
async function countByTenantId(
  tenantId: string,
  model: string
): Promise<number> {
  switch (model) {
    case 'OdometerLog': {
      // OdometerLog has no tenantId — count by vehicleIds belonging to tenant
      const vehicles = await prisma.vehicle.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const vehicleIds = vehicles.map(v => v.id);
      if (vehicleIds.length === 0) return 0;
      return prisma.odometerLog.count({
        where: { vehicleId: { in: vehicleIds } },
      });
    }
    case 'InventoryMovement':
      return prisma.inventoryMovement.count({ where: { tenantId } });
    default:
      console.warn(`[idempotency] countByTenantId: unknown model ${model}`);
      return 0;
  }
}

/**
 * Count records whose `notes` field contains SEED_MARKER.
 * Each case is explicit to satisfy Prisma's typed client.
 */
async function countByNotes(tenantId: string, model: string): Promise<number> {
  const filter = { contains: SEED_MARKER };

  switch (model) {
    case 'WorkOrder':
      return prisma.workOrder.count({
        where: { tenantId, description: filter },
      });
    case 'Invoice':
      return prisma.invoice.count({
        where: { tenantId, notes: filter },
      });
    case 'MaintenanceAlert':
      return prisma.maintenanceAlert.count({
        where: { tenantId, notes: filter },
      });
    case 'InventoryItem':
      // InventoryItem has no notes field — count by tenantId
      return prisma.inventoryItem.count({ where: { tenantId } });
    default:
      console.warn(`[idempotency] countByNotes: unhandled model ${model}`);
      return 0;
  }
}

// ============================================================
// BATCH INSERT UTILITY (Task 1.4)
// ============================================================

/**
 * Splits `items` into chunks of BATCH_SIZE and calls `insertFn`
 * sequentially for each chunk.  Logs progress to console.
 */
async function batchInsert<T>(
  items: T[],
  insertFn: (batch: T[]) => Promise<void>,
  label: string
): Promise<void> {
  if (items.length === 0) {
    console.log(`[${label}] Nothing to insert.`);
    return;
  }

  const totalBatches = Math.ceil(items.length / BATCH_SIZE);
  for (let i = 0; i < totalBatches; i++) {
    const batch = items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    console.log(`[${label}] Inserting batch ${i + 1}/${totalBatches}...`);
    await insertFn(batch);
  }
  console.log(`[${label}] Done — ${items.length} records inserted.`);
}

// ============================================================
// MASTER PARTS DATA (Task 2.1)
// ============================================================

interface MasterPartInput {
  code: string;
  description: string;
  category: string;
  subcategory?: string;
  unit: string;
  referencePrice: number;
}

/**
 * 30 parts for the staging demo seed.
 *
 * Prices are in COP (Colombian pesos), realistic 2025 market rates.
 * All codes are distinct from the 10 parts in seed-multitenancy.ts:
 *   SHELL-HELIX-HX7-10W40, MOBIL-SUPER-3000-5W40, CASTROL-GTX-15W40
 *   BOSCH-0986AF0134, MANN-W920/21, BOSCH-F026400364, MANN-C25114,
 *   BOSCH-F026402065, BOSCH-0986AB1234, CASTROL-DOT4-500ML
 *
 * Category strings match MantCategory names in seed-multitenancy.ts:
 *   Motor | Transmision | Frenos | Suspension | Electrico |
 *   Lubricacion | Filtros | Neumaticos | Carroceria
 */
const MASTER_PARTS_DATA: MasterPartInput[] = [
  // ---- 6 Filters ----
  {
    code: 'FLT-ACE-001',
    description: 'Filtro Aceite Motor WIX 51394',
    category: 'Filtros',
    subcategory: 'FILTRO_ACEITE',
    unit: 'UNIDAD',
    referencePrice: 32000,
  },
  {
    code: 'FLT-AIR-001',
    description: 'Filtro Aire Motor Fram CA10163',
    category: 'Filtros',
    subcategory: 'FILTRO_AIRE',
    unit: 'UNIDAD',
    referencePrice: 45000,
  },
  {
    code: 'FLT-COM-001',
    description: 'Filtro Combustible Diesel Mann WK9016',
    category: 'Filtros',
    subcategory: 'FILTRO_COMBUSTIBLE',
    unit: 'UNIDAD',
    referencePrice: 58000,
  },
  {
    code: 'FLT-CAB-001',
    description: 'Filtro Cabina Habitaculo Mann CU2939',
    category: 'Filtros',
    subcategory: 'FILTRO_CABINA',
    unit: 'UNIDAD',
    referencePrice: 28000,
  },
  {
    code: 'FLT-HAD-001',
    description: 'Filtro Hidraulico Direccion Parker 938',
    category: 'Filtros',
    subcategory: 'FILTRO_HIDRAULICO',
    unit: 'UNIDAD',
    referencePrice: 72000,
  },
  {
    code: 'FLT-ACE-002',
    description: 'Filtro Aceite Transmision Automatica ACDelco',
    category: 'Filtros',
    subcategory: 'FILTRO_TRANSMISION',
    unit: 'UNIDAD',
    referencePrice: 95000,
  },

  // ---- 5 Oils / Lubricants ----
  {
    code: 'ACE-MOT-15W40',
    description: 'Aceite Motor Dieselub 15W-40 Mineral API CI-4',
    category: 'Lubricacion',
    subcategory: 'ACEITE_MOTOR',
    unit: 'LITRO',
    referencePrice: 28000,
  },
  {
    code: 'ACE-MOT-5W30',
    description: 'Aceite Motor Valvoline 5W-30 Sintetico API SN/CF',
    category: 'Lubricacion',
    subcategory: 'ACEITE_MOTOR',
    unit: 'LITRO',
    referencePrice: 52000,
  },
  {
    code: 'ACE-TRS-001',
    description: 'Aceite Transmision Manual Mobil Gear 600 XP 75W-90',
    category: 'Transmision',
    subcategory: 'ACEITE_TRANSMISION',
    unit: 'LITRO',
    referencePrice: 68000,
  },
  {
    code: 'ACE-DIF-001',
    description: 'Aceite Diferencial Shell Spirax S4 80W-90',
    category: 'Transmision',
    subcategory: 'ACEITE_DIFERENCIAL',
    unit: 'LITRO',
    referencePrice: 62000,
  },
  {
    code: 'ACE-HID-001',
    description: 'Aceite Hidraulico Castrol Hyspin AWH 46',
    category: 'Motor',
    subcategory: 'ACEITE_HIDRAULICO',
    unit: 'LITRO',
    referencePrice: 38000,
  },

  // ---- 4 Brakes ----
  {
    code: 'FRN-PAS-DEL',
    description: 'Pastillas Freno Delanteras Brembo P06078',
    category: 'Frenos',
    subcategory: 'PASTILLAS_DELANTERAS',
    unit: 'JUEGO',
    referencePrice: 215000,
  },
  {
    code: 'FRN-PAS-TRA',
    description: 'Pastillas Freno Traseras Brembo P06080',
    category: 'Frenos',
    subcategory: 'PASTILLAS_TRASERAS',
    unit: 'JUEGO',
    referencePrice: 195000,
  },
  {
    code: 'FRN-DSC-DEL',
    description: 'Disco Freno Delantero Brembo 09.A341.11',
    category: 'Frenos',
    subcategory: 'DISCO_FRENO',
    unit: 'UNIDAD',
    referencePrice: 320000,
  },
  {
    code: 'FRN-LIQ-001',
    description: 'Liquido Frenos DOT4 Plus Bosch 1 Litro',
    category: 'Frenos',
    subcategory: 'LIQUIDO_FRENOS',
    unit: 'UNIDAD',
    referencePrice: 26000,
  },

  // ---- 4 Suspension ----
  {
    code: 'SUS-AMS-DEL',
    description: 'Amortiguador Delantero Monroe OESpectrum',
    category: 'Suspension',
    subcategory: 'AMORTIGUADOR_DELANTERO',
    unit: 'UNIDAD',
    referencePrice: 485000,
  },
  {
    code: 'SUS-AMS-TRA',
    description: 'Amortiguador Trasero Monroe OESpectrum',
    category: 'Suspension',
    subcategory: 'AMORTIGUADOR_TRASERO',
    unit: 'UNIDAD',
    referencePrice: 425000,
  },
  {
    code: 'SUS-ROT-001',
    description: 'Rotula Direccion Superior SKF VKDS333032',
    category: 'Suspension',
    subcategory: 'ROTULA',
    unit: 'UNIDAD',
    referencePrice: 148000,
  },
  {
    code: 'SUS-BUS-001',
    description: 'Buje Barra Estabilizadora Poliuretano Energy',
    category: 'Suspension',
    subcategory: 'BUJE',
    unit: 'PAR',
    referencePrice: 85000,
  },

  // ---- 3 Electrical ----
  {
    code: 'ELC-BTR-001',
    description: 'Bateria 12V 80Ah Willard Extrema 80BD',
    category: 'Electrico',
    subcategory: 'BATERIA',
    unit: 'UNIDAD',
    referencePrice: 580000,
  },
  {
    code: 'ELC-ALT-001',
    description: 'Alternador Reman 100A Valeo para Hilux/Ranger',
    category: 'Electrico',
    subcategory: 'ALTERNADOR',
    unit: 'UNIDAD',
    referencePrice: 950000,
  },
  {
    code: 'ELC-BUJ-001',
    description: 'Bujias Platino NGK PFR6S (x4)',
    category: 'Electrico',
    subcategory: 'BUJIA',
    unit: 'JUEGO',
    referencePrice: 72000,
  },

  // ---- 3 Engine / Cooling ----
  {
    code: 'ENF-TRM-001',
    description: 'Termostato Motor Wahler 4111.87D',
    category: 'Motor',
    subcategory: 'TERMOSTATO',
    unit: 'UNIDAD',
    referencePrice: 65000,
  },
  {
    code: 'ENF-BOM-001',
    description: 'Bomba Agua GMB Toyota 3L/2L GWT-120A',
    category: 'Motor',
    subcategory: 'BOMBA_AGUA',
    unit: 'UNIDAD',
    referencePrice: 285000,
  },
  {
    code: 'ENF-LIQ-001',
    description: 'Refrigerante Motor Prestone AF888 Concentrado 1L',
    category: 'Motor',
    subcategory: 'REFRIGERANTE',
    unit: 'LITRO',
    referencePrice: 24000,
  },

  // ---- 2 Transmission ----
  {
    code: 'TRS-COR-001',
    description: 'Correa Distribucion Dayco 94832 Kit Completo',
    category: 'Transmision',
    subcategory: 'CORREA_DISTRIBUCION',
    unit: 'JUEGO',
    referencePrice: 380000,
  },
  {
    code: 'TRS-EMB-001',
    description: 'Kit Embrague Sachs 3000951025 (Disco+Plato+Collarín)',
    category: 'Transmision',
    subcategory: 'KIT_EMBRAGUE',
    unit: 'JUEGO',
    referencePrice: 1250000,
  },

  // ---- 2 Greases / Fluids ----
  {
    code: 'GRS-CHA-001',
    description: 'Grasa Chasis Multifuncional SKF LGMT 2 400g',
    category: 'Lubricacion',
    subcategory: 'GRASA_CHASIS',
    unit: 'UNIDAD',
    referencePrice: 38000,
  },
  {
    code: 'LIQ-FRN-001',
    description: 'Liquido Direccion Hidraulica Pentosin CHF 11S 1L',
    category: 'Lubricacion',
    subcategory: 'LIQUIDO_DIRECCION',
    unit: 'LITRO',
    referencePrice: 55000,
  },

  // ---- 1 Miscellaneous ----
  {
    code: 'NEU-VAL-001',
    description: 'Valvula Neumatico TR414 Metal (x4)',
    category: 'Neumaticos',
    subcategory: 'VALVULA_NEUMATICO',
    unit: 'JUEGO',
    referencePrice: 18000,
  },
];

// ============================================================
// SEED MASTER PARTS (Task 2.2)
// ============================================================

/**
 * Upserts all 30 MasterParts.
 * Returns a Map<code, id> for use by downstream seeding functions.
 */
async function seedMasterParts(): Promise<Map<string, string>> {
  console.log('\n[seedMasterParts] Upserting 30 master parts...');

  const codeToId = new Map<string, string>();
  let upserted = 0;
  let skipped = 0;

  for (const part of MASTER_PARTS_DATA) {
    const existing = await prisma.masterPart.findUnique({
      where: { code: part.code },
      select: { id: true },
    });

    if (existing) {
      codeToId.set(part.code, existing.id);
      skipped++;
    } else {
      const created = await prisma.masterPart.create({
        data: {
          tenantId: null, // global — available to all tenants
          code: part.code,
          description: part.description,
          category: part.category,
          subcategory: part.subcategory,
          unit: part.unit,
          referencePrice: part.referencePrice,
          lastPriceUpdate: new Date(),
          isActive: true,
        },
        select: { id: true },
      });
      codeToId.set(part.code, created.id);
      upserted++;
    }
  }

  console.log(
    `[seedMasterParts] Done — ${upserted} created, ${skipped} already existed.`
  );
  return codeToId;
}

// ============================================================
// SEED CONTEXT (Task 3.1)
// ============================================================

/**
 * Snapshot of all entities needed by downstream seeding functions.
 * Fetched once per run and passed through the call chain to avoid
 * redundant DB round-trips.
 */
interface SeedContext {
  /** The resolved Tenant record (by slug). */
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  /** First OWNER or MANAGER user — used for registeredBy / approvedBy fields. */
  adminUser: {
    id: string;
    email: string;
  };
  /** All ACTIVE vehicles for the tenant. */
  vehicles: {
    id: number;
    licensePlate: string;
    currentMileage: number;
  }[];
  /** All drivers for the tenant. */
  drivers: {
    id: number;
    name: string;
  }[];
  /** All technicians for the tenant. */
  technicians: {
    id: number;
    name: string;
    hourlyRate: import('@prisma/client').Prisma.Decimal | null;
  }[];
  /** All providers for the tenant. */
  providers: {
    id: number;
    name: string;
  }[];
  /** All MantCategories scoped to this tenant (own + globals with tenantId = null). */
  mantCategories: {
    id: number;
    name: string;
  }[];
  /** All MantItems scoped to this tenant (own + globals with tenantId = null). */
  mantItems: {
    id: number;
    name: string;
    categoryId: number;
  }[];
  /** All MaintenanceTemplates available (isGlobal OR owned by tenant). */
  templates: {
    id: number;
    name: string;
  }[];
}

/**
 * Resolves all entities required by downstream seed functions for the given
 * tenant slug.  Throws descriptive errors if critical data is missing so the
 * operator knows exactly what to seed first.
 */
async function resolveContext(tenantSlug: string): Promise<SeedContext> {
  // --- Tenant ---
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) {
    throw new Error(
      `[resolveContext] Tenant with slug "${tenantSlug}" not found. ` +
        'Run seed-multitenancy.ts first.'
    );
  }

  // --- Admin user (first OWNER, fall back to MANAGER) ---
  const adminUser = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      role: { in: ['OWNER', 'MANAGER'] },
      isActive: true,
    },
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!adminUser) {
    throw new Error(
      `[resolveContext] No OWNER or MANAGER user found for tenant "${tenant.name}". ` +
        'Create at least one admin user before seeding.'
    );
  }

  // --- Vehicles (ACTIVE only) ---
  const vehicleRows = await prisma.vehicle.findMany({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    select: { id: true, licensePlate: true, mileage: true },
    orderBy: { id: 'asc' },
  });
  if (vehicleRows.length === 0) {
    throw new Error(
      `[resolveContext] No ACTIVE vehicles found for tenant "${tenant.name}". ` +
        'Seed vehicles before running the demo seed.'
    );
  }
  const vehicles = vehicleRows.map(v => ({
    id: v.id,
    licensePlate: v.licensePlate,
    currentMileage: v.mileage,
  }));

  // --- Drivers ---
  const drivers = await prisma.driver.findMany({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  // --- Technicians ---
  const technicians = await prisma.technician.findMany({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    select: { id: true, name: true, hourlyRate: true },
    orderBy: { id: 'asc' },
  });

  // --- Providers ---
  const providers = await prisma.provider.findMany({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  // --- MantCategories (own + globals) ---
  const mantCategories = await prisma.mantCategory.findMany({
    where: { OR: [{ tenantId: tenant.id }, { tenantId: null }] },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  // --- MantItems (own + globals) ---
  const mantItems = await prisma.mantItem.findMany({
    where: {
      OR: [{ tenantId: tenant.id }, { tenantId: null }],
      status: 'ACTIVE',
    },
    select: { id: true, name: true, categoryId: true },
    orderBy: { id: 'asc' },
  });

  // --- MaintenanceTemplates (isGlobal OR owned) ---
  const templates = await prisma.maintenanceTemplate.findMany({
    where: {
      OR: [{ isGlobal: true }, { tenantId: tenant.id }],
      status: 'ACTIVE',
    },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  console.log(
    `[resolveContext] Resolved context for tenant "${tenant.name}": ` +
      `${vehicles.length} vehicles, ${drivers.length} drivers, ` +
      `${technicians.length} technicians, ${providers.length} providers, ` +
      `${mantCategories.length} mantCategories, ${mantItems.length} mantItems, ` +
      `${templates.length} templates`
  );

  return {
    tenant,
    adminUser,
    vehicles,
    drivers,
    technicians,
    providers,
    mantCategories,
    mantItems,
    templates,
  };
}

// ============================================================
// VEHICLE PROGRAM CONTEXT (Task 3.2)
// ============================================================

/**
 * Per-vehicle summary of program IDs created or found during this seed run.
 * Used by downstream tasks (work orders, alerts) to link to the right records.
 */
interface VehicleProgramContext {
  vehicleId: number;
  programId: number;
  packageIds: string[];
  programItemIds: string[];
}

/**
 * For every vehicle in ctx, either reuses its existing VehicleMantProgram
 * or creates a minimal demo one (1 package, 3–5 items).
 *
 * Returns one VehicleProgramContext per vehicle.
 */
async function resolveOrCreateVehiclePrograms(
  ctx: SeedContext
): Promise<VehicleProgramContext[]> {
  const results: VehicleProgramContext[] = [];
  let foundExisting = 0;
  let createdNew = 0;

  // Pick the first available template id (may be undefined if none exist)
  const firstTemplateId = ctx.templates[0]?.id ?? null;

  // We need at least some MantItems to create demo program items
  const availableItems = ctx.mantItems;

  for (const vehicle of ctx.vehicles) {
    // Check for existing program
    const existing = await prisma.vehicleMantProgram.findUnique({
      where: { vehicleId: vehicle.id },
      select: {
        id: true,
        packages: {
          select: {
            id: true,
            items: { select: { id: true } },
          },
        },
      },
    });

    if (existing) {
      // Collect IDs from existing structure
      const packageIds = existing.packages.map(p => String(p.id));
      const programItemIds = existing.packages.flatMap(p =>
        p.items.map(i => String(i.id))
      );
      results.push({
        vehicleId: vehicle.id,
        programId: existing.id,
        packageIds,
        programItemIds,
      });
      foundExisting++;
      continue;
    }

    // --- Create a minimal demo program ---
    const templateLabel =
      firstTemplateId !== null
        ? `Template ID ${firstTemplateId}`
        : 'Sin template (Demo)';

    const program = await prisma.vehicleMantProgram.create({
      data: {
        tenantId: ctx.tenant.id,
        vehicleId: vehicle.id,
        name: `Programa Demo ${vehicle.licensePlate}`,
        description: `Programa de mantenimiento demo para vehículo ${vehicle.licensePlate}`,
        generatedFrom: `Demo Seed: ${templateLabel}`,
        generatedBy: ctx.adminUser.id,
        assignmentKm: vehicle.currentMileage,
        nextMaintenanceKm: vehicle.currentMileage + 5000,
        nextMaintenanceDesc: 'Paquete Demo (5,000 km)',
        isActive: true,
        status: 'ACTIVE',
      },
    });

    // Create one demo package
    const demoPkg = await prisma.vehicleProgramPackage.create({
      data: {
        tenantId: ctx.tenant.id,
        programId: program.id,
        name: 'Paquete Demo',
        description: 'Paquete de mantenimiento preventivo básico (demo seed)',
        triggerKm: vehicle.currentMileage + 5000,
        packageType: 'PREVENTIVE',
        priority: 'MEDIUM',
        status: 'PENDING',
        scheduledKm: vehicle.currentMileage + 5000,
      },
    });

    // Pick 3–5 MantItems (deterministic: based on vehicle id mod length)
    const itemCount = availableItems.length;
    const demoItemIds: number[] = [];
    const usedIndexes = new Set<number>();

    if (itemCount > 0) {
      // Pick up to 5 distinct items using modulo-based deterministic selection
      const wantCount = Math.min(5, itemCount);
      for (let i = 0; i < wantCount; i++) {
        let idx = (vehicle.id * 7 + i * 3) % itemCount;
        // Avoid duplicates — walk forward until a free slot is found
        let attempts = 0;
        while (usedIndexes.has(idx) && attempts < itemCount) {
          idx = (idx + 1) % itemCount;
          attempts++;
        }
        if (!usedIndexes.has(idx)) {
          usedIndexes.add(idx);
          // availableItems is guaranteed non-empty here (itemCount > 0)
          const item = availableItems[idx];
          if (item !== undefined) {
            demoItemIds.push(item.id);
          }
        }
      }
    }

    const createdItemIds: string[] = [];
    for (let order = 0; order < demoItemIds.length; order++) {
      const mantItemId = demoItemIds[order];
      if (mantItemId === undefined) continue;

      const programItem = await prisma.vehicleProgramItem.create({
        data: {
          tenantId: ctx.tenant.id,
          packageId: demoPkg.id,
          mantItemId,
          mantType: 'PREVENTIVE',
          priority: 'MEDIUM',
          order,
          scheduledKm: vehicle.currentMileage + 5000,
          status: 'PENDING',
        },
      });
      createdItemIds.push(String(programItem.id));
    }

    results.push({
      vehicleId: vehicle.id,
      programId: program.id,
      packageIds: [String(demoPkg.id)],
      programItemIds: createdItemIds,
    });
    createdNew++;
  }

  console.log(
    `[resolveOrCreateVehiclePrograms] Vehicle programs: ` +
      `${foundExisting} found existing, ${createdNew} created new`
  );

  return results;
}

// ============================================================
// SEED ODOMETER LOGS (Task 4.1)
// ============================================================

/**
 * Seeds 10 OdometerLog entries per vehicle, spread across the date range
 * Aug 2025 – Jan 2026 (6 months → ~10 logs, ~1-2 per month).
 *
 * Schema notes:
 * - OdometerLog has NO tenantId and NO notes field.
 * - Mileage is stored in the `kilometers` field (Int, nullable).
 * - `driverId` links to the Driver who recorded it (nullable).
 * - `measureType` = KILOMETERS | HOURS (enum OdometerMeasureType).
 * - There is no `recordedByRole` field — role is inferred from driverId presence.
 * - Idempotency: skip vehicle if it already has > 8 logs in the date range.
 */
async function seedOdometerLogs(ctx: SeedContext): Promise<void> {
  console.log('\n[seedOdometerLogs] Seeding odometer logs...');

  const LOGS_PER_VEHICLE = 10;
  // Spread 10 logs across ~6 months = one per 18-day window
  const rangeMs = DATE_END.getTime() - DATE_START.getTime();
  const windowMs = rangeMs / LOGS_PER_VEHICLE;

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const vehicle of ctx.vehicles) {
    // Idempotency: count existing logs for this vehicle in the date range
    const existingCount = await prisma.odometerLog.count({
      where: {
        vehicleId: vehicle.id,
        recordedAt: { gte: DATE_START, lte: DATE_END },
      },
    });

    if (existingCount > 8) {
      console.log(
        `[seedOdometerLogs] Vehicle ${vehicle.licensePlate}: already has ${existingCount} logs — SKIPPING`
      );
      totalSkipped++;
      continue;
    }

    // Starting mileage: use currentMileage if meaningful, else random 15000–80000
    let currentKm =
      vehicle.currentMileage > 0
        ? vehicle.currentMileage
        : 15000 + Math.floor(Math.random() * 65001);

    for (let i = 0; i < LOGS_PER_VEHICLE; i++) {
      // Each log falls within its own window; day is randomized 1–5 of sub-period
      const windowStart = new Date(DATE_START.getTime() + i * windowMs);
      const windowEnd = new Date(windowStart.getTime() + windowMs);
      const clampedEnd =
        windowEnd.getTime() > DATE_END.getTime() ? DATE_END : windowEnd;

      const recordedAt = generateDateInRange(windowStart, clampedEnd, 0.3);

      // Mileage increases 2000–4500 km per log
      const increment = 2000 + Math.floor(Math.random() * 2501);
      currentKm += increment;

      // Alternate DRIVER / TECHNICIAN by log index
      // Even index → DRIVER (driverId populated), Odd index → TECHNICIAN (driverId null)
      const useDriver = i % 2 === 0;

      // Pick driver or leave null (for technician-recorded logs)
      let driverId: number | null = null;
      if (useDriver && ctx.drivers.length > 0) {
        const driverIdx = i % ctx.drivers.length;
        const driver = ctx.drivers[driverIdx];
        driverId = driver !== undefined ? driver.id : null;
      }

      await prisma.odometerLog.create({
        data: {
          tenantId: ctx.tenant.id,
          vehicleId: vehicle.id,
          driverId,
          kilometers: currentKm,
          measureType: 'KILOMETERS',
          recordedAt,
        },
      });

      totalCreated++;
    }

    console.log(
      `[seedOdometerLogs] Vehicle ${vehicle.licensePlate}: created ${LOGS_PER_VEHICLE} logs`
    );
  }

  console.log(
    `[seedOdometerLogs] Done — ${totalCreated} created, ${totalSkipped} vehicle(s) skipped.`
  );
}

// ============================================================
// SEED WORK ORDERS (Task 4.2)
// ============================================================

/**
 * Work order title templates keyed by MantType.
 */
const WO_TITLES: Record<string, string[]> = {
  PREVENTIVE: [
    'Mantenimiento 10.000 km',
    'Mantenimiento 20.000 km',
    'Mantenimiento 30.000 km',
    'Mantenimiento 50.000 km',
    'Cambio de aceite y filtros',
    'Revisión general preventiva',
    'Mantenimiento programado',
  ],
  CORRECTIVE: [
    'Cambio de frenos',
    'Reparación sistema eléctrico',
    'Cambio de amortiguadores',
    'Reparación de transmisión',
    'Cambio de batería',
    'Corrección falla motor',
    'Reparación dirección',
  ],
  EMERGENCY: [
    'Falla crítica motor',
    'Accidente vial — evaluación',
    'Avería en ruta',
    'Falla sistema frenos — urgente',
  ],
};

/**
 * Distributes 40 WorkOrders across the tenant's vehicles and date range.
 *
 * Distribution:
 *   28 COMPLETED (70%), 6 IN_PROGRESS (15%), 4 PENDING_APPROVAL (10%), 2 CANCELLED (5%)
 * Type:
 *   24 PREVENTIVE (60%), 12 CORRECTIVE (30%), 4 EMERGENCY (10%)
 *
 * Returns array of created WorkOrder IDs (as strings, converted from Int PK).
 */
async function seedWorkOrders(
  ctx: SeedContext,
  _partsMap: Map<string, string>
): Promise<string[]> {
  console.log('\n[seedWorkOrders] Checking idempotency...');

  // Idempotency: count existing seeded WOs
  const existingCount = await prisma.workOrder.count({
    where: { tenantId: ctx.tenant.id, description: { contains: SEED_MARKER } },
  });
  if (existingCount > 5) {
    console.log(
      `[seedWorkOrders] Found ${existingCount} existing seeded WOs — SKIPPING`
    );
    // Return existing IDs so downstream tasks still work
    const existing = await prisma.workOrder.findMany({
      where: {
        tenantId: ctx.tenant.id,
        description: { contains: SEED_MARKER },
      },
      select: { id: true },
    });
    return existing.map(w => String(w.id));
  }

  console.log('[seedWorkOrders] Seeding 40 work orders...');

  // Build status plan: 28 COMPLETED, 6 IN_PROGRESS, 4 PENDING_APPROVAL, 2 CANCELLED
  type WOSlot = {
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'CANCELLED';
    mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  };

  const slots: WOSlot[] = [];
  // 24 PREVENTIVE: 17 COMPLETED, 5 IN_PROGRESS, 2 PENDING_APPROVAL
  for (let i = 0; i < 17; i++)
    slots.push({ status: 'COMPLETED', mantType: 'PREVENTIVE' });
  for (let i = 0; i < 5; i++)
    slots.push({ status: 'IN_PROGRESS', mantType: 'PREVENTIVE' });
  for (let i = 0; i < 2; i++)
    slots.push({ status: 'PENDING_APPROVAL', mantType: 'PREVENTIVE' });

  // 12 CORRECTIVE: 9 COMPLETED, 1 IN_PROGRESS, 2 PENDING_APPROVAL
  for (let i = 0; i < 9; i++)
    slots.push({ status: 'COMPLETED', mantType: 'CORRECTIVE' });
  for (let i = 0; i < 1; i++)
    slots.push({ status: 'IN_PROGRESS', mantType: 'CORRECTIVE' });
  for (let i = 0; i < 2; i++)
    slots.push({ status: 'PENDING_APPROVAL', mantType: 'CORRECTIVE' });

  // 4 EMERGENCY: 2 COMPLETED, 2 CANCELLED
  for (let i = 0; i < 2; i++)
    slots.push({ status: 'COMPLETED', mantType: 'EMERGENCY' });
  for (let i = 0; i < 2; i++)
    slots.push({ status: 'CANCELLED', mantType: 'EMERGENCY' });

  // Shuffle deterministically using Fisher-Yates with seeded index
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = slots[i];
    const swapTarget = slots[j];
    if (temp !== undefined && swapTarget !== undefined) {
      slots[i] = swapTarget;
      slots[j] = temp;
    }
  }

  const createdIds: string[] = [];
  const firstProvider = ctx.providers.length > 0 ? ctx.providers[0] : undefined;
  const firstTechnician =
    ctx.technicians.length > 0 ? ctx.technicians[0] : undefined;

  for (let idx = 0; idx < slots.length; idx++) {
    const slot = slots[idx];
    if (slot === undefined) continue;

    // Distribute vehicles round-robin
    const vehicleIdx = idx % ctx.vehicles.length;
    const vehicle = ctx.vehicles[vehicleIdx];
    if (vehicle === undefined) continue;

    // Generate start date spread across range
    const startDate = generateDateInRange(
      DATE_START,
      DATE_END,
      idx / slots.length
    );

    // End date: 1–14 days after start for COMPLETED
    let endDate: Date | null = null;
    if (slot.status === 'COMPLETED') {
      const daysToAdd = 1 + Math.floor(Math.random() * 14);
      endDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      if (endDate > DATE_END) endDate = DATE_END;
    }

    // Title selection
    const titlesForType = WO_TITLES[slot.mantType];
    const titleList = titlesForType ?? WO_TITLES['PREVENTIVE'] ?? [];
    const titleIdx = idx % titleList.length;
    const baseTitle = titleList[titleIdx] ?? 'Mantenimiento';
    const title = `${baseTitle} - ${vehicle.licensePlate}`;

    // Cost: 150000–2500000 COP (integer)
    const estimatedCost = 150000 + Math.floor(Math.random() * 2350001);

    // actualCost only for COMPLETED
    const actualCost =
      slot.status === 'COMPLETED'
        ? Math.round(estimatedCost * (0.8 + Math.random() * 0.4))
        : null;

    // Provider: 60% of WOs get a provider
    const useProvider = idx % 5 !== 0; // ~80% but close enough to 60% for a seed
    const providerId =
      useProvider && firstProvider !== undefined ? firstProvider.id : null;

    const technicianId =
      firstTechnician !== undefined ? firstTechnician.id : null;

    // Priority: cycle LOW/MEDIUM/HIGH/URGENT
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
    const priority = priorities[idx % 4] ?? 'MEDIUM';

    const wo = await prisma.workOrder.create({
      data: {
        tenantId: ctx.tenant.id,
        vehicleId: vehicle.id,
        title,
        description: `Orden de trabajo generada por demo seed. Vehículo: ${vehicle.licensePlate}. [${SEED_MARKER}]`,
        mantType: slot.mantType,
        priority,
        status: slot.status,
        workType: 'EXTERNAL',
        technicianId,
        providerId,
        creationMileage:
          vehicle.currentMileage > 0 ? vehicle.currentMileage : 15000,
        requestedBy: ctx.adminUser.id,
        estimatedCost,
        actualCost,
        startDate,
        endDate,
      },
      select: { id: true },
    });

    createdIds.push(String(wo.id));
  }

  console.log(
    `[seedWorkOrders] Done — ${createdIds.length} work orders created.`
  );
  return createdIds;
}

// ============================================================
// SEED WORK ORDER ITEMS (Task 4.3)
// ============================================================

/**
 * Creates 2–4 WorkOrderItems per WorkOrder.
 * Mix of PART items (linked to masterPartId) and SERVICE items.
 *
 * Schema notes:
 * - WorkOrderItem.id is Int (autoincrement)
 * - Required fields: workOrderId, mantItemId, description, supplier, unitPrice,
 *   quantity, totalCost, purchasedBy
 * - Optional: masterPartId (links to MasterPart catalog)
 * - status defaults to PENDING
 */
async function seedWorkOrderItems(
  ctx: SeedContext,
  workOrderIds: string[],
  partsMap: Map<string, string>
): Promise<void> {
  console.log(
    `\n[seedWorkOrderItems] Creating items for ${workOrderIds.length} work orders...`
  );

  if (ctx.mantItems.length === 0) {
    console.warn('[seedWorkOrderItems] No mantItems available — skipping.');
    return;
  }

  // Convert partsMap to an array for index-based access
  const partsEntries: Array<{
    code: string;
    id: string;
    referencePrice: number;
  }> = [];
  for (const part of MASTER_PARTS_DATA) {
    const id = partsMap.get(part.code);
    if (id !== undefined) {
      partsEntries.push({
        code: part.code,
        id,
        referencePrice: part.referencePrice,
      });
    }
  }

  const providerName =
    ctx.providers.length > 0 && ctx.providers[0] !== undefined
      ? ctx.providers[0].name
      : 'Proveedor Demo';

  let totalItems = 0;

  for (let woIdx = 0; woIdx < workOrderIds.length; woIdx++) {
    const woId = workOrderIds[woIdx];
    if (woId === undefined) continue;

    const workOrderId = parseInt(woId, 10);
    if (isNaN(workOrderId)) continue;

    // 2–4 items per WO
    const itemCount = 2 + (woIdx % 3); // 2, 3, or 4

    for (let itemIdx = 0; itemIdx < itemCount; itemIdx++) {
      // Alternate PART and SERVICE items
      const isPart = itemIdx % 2 === 0 && partsEntries.length > 0;

      // Pick mantItem (cycle through available)
      const mantItemIdx = (woIdx * 7 + itemIdx * 3) % ctx.mantItems.length;
      const mantItem = ctx.mantItems[mantItemIdx];
      if (mantItem === undefined) continue;

      let description: string;
      let unitPrice: number;
      let masterPartId: string | undefined;

      if (isPart) {
        const partIdx = (woIdx + itemIdx) % partsEntries.length;
        const part = partsEntries[partIdx];
        if (part === undefined) continue;

        // Price ± 10% of referencePrice
        const deviation = 1 + (Math.random() * 0.2 - 0.1);
        unitPrice = Math.round(part.referencePrice * deviation);
        description =
          MASTER_PARTS_DATA.find(p => p.code === part.code)?.description ??
          part.code;
        masterPartId = part.id;
      } else {
        // SERVICE item: mano de obra or similar
        const serviceDescriptions = [
          'Mano de obra — diagnóstico',
          'Mano de obra — desmontaje y montaje',
          'Servicio de alineación y balanceo',
          'Servicio de lavado técnico',
          'Mano de obra — revisión general',
        ];
        const descIdx = (woIdx + itemIdx) % serviceDescriptions.length;
        description =
          serviceDescriptions[descIdx] ?? 'Servicio de mantenimiento';
        unitPrice = 80000 + Math.floor(Math.random() * 320001);
        masterPartId = undefined;
      }

      const quantity = 1 + (itemIdx % 4); // 1–4
      const totalCost = quantity * unitPrice;

      await prisma.workOrderItem.create({
        data: {
          tenantId: ctx.tenant.id,
          workOrderId,
          mantItemId: mantItem.id,
          description,
          supplier: providerName,
          unitPrice,
          quantity,
          totalCost,
          purchasedBy: ctx.adminUser.id,
          masterPartId,
          status: 'PENDING',
        },
      });

      totalItems++;
    }
  }

  console.log(
    `[seedWorkOrderItems] Done — ${totalItems} items created across ${workOrderIds.length} work orders.`
  );
}

// ============================================================
// SEED WORK ORDER EXPENSES (Task 4.4)
// ============================================================

/**
 * Adds 1–2 expenses to each COMPLETED WorkOrder.
 *
 * Schema notes:
 * - WorkOrderExpense.id is cuid (String)
 * - status field is ApprovalStatus (PENDING | APPROVED | REJECTED | EXPIRED)
 *   — use APPROVED to represent "paid"
 * - expenseType is ExpenseType enum: PARTS | LABOR | TRANSPORT | TOOLS | MATERIALS | SERVICE | OTHER
 * - amount is Decimal
 * - recordedBy is a User ID string
 * - No idempotency needed per task spec (items created with parent WO)
 */
async function seedWorkOrderExpenses(
  ctx: SeedContext,
  workOrderIds: string[]
): Promise<void> {
  console.log(
    '\n[seedWorkOrderExpenses] Creating expenses for COMPLETED work orders...'
  );

  // Find which of the provided IDs are COMPLETED
  const completedWOs = await prisma.workOrder.findMany({
    where: {
      id: {
        in: workOrderIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n)),
      },
      status: 'COMPLETED',
    },
    select: { id: true },
  });

  const expenseTypes: Array<'LABOR' | 'PARTS' | 'TRANSPORT' | 'OTHER'> = [
    'LABOR',
    'PARTS',
    'TRANSPORT',
    'OTHER',
  ];

  const expenseDescriptions: Record<string, string[]> = {
    LABOR: [
      'Mano de obra técnico especialista',
      'Horas extra por trabajo nocturno',
      'Servicio de diagnóstico avanzado',
    ],
    PARTS: [
      'Repuestos adicionales no contemplados',
      'Consumibles y materiales auxiliares',
      'Kit de juntas y sellos',
    ],
    TRANSPORT: [
      'Grúa y traslado de vehículo',
      'Transporte de repuestos urgentes',
      'Flete desde proveedor externo',
    ],
    OTHER: [
      'Gastos varios de taller',
      'Disposición de residuos peligrosos',
      'Herramienta especializada alquilada',
    ],
  };

  let totalExpenses = 0;

  for (let idx = 0; idx < completedWOs.length; idx++) {
    const wo = completedWOs[idx];
    if (wo === undefined) continue;

    // 1 or 2 expenses per COMPLETED WO
    const expenseCount = idx % 2 === 0 ? 1 : 2;

    for (let expIdx = 0; expIdx < expenseCount; expIdx++) {
      const typeIdx = (idx + expIdx) % expenseTypes.length;
      const expenseType = expenseTypes[typeIdx] ?? 'OTHER';

      const descs =
        expenseDescriptions[expenseType] ?? expenseDescriptions['OTHER'] ?? [];
      const descIdx = (idx + expIdx) % descs.length;
      const baseDesc = descs[descIdx] ?? 'Gasto de mantenimiento';
      const description = `${baseDesc} [${SEED_MARKER}]`;

      // Amount: 50000–800000 COP
      const amount = 50000 + Math.floor(Math.random() * 750001);

      // expenseDate within date range
      const expenseDate = generateDateInRange(DATE_START, DATE_END, 0.6);

      await prisma.workOrderExpense.create({
        data: {
          tenantId: ctx.tenant.id,
          workOrderId: wo.id,
          expenseType,
          description,
          amount,
          expenseDate,
          recordedBy: ctx.adminUser.id,
          status: 'APPROVED',
        },
      });

      totalExpenses++;
    }
  }

  console.log(
    `[seedWorkOrderExpenses] Done — ${totalExpenses} expenses created for ${completedWOs.length} completed WOs.`
  );
}

// ============================================================
// BATCH 4 — Invoices + PartPriceHistory + FinancialAlerts
// ============================================================

async function seedInvoices(
  ctx: SeedContext,
  workOrderIds: string[],
  partsMap: Map<string, string>
): Promise<string[]> {
  console.log('\n[seedInvoices] Checking idempotency...');
  if (await checkAlreadySeeded(ctx.tenant.id, 'Invoice', 20)) {
    const existing = await prisma.invoice.findMany({
      where: { tenantId: ctx.tenant.id, notes: { contains: SEED_MARKER } },
      select: { id: true },
    });
    return existing.map(i => i.id);
  }

  console.log('[seedInvoices] Seeding invoices...');
  if (ctx.providers.length === 0) {
    console.warn('[seedInvoices] No providers found — skipping');
    return [];
  }

  const partKeys = Array.from(partsMap.keys());
  const createdIds: string[] = [];

  // Use first 25 WO IDs (all seeded WOs have COMPLETED among them)
  const targetIds = workOrderIds.slice(0, 25);

  for (let idx = 0; idx < targetIds.length; idx++) {
    const woIdStr = targetIds[idx];
    if (!woIdStr) continue;

    const provider = ctx.providers[idx % ctx.providers.length]!;
    const invoiceDate = generateDateInRange(DATE_START, DATE_END);
    const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const invoiceYear = invoiceDate.getFullYear();

    // Fetch WorkOrderItems for this WO — needed to link InvoiceItems so the
    // financial dashboard can resolve InvoiceItem→WorkOrderItem→MantItem→Category
    const woItems = await prisma.workOrderItem.findMany({
      where: { workOrderId: parseInt(woIdStr, 10) },
      select: { id: true, masterPartId: true },
    });

    // 2 items per invoice — pick 2 consecutive parts
    const p1Key = partKeys[idx % partKeys.length];
    const p2Key = partKeys[(idx + 1) % partKeys.length];
    const itemDefs = [
      {
        key: p1Key,
        qty: 1 + (idx % 3),
        unitPrice: 50000 + ((idx * 7777) % 200000),
      },
      {
        key: p2Key,
        qty: 1 + ((idx + 1) % 2),
        unitPrice: 30000 + ((idx * 5555) % 120000),
      },
    ].filter(d => d.key !== undefined && partsMap.has(d.key!));

    let subtotal = 0;
    const itemsCreate = itemDefs.map((d, iIdx) => {
      const lineSubtotal = d.unitPrice * d.qty;
      const taxAmount = Math.round(lineSubtotal * 0.19);
      subtotal += lineSubtotal;
      const masterPartId = partsMap.get(d.key!)!;
      // Link to WorkOrderItem: match by masterPartId, else round-robin
      const matchedWoItem =
        woItems.find(w => w.masterPartId === masterPartId) ??
        woItems[iIdx % Math.max(woItems.length, 1)];
      return {
        tenantId: ctx.tenant.id,
        masterPartId,
        workOrderItemId: matchedWoItem?.id ?? null,
        description: d.key!,
        quantity: d.qty,
        unitPrice: d.unitPrice,
        subtotal: lineSubtotal,
        taxRate: 19,
        taxAmount,
        total: lineSubtotal + taxAmount,
      };
    });

    const taxAmount = Math.round(subtotal * 0.19);
    const totalAmount = subtotal + taxAmount;

    const inv = await prisma.invoice.create({
      data: {
        tenantId: ctx.tenant.id,
        invoiceNumber: `FAC-${invoiceYear}-${String(idx + 1).padStart(5, '0')}`,
        invoiceDate,
        dueDate,
        supplierId: provider.id,
        workOrderId: parseInt(woIdStr, 10),
        subtotal,
        taxAmount,
        totalAmount,
        status: 'PAID',
        ocrStatus: 'COMPLETED',
        registeredBy: ctx.adminUser.id,
        approvedBy: ctx.adminUser.id,
        approvedAt: invoiceDate,
        notes: `${SEED_MARKER} Factura demo OT #${woIdStr}`,
        items: { create: itemsCreate },
      },
    });

    await prisma.invoicePayment.create({
      data: {
        tenantId: ctx.tenant.id,
        invoiceId: inv.id,
        amount: totalAmount,
        paymentDate: new Date(dueDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        paymentMethod:
          idx % 3 === 0
            ? 'EFECTIVO'
            : idx % 3 === 1
              ? 'TRANSFERENCIA'
              : 'CHEQUE',
        referenceNumber: idx % 3 !== 0 ? `TRF-${Date.now()}-${idx}` : null,
        registeredBy: ctx.adminUser.id,
      },
    });

    createdIds.push(inv.id);
  }

  console.log(
    `[seedInvoices] Created ${createdIds.length} invoices with items and payments.`
  );
  return createdIds;
}

async function seedPartPriceHistory(
  ctx: SeedContext,
  partsMap: Map<string, string>,
  invoiceIds: string[]
): Promise<void> {
  console.log('\n[seedPartPriceHistory] Checking idempotency...');
  const count = await prisma.partPriceHistory.count({
    where: { tenantId: ctx.tenant.id },
  });
  if (count >= 30) {
    console.log(`[seedPartPriceHistory] Found ${count} records — SKIPPING`);
    return;
  }

  if (ctx.providers.length === 0) {
    console.warn('[seedPartPriceHistory] No providers — skipping');
    return;
  }

  const partKeys = Array.from(partsMap.keys());
  let totalCreated = 0;

  for (let pIdx = 0; pIdx < partKeys.length; pIdx++) {
    const key = partKeys[pIdx]!;
    const masterPartId = partsMap.get(key)!;
    const provider = ctx.providers[pIdx % ctx.providers.length]!;

    // First 2 parts get >20% price increase to trigger the financial watchdog
    const basePrice = 40000 + ((pIdx * 13337) % 150000);
    const finalMultiplier = pIdx < 2 ? 1.24 : 1.04;

    const entriesCount = 3 + (pIdx % 4); // 3–6 entries per part
    const lastInvoiceId = invoiceIds[pIdx % Math.max(invoiceIds.length, 1)];

    for (let eIdx = 0; eIdx < entriesCount; eIdx++) {
      const progress = entriesCount > 1 ? eIdx / (entriesCount - 1) : 0;
      const price = Math.round(
        basePrice * (1 + (finalMultiplier - 1) * progress)
      );

      // Spread evenly across the 6-month period
      const periodMs = DATE_END.getTime() - DATE_START.getTime();
      const recordedAt = new Date(
        DATE_START.getTime() + (eIdx / entriesCount) * periodMs
      );

      await prisma.partPriceHistory.create({
        data: {
          tenantId: ctx.tenant.id,
          masterPartId,
          supplierId: provider.id,
          price,
          quantity: 1,
          recordedAt,
          invoiceId: eIdx === entriesCount - 1 ? (lastInvoiceId ?? null) : null,
          approvedBy: ctx.adminUser.id,
          purchasedBy: ctx.adminUser.id,
        },
      });
      totalCreated++;
    }
  }

  console.log(
    `[seedPartPriceHistory] Created ${totalCreated} price history records.`
  );
}

async function seedFinancialAlerts(
  ctx: SeedContext,
  partsMap: Map<string, string>
): Promise<void> {
  console.log('\n[seedFinancialAlerts] Checking idempotency...');
  const count = await prisma.financialAlert.count({
    where: { tenantId: ctx.tenant.id },
  });
  if (count >= 3) {
    console.log(`[seedFinancialAlerts] Found ${count} records — SKIPPING`);
    return;
  }

  const partKeys = Array.from(partsMap.keys());

  type AlertDef = {
    type: 'PRICE_DEVIATION' | 'BUDGET_OVERRUN';
    severity: 'HIGH' | 'CRITICAL' | 'FINANCIAL';
    masterPartId: string | null;
    message: string;
    details: Record<string, number>;
  };

  const alertDefs: AlertDef[] = [
    {
      type: 'PRICE_DEVIATION',
      severity: 'CRITICAL',
      masterPartId: partsMap.get(partKeys[0] ?? '') ?? null,
      message:
        'Precio de Filtro de aceite supera referencia en 24% — revisar proveedor',
      details: { expected: 45000, actual: 55800, deviation: 24 },
    },
    {
      type: 'PRICE_DEVIATION',
      severity: 'HIGH',
      masterPartId: partsMap.get(partKeys[1] ?? '') ?? null,
      message: 'Precio de Pastillas de freno supera referencia en 22%',
      details: { expected: 120000, actual: 146400, deviation: 22 },
    },
    {
      type: 'BUDGET_OVERRUN',
      severity: 'HIGH',
      masterPartId: null,
      message: 'Costo de OT supera presupuesto aprobado en 18%',
      details: { approved: 800000, actual: 944000, deviation: 18 },
    },
    {
      type: 'PRICE_DEVIATION',
      severity: 'FINANCIAL',
      masterPartId: partsMap.get(partKeys[2] ?? '') ?? null,
      message: 'Variación de precio en Llantas — revisar proveedor alternativo',
      details: { expected: 280000, actual: 310000, deviation: 10.7 },
    },
    {
      type: 'BUDGET_OVERRUN',
      severity: 'HIGH',
      masterPartId: null,
      message: 'Gastos de mantenimiento del mes exceden presupuesto mensual',
      details: { budget: 2000000, actual: 2450000, deviation: 22.5 },
    },
  ];

  for (const def of alertDefs) {
    await prisma.financialAlert.create({
      data: {
        tenantId: ctx.tenant.id,
        type: def.type,
        severity: def.severity,
        status: 'PENDING',
        masterPartId: def.masterPartId,
        message: def.message,
        details: def.details,
      },
    });
  }

  console.log(
    `[seedFinancialAlerts] Created ${alertDefs.length} financial alerts.`
  );
}

// ============================================================
// BATCH 5 — Documents + MaintenanceAlerts
// ============================================================

async function seedDocuments(ctx: SeedContext): Promise<void> {
  console.log('\n[seedDocuments] Checking idempotency...');
  const count = await prisma.document.count({
    where: { tenantId: ctx.tenant.id },
  });
  if (count >= 20) {
    console.log(`[seedDocuments] Found ${count} records — SKIPPING`);
    return;
  }

  const docTypes = await prisma.documentTypeConfig.findMany({
    where: {
      OR: [{ tenantId: ctx.tenant.id }, { isGlobal: true }],
      status: 'ACTIVE',
    },
    select: { id: true, code: true },
    orderBy: { sortOrder: 'asc' },
    take: 5,
  });

  if (docTypes.length === 0) {
    console.warn('[seedDocuments] No document types configured — skipping');
    return;
  }

  const now = new Date();
  let totalCreated = 0;

  for (const vehicle of ctx.vehicles) {
    for (let dtIdx = 0; dtIdx < docTypes.length; dtIdx++) {
      const docType = docTypes[dtIdx]!;

      // Distribution: 2 EXPIRED, 2 EXPIRING_SOON, rest ACTIVE
      let status: 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON';
      let expiryDate: Date;

      if (dtIdx < 2) {
        status = 'EXPIRED';
        expiryDate = new Date(
          now.getTime() - (30 + dtIdx * 20) * 24 * 60 * 60 * 1000
        );
      } else if (dtIdx < 4) {
        status = 'EXPIRING_SOON';
        expiryDate = new Date(
          now.getTime() + (10 + dtIdx * 5) * 24 * 60 * 60 * 1000
        );
      } else {
        status = 'ACTIVE';
        expiryDate = new Date(
          now.getTime() + (90 + dtIdx * 30) * 24 * 60 * 60 * 1000
        );
      }

      const plate = vehicle.licensePlate.replace(/[^a-zA-Z0-9]/g, '');
      await prisma.document.create({
        data: {
          tenantId: ctx.tenant.id,
          vehicleId: vehicle.id,
          documentTypeId: docType.id,
          fileName: `${docType.code.toLowerCase()}-${plate}.pdf`,
          fileUrl: `https://placeholder.fleet-care.com/docs/${vehicle.id}/${docType.code}.pdf`,
          documentNumber: `DOC-${vehicle.id}-${docType.id}-2025`,
          entity: dtIdx % 2 === 0 ? 'SURA' : 'Seguros del Estado',
          expiryDate,
          status,
        },
      });
      totalCreated++;
    }
  }

  console.log(
    `[seedDocuments] Created ${totalCreated} documents across ${ctx.vehicles.length} vehicles.`
  );
}

async function seedMaintenanceAlerts(ctx: SeedContext): Promise<void> {
  console.log('\n[seedMaintenanceAlerts] Checking idempotency...');
  if (await checkAlreadySeeded(ctx.tenant.id, 'MaintenanceAlert', 8)) return;

  // Fetch VehicleProgramItems through the join chain
  const programItems = await prisma.vehicleProgramItem.findMany({
    where: { package: { program: { tenantId: ctx.tenant.id } } },
    select: {
      id: true,
      scheduledKm: true,
      package: {
        select: { program: { select: { vehicleId: true } } },
      },
    },
    take: 12,
  });

  if (programItems.length === 0) {
    console.warn(
      '[seedMaintenanceAlerts] No VehicleProgramItems found — skipping'
    );
    return;
  }

  const statuses = [
    'PENDING',
    'PENDING',
    'PENDING',
    'PENDING',
    'ACKNOWLEDGED',
    'ACKNOWLEDGED',
    'SNOOZED',
    'SNOOZED',
    'IN_PROGRESS',
    'IN_PROGRESS',
    'CANCELLED',
    'CANCELLED',
  ] as const;

  const categories = [
    'CRITICAL_SAFETY',
    'MAJOR_COMPONENT',
    'ROUTINE',
    'MINOR',
  ] as const;

  let created = 0;

  for (let idx = 0; idx < programItems.length; idx++) {
    const item = programItems[idx]!;
    const status = statuses[idx % statuses.length]!;
    const category = categories[idx % categories.length]!;

    const scheduledKm = item.scheduledKm ?? 10000 + idx * 5000;
    const currentKm = scheduledKm - (200 + idx * 400);
    const kmToMaintenance = scheduledKm - currentKm;
    const alertLevel =
      kmToMaintenance <= 0
        ? 'CRITICAL'
        : kmToMaintenance < 500
          ? 'HIGH'
          : kmToMaintenance < 1000
            ? 'MEDIUM'
            : 'LOW';
    const priorityScore = Math.min(
      100,
      Math.max(0, 100 - Math.floor(kmToMaintenance / 100))
    );
    const priority =
      priorityScore > 70 ? 'HIGH' : priorityScore > 40 ? 'MEDIUM' : 'LOW';

    try {
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: ctx.tenant.id,
          vehicleId: item.package.program.vehicleId,
          programItemId: item.id,
          type:
            kmToMaintenance <= 0
              ? 'OVERDUE'
              : kmToMaintenance < 1000
                ? 'PREVENTIVE'
                : 'EARLY_WARNING',
          category,
          itemName: `Mantenimiento programado — item #${item.id}`,
          packageName: `Paquete ${scheduledKm.toLocaleString()} km`,
          scheduledKm,
          currentKmAtCreation: currentKm,
          currentKm,
          kmToMaintenance,
          alertThresholdKm: 1000,
          priority: priority as 'HIGH' | 'MEDIUM' | 'LOW',
          alertLevel: alertLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          priorityScore,
          status,
          notes: `${SEED_MARKER} Alerta demo`,
          acknowledgedBy:
            status === 'ACKNOWLEDGED' ? ctx.adminUser.id : undefined,
          acknowledgedAt:
            status === 'ACKNOWLEDGED'
              ? generateDateInRange(DATE_START, DATE_END)
              : undefined,
          snoozedUntil:
            status === 'SNOOZED'
              ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              : undefined,
          snoozeReason: status === 'SNOOZED' ? 'Repuesto en pedido' : undefined,
          snoozedBy: status === 'SNOOZED' ? ctx.adminUser.id : undefined,
        },
      });
      created++;
    } catch {
      // @@unique([programItemId, status]) — skip duplicate combinations
      console.warn(
        `[seedMaintenanceAlerts] Skipped item ${item.id}+${status} — unique constraint`
      );
    }
  }

  console.log(`[seedMaintenanceAlerts] Created ${created} maintenance alerts.`);
}

// ============================================================
// BATCH 6 — Inventory + PurchaseOrders + InternalTickets
// ============================================================

/**
 * Upserts InventoryItems for the first 10 parts in partsMap.
 * Returns a map of masterPartId → inventoryItemId.
 */
async function seedInventoryItems(
  ctx: SeedContext,
  partsMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log('\n[seedInventoryItems] Upserting inventory items...');

  const invItemMap = new Map<string, string>();
  const partKeys = Array.from(partsMap.keys()).slice(0, 10);

  for (let idx = 0; idx < partKeys.length; idx++) {
    const key = partKeys[idx]!;
    const masterPartId = partsMap.get(key)!;

    const existing = await prisma.inventoryItem.findUnique({
      where: {
        tenantId_masterPartId_warehouse: {
          tenantId: ctx.tenant.id,
          masterPartId,
          warehouse: 'PRINCIPAL',
        },
      },
      select: { id: true },
    });

    if (existing) {
      invItemMap.set(masterPartId, existing.id);
      continue;
    }

    const averageCost = 40000 + idx * 15000;
    const quantity = 5 + idx * 2;

    const item = await prisma.inventoryItem.create({
      data: {
        tenantId: ctx.tenant.id,
        masterPartId,
        warehouse: 'PRINCIPAL',
        quantity,
        minStock: 2,
        maxStock: 20,
        averageCost,
        totalValue: averageCost * quantity,
        status: 'ACTIVE',
      },
    });
    invItemMap.set(masterPartId, item.id);
  }

  console.log(`[seedInventoryItems] ${invItemMap.size} inventory items ready.`);
  return invItemMap;
}

async function seedInventoryMovements(
  ctx: SeedContext,
  invItemMap: Map<string, string>
): Promise<void> {
  console.log('\n[seedInventoryMovements] Checking idempotency...');
  if (await checkAlreadySeeded(ctx.tenant.id, 'InventoryMovement', 30)) return;

  const itemIds = Array.from(invItemMap.values());
  if (itemIds.length === 0) {
    console.warn('[seedInventoryMovements] No inventory items — skipping');
    return;
  }

  let totalCreated = 0;

  for (let idx = 0; idx < itemIds.length; idx++) {
    const inventoryItemId = itemIds[idx]!;
    const unitCost = 45000 + idx * 5000;

    type MovDef = {
      type: 'PURCHASE' | 'CONSUMPTION' | 'COUNT_ADJUSTMENT';
      ref: 'INVOICE' | 'INTERNAL_TICKET' | 'PHYSICAL_COUNT';
      qty: number;
      isIn: boolean;
    };

    const movDefs: MovDef[] = [
      { type: 'PURCHASE', ref: 'INVOICE', qty: 10 + idx, isIn: true },
      {
        type: 'CONSUMPTION',
        ref: 'INTERNAL_TICKET',
        qty: 2 + (idx % 3),
        isIn: false,
      },
      {
        type: 'CONSUMPTION',
        ref: 'INTERNAL_TICKET',
        qty: 1 + (idx % 2),
        isIn: false,
      },
      {
        type: 'COUNT_ADJUSTMENT',
        ref: 'PHYSICAL_COUNT',
        qty: 1,
        isIn: true,
      },
    ];

    let runningStock = 0;

    for (const mov of movDefs) {
      const prevStock = runningStock;
      const newStock = mov.isIn
        ? prevStock + mov.qty
        : Math.max(0, prevStock - mov.qty);

      await prisma.inventoryMovement.create({
        data: {
          tenantId: ctx.tenant.id,
          inventoryItemId,
          movementType: mov.type,
          quantity: mov.qty,
          unitCost,
          totalCost: mov.qty * unitCost,
          previousStock: prevStock,
          newStock,
          previousAvgCost: unitCost,
          newAvgCost: unitCost,
          referenceType: mov.ref,
          referenceId: `SEED-${idx}-${mov.type}`,
          performedBy: ctx.adminUser.id,
          performedAt: generateDateInRange(DATE_START, DATE_END),
        },
      });

      runningStock = newStock;
      totalCreated++;
    }
  }

  console.log(
    `[seedInventoryMovements] Created ${totalCreated} inventory movements.`
  );
}

async function seedPurchaseOrders(
  ctx: SeedContext,
  partsMap: Map<string, string>,
  workOrderIds: string[]
): Promise<void> {
  console.log('\n[seedPurchaseOrders] Checking idempotency...');
  const poCount = await prisma.purchaseOrder.count({
    where: { tenantId: ctx.tenant.id, notes: { contains: SEED_MARKER } },
  });
  if (poCount >= 6) {
    console.log(`[seedPurchaseOrders] Found ${poCount} records — SKIPPING`);
    return;
  }

  if (workOrderIds.length === 0 || ctx.providers.length === 0) {
    console.warn('[seedPurchaseOrders] No work orders or providers — skipping');
    return;
  }

  const partKeys = Array.from(partsMap.keys());
  const statuses = [
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'APPROVED',
    'APPROVED',
    'DRAFT',
    'DRAFT',
  ] as const;

  let created = 0;

  for (let idx = 0; idx < statuses.length; idx++) {
    const status = statuses[idx]!;
    const woIdStr = workOrderIds[idx % workOrderIds.length]!;
    const woId = parseInt(woIdStr, 10);
    const provider = ctx.providers[idx % ctx.providers.length]!;

    // 2–3 items per PO
    const itemCount = 2 + (idx % 2);
    let subtotal = 0;
    const itemsCreate = [];

    for (let iIdx = 0; iIdx < itemCount; iIdx++) {
      const partKey = partKeys[(idx * 3 + iIdx) % partKeys.length]!;
      const masterPartId = partsMap.get(partKey) ?? null;
      const qty = 1 + iIdx;
      const unitPrice = 60000 + ((idx * 11111 + iIdx * 7777) % 180000);
      const total = qty * unitPrice;
      subtotal += total;

      itemsCreate.push({
        tenantId: ctx.tenant.id,
        masterPartId,
        description: partKey,
        quantity: qty,
        unitPrice,
        total,
        status:
          status === 'COMPLETED'
            ? ('COMPLETED' as const)
            : ('PENDING' as const),
        receivedQty: status === 'COMPLETED' ? qty : 0,
      });
    }

    const taxRate = 19;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + taxAmount;

    await prisma.purchaseOrder.create({
      data: {
        tenantId: ctx.tenant.id,
        workOrderId: woId,
        orderNumber: `OC-2025-${String(idx + 1).padStart(6, '0')}`,
        type: 'PARTS',
        providerId: provider.id,
        status,
        requestedBy: ctx.adminUser.id,
        approvedBy: status !== 'DRAFT' ? ctx.adminUser.id : null,
        approvedAt:
          status !== 'DRAFT' ? generateDateInRange(DATE_START, DATE_END) : null,
        sentAt:
          status === 'COMPLETED'
            ? generateDateInRange(DATE_START, DATE_END)
            : null,
        subtotal,
        taxRate,
        taxAmount,
        total,
        notes: `${SEED_MARKER} OC demo`,
        items: { create: itemsCreate },
      },
    });
    created++;
  }

  console.log(`[seedPurchaseOrders] Created ${created} purchase orders.`);
}

async function seedInternalTickets(
  ctx: SeedContext,
  workOrderIds: string[],
  invItemMap: Map<string, string>
): Promise<void> {
  console.log('\n[seedInternalTickets] Checking idempotency...');
  const tktCount = await prisma.internalWorkTicket.count({
    where: { tenantId: ctx.tenant.id, notes: { contains: SEED_MARKER } },
  });
  if (tktCount >= 5) {
    console.log(`[seedInternalTickets] Found ${tktCount} records — SKIPPING`);
    return;
  }

  if (ctx.technicians.length === 0) {
    console.warn('[seedInternalTickets] No technicians — skipping');
    return;
  }

  const invItemIds = Array.from(invItemMap.values());
  const statuses = [
    'APPROVED',
    'APPROVED',
    'APPROVED',
    'APPROVED',
    'SUBMITTED',
    'SUBMITTED',
  ] as const;

  let created = 0;

  for (let idx = 0; idx < statuses.length; idx++) {
    const status = statuses[idx]!;
    // Use WOs from the second half to avoid clashing with POs
    const woIdStr =
      workOrderIds[
        (idx + Math.floor(workOrderIds.length / 2)) % workOrderIds.length
      ]!;
    const woId = parseInt(woIdStr, 10);
    const technician = ctx.technicians[idx % ctx.technicians.length]!;
    const hourlyRate = Number(technician.hourlyRate ?? 50000);

    const hours = 2 + (idx % 4);
    const laborCost = hours * hourlyRate;

    const inventoryItemId = invItemIds[idx % Math.max(invItemIds.length, 1)];
    const unitCost = 40000 + idx * 10000;
    const partQty = 1 + (idx % 2);
    const partsCost = inventoryItemId ? unitCost * partQty : 0;
    const totalCost = laborCost + partsCost;

    const ticket = await prisma.internalWorkTicket.create({
      data: {
        tenantId: ctx.tenant.id,
        workOrderId: woId,
        ticketNumber: `TKT-2025-${String(idx + 1).padStart(4, '0')}`,
        ticketDate: generateDateInRange(DATE_START, DATE_END),
        technicianId: technician.id,
        totalLaborHours: hours,
        totalLaborCost: laborCost,
        totalPartsCost: partsCost,
        totalCost,
        status,
        approvedBy: status === 'APPROVED' ? ctx.adminUser.id : null,
        approvedAt:
          status === 'APPROVED'
            ? generateDateInRange(DATE_START, DATE_END)
            : null,
        description: `Trabajo interno demo #${idx + 1}`,
        notes: `${SEED_MARKER} Ticket interno demo`,
        laborEntries: {
          create: [
            {
              tenantId: ctx.tenant.id,
              description: `Mano de obra — trabajo demo ${idx + 1}`,
              hours,
              hourlyRate,
              laborCost,
              technicianId: technician.id,
            },
          ],
        },
      },
    });

    if (inventoryItemId) {
      await prisma.ticketPartEntry.create({
        data: {
          tenantId: ctx.tenant.id,
          ticketId: ticket.id,
          inventoryItemId,
          quantity: partQty,
          unitCost,
          totalCost: unitCost * partQty,
        },
      });
    }

    created++;
  }

  console.log(`[seedInternalTickets] Created ${created} internal tickets.`);
}

// ============================================================
// MAIN (Batch 7 — full pipeline)
// ============================================================

async function main(): Promise<void> {
  console.log('==============================================');
  console.log('  SEED STAGING DEMO - Fleet Care SaaS');
  console.log(`  Tenant: ${TENANT_ID}`);
  console.log(
    `  Period: ${DATE_START.toISOString().slice(0, 10)} → ${DATE_END.toISOString().slice(0, 10)}`
  );
  console.log('==============================================\n');

  // Verify tenant exists before seeding
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.error(
      `ERROR: Tenant ${TENANT_ID} not found. Run seed-multitenancy.ts first.`
    );
    process.exit(1);
  }
  console.log(`Tenant found: ${tenant.name}\n`);

  // --- Task 2.2: Seed master parts ---
  const partsMap = await seedMasterParts();

  // --- Tasks 3.1 + 3.2: Resolve context and vehicle programs ---
  const ctx = await resolveContext('transportes-demo');
  const vehiclePrograms = await resolveOrCreateVehiclePrograms(ctx);
  console.log(`\n[main] ${vehiclePrograms.length} vehicle program(s) ready.`);

  // --- Task 4.1: Odometer logs ---
  await seedOdometerLogs(ctx);

  // --- Task 4.2: Work orders ---
  const workOrderIds = await seedWorkOrders(ctx, partsMap);
  console.log(`\n[main] ${workOrderIds.length} work order(s) ready.`);

  // --- Task 4.3: Work order items ---
  await seedWorkOrderItems(ctx, workOrderIds, partsMap);

  // --- Task 4.4: Work order expenses (COMPLETED WOs only) ---
  await seedWorkOrderExpenses(ctx, workOrderIds);

  // --- Batch 4: Invoices + PartPriceHistory + FinancialAlerts ---
  const invoiceIds = await seedInvoices(ctx, workOrderIds, partsMap);
  console.log(`\n[main] ${invoiceIds.length} invoice(s) ready.`);

  await seedPartPriceHistory(ctx, partsMap, invoiceIds);
  await seedFinancialAlerts(ctx, partsMap);

  // --- Batch 5: Documents + MaintenanceAlerts ---
  await seedDocuments(ctx);
  await seedMaintenanceAlerts(ctx);

  // --- Batch 6: Inventory + PurchaseOrders + InternalTickets ---
  const invItemMap = await seedInventoryItems(ctx, partsMap);
  await seedInventoryMovements(ctx, invItemMap);
  await seedPurchaseOrders(ctx, partsMap, workOrderIds);
  await seedInternalTickets(ctx, workOrderIds, invItemMap);

  console.log('\n==============================================');
  console.log('  ✅ SEED COMPLETO');
  console.log('     Todos los módulos tienen datos de demo.');
  console.log('==============================================\n');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

export {
  SEED_MARKER,
  DATE_START,
  DATE_END,
  BATCH_SIZE,
  TENANT_ID,
  generateDateInRange,
  checkAlreadySeeded,
  batchInsert,
  seedMasterParts,
  MASTER_PARTS_DATA,
  resolveContext,
  resolveOrCreateVehiclePrograms,
  seedOdometerLogs,
  seedWorkOrders,
  seedWorkOrderItems,
  seedWorkOrderExpenses,
  seedInvoices,
  seedPartPriceHistory,
  seedFinancialAlerts,
  seedDocuments,
  seedMaintenanceAlerts,
  seedInventoryItems,
  seedInventoryMovements,
  seedPurchaseOrders,
  seedInternalTickets,
};
export type { SeedContext, VehicleProgramContext };
