# serialized-assets — Tasks

> Reference documents: `spec.md`, `design.md`, `proposal.md`
> All file paths are absolute from project root `/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/`.

---

## Batch 0 — Schema Migration (sequential, blocks everything)

**Must complete before any other batch. Run as a single agent.**

- [x] **0A** — Delete existing tire migrations, rewrite schema, run migration

  **Step 1 — Delete the 3 uncommitted tire migration directories:**

  ```
  prisma/migrations/20260324191805_add_tire_tracking/
  prisma/migrations/20260324194118_add_tire_event_tread_depth/
  prisma/migrations/20260324195617_add_tire_alerts/
  ```

  **Step 2 — Update `prisma/schema.prisma`:**

  Read the current schema first. Then apply the following changes:

  _Remove the following models entirely:_
  - `Tire`
  - `VehicleTire`
  - `TireEvent`
  - `TireAlert`

  _Remove the following enums entirely:_
  - `TireStatus`
  - `TirePosition`
  - `AxleConfig`
  - `TireEventType`
  - `TireAlertStatus` (also written as `TireAlertStatus` / `VehicleTireAlertStatus`)

  _From model `Vehicle` — remove these fields:_

  ```prisma
  vehicleTires  VehicleTire[]
  tireAlerts    TireAlert[]
  axleConfig    AxleConfig @default(STANDARD_4)
  ```

  _From model `Vehicle` — add these fields:_

  ```prisma
  itemAssignments  VehicleItemAssignment[]
  itemAlerts       SerializedItemAlert[]
  axleConfig       String? @default("STANDARD_4")
  ```

  _From model `Tenant` — remove these fields:_

  ```prisma
  tires        Tire[]
  vehicleTires VehicleTire[]
  tireEvents   TireEvent[]
  tireAlerts   TireAlert[]
  ```

  _From model `Tenant` — add these fields:_

  ```prisma
  serializedItems        SerializedItem[]
  serializedItemEvents   SerializedItemEvent[]
  vehicleItemAssignments VehicleItemAssignment[]
  serializedItemAlerts   SerializedItemAlert[]
  ```

  _From model `User` — remove these fields:_

  ```prisma
  tireEvents           TireEvent[]
  tireAlertsDismissed  TireAlert[] @relation("TireAlertDismisser")
  ```

  _From model `User` — add these fields:_

  ```prisma
  serializedItemEvents  SerializedItemEvent[]
  alertsResolved        SerializedItemAlert[] @relation("AlertResolver")
  ```

  _From model `InvoiceItem` — add this field (back-relation only, no new column):_

  ```prisma
  serializedItems  SerializedItem[]
  ```

  _Add these 3 new enums:_

  ```prisma
  enum SerializedItemType {
    TIRE
    EXTINGUISHER
    OTHER
  }

  enum SerializedItemStatus {
    IN_STOCK
    INSTALLED
    RETIRED
  }

  enum SerializedItemAlertStatus {
    ACTIVE
    RESOLVED
  }
  ```

  _Add these 4 new models (full definitions from spec.md §2):_

  ```prisma
  model SerializedItem {
    id          String               @id @default(uuid())
    tenantId    String
    tenant      Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    invoiceItemId String?
    invoiceItem   InvoiceItem?       @relation(fields: [invoiceItemId], references: [id], onDelete: SetNull)

    serialNumber  String
    batchNumber   String?

    type          SerializedItemType
    status        SerializedItemStatus @default(IN_STOCK)

    receivedAt    DateTime            @default(now())
    retiredAt     DateTime?

    specs         Json?
    notes         String?

    createdAt     DateTime            @default(now())
    updatedAt     DateTime            @updatedAt

    events             SerializedItemEvent[]
    vehicleAssignments VehicleItemAssignment[]
    alerts             SerializedItemAlert[]

    @@unique([tenantId, serialNumber])
    @@index([tenantId])
    @@index([type])
    @@index([status])
    @@index([batchNumber])
    @@index([invoiceItemId])
  }

  model SerializedItemEvent {
    id               String   @id @default(uuid())
    tenantId         String
    tenant           Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    serializedItemId String
    serializedItem   SerializedItem @relation(fields: [serializedItemId], references: [id], onDelete: Cascade)

    eventType        String

    performedAt      DateTime @default(now())
    performedById    String
    performer        User     @relation(fields: [performedById], references: [id])

    vehicleKm        Int?
    specs            Json?
    notes            String?

    createdAt        DateTime @default(now())

    @@index([tenantId])
    @@index([serializedItemId])
    @@index([performedAt])
  }

  model VehicleItemAssignment {
    id               String   @id @default(uuid())
    tenantId         String
    tenant           Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    vehicleId        String
    vehicle          Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

    serializedItemId String
    serializedItem   SerializedItem @relation(fields: [serializedItemId], references: [id], onDelete: Cascade)

    position         String?

    installedAt      DateTime @default(now())
    removedAt        DateTime?

    createdAt        DateTime @default(now())
    updatedAt        DateTime @updatedAt

    @@index([tenantId])
    @@index([vehicleId])
    @@index([serializedItemId])
    @@unique([serializedItemId, removedAt])
  }

  model SerializedItemAlert {
    id               String                   @id @default(uuid())
    tenantId         String
    tenant           Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    serializedItemId String
    serializedItem   SerializedItem           @relation(fields: [serializedItemId], references: [id], onDelete: Cascade)

    vehicleId        String?
    vehicle          Vehicle?                 @relation(fields: [vehicleId], references: [id], onDelete: SetNull)

    alertType        String

    status           SerializedItemAlertStatus @default(ACTIVE)
    message          String

    createdAt        DateTime                 @default(now())
    resolvedAt       DateTime?
    resolvedById     String?
    resolver         User?                    @relation("AlertResolver", fields: [resolvedById], references: [id])

    @@index([tenantId, status])
    @@index([serializedItemId, status])
    @@index([tenantId, vehicleId, status])
  }
  ```

  **Step 3 — Run migration:**

  ```bash
  npx prisma migrate dev --name add_serialized_assets
  npx prisma generate
  ```

  **Step 4 — Verify:**
  Run `pnpm type-check` and confirm no schema-related errors remain (errors about missing tire-constants.ts or old API routes are expected and will be resolved in later batches).

---

## Batch 1 — Constants + Permissions + Services (parallel after Batch 0)

Tasks 1A, 1B, and 1C have no interdependencies and can run in parallel.

---

- [x] **1A** — Create `src/lib/serialized-asset-constants.ts` and `src/lib/services/serialized-item-alert.ts`; delete old tire files (parallel-safe)

  **Files to create:**
  - `src/lib/serialized-asset-constants.ts`
  - `src/lib/services/serialized-item-alert.ts`

  **Files to delete:**
  - `src/lib/tire-constants.ts`
  - `src/lib/services/tire-alert.ts`

  **`src/lib/serialized-asset-constants.ts`** — full content from design.md §4:

  ```ts
  export const SERIALIZED_ITEM_TYPES = {
    TIRE: 'TIRE',
    EXTINGUISHER: 'EXTINGUISHER',
    OTHER: 'OTHER',
  } as const;
  export type SerializedItemType =
    (typeof SERIALIZED_ITEM_TYPES)[keyof typeof SERIALIZED_ITEM_TYPES];

  export const SERIALIZED_ITEM_STATUSES = {
    IN_STOCK: 'IN_STOCK',
    INSTALLED: 'INSTALLED',
    RETIRED: 'RETIRED',
  } as const;
  export type SerializedItemStatus =
    (typeof SERIALIZED_ITEM_STATUSES)[keyof typeof SERIALIZED_ITEM_STATUSES];

  export const SERIALIZED_ITEM_STATUS_LABELS: Record<string, string> = {
    IN_STOCK: 'En Stock',
    INSTALLED: 'Instalado',
    RETIRED: 'Dado de baja',
  };

  export const SERIALIZED_ITEM_EVENT_TYPES = {
    ALTA: 'ALTA',
    REVISION: 'REVISION',
    ROTACION: 'ROTACION',
    BAJA: 'BAJA',
    INSPECCION: 'INSPECCION',
    RECARGA: 'RECARGA',
  } as const;
  export type SerializedItemEventType =
    (typeof SERIALIZED_ITEM_EVENT_TYPES)[keyof typeof SERIALIZED_ITEM_EVENT_TYPES];

  export const ALLOWED_EVENT_TYPES: readonly string[] = Object.values(
    SERIALIZED_ITEM_EVENT_TYPES
  );

  export const SERIALIZED_ITEM_EVENT_TYPE_LABELS: Record<string, string> = {
    ALTA: 'Alta',
    REVISION: 'Revisión',
    ROTACION: 'Rotación',
    BAJA: 'Baja',
    INSPECCION: 'Inspección',
    RECARGA: 'Recarga',
  };

  export const SERIALIZED_ITEM_ALERT_TYPES = {
    LOW_TREAD: 'LOW_TREAD',
    LOW_USEFUL_LIFE: 'LOW_USEFUL_LIFE',
    INSPECTION_DUE: 'INSPECTION_DUE',
    RECHARGE_DUE: 'RECHARGE_DUE',
  } as const;

  export const TIRE_USEFUL_LIFE_ALERT_THRESHOLD = 30;
  export const TIRE_TREAD_DEPTH_MIN_MM = 4;
  export const EXTINGUISHER_INSPECTION_WARNING_DAYS = 30;

  export const AXLE_CONFIG_LABELS: Record<string, string> = {
    STANDARD_4: 'Estándar (4)',
    PACHA_6: 'Pacha (6)',
    TRUCK_10: 'Camión (10)',
    TRUCK_14: 'Camión (14)',
    SEMI_18: 'Semi (18)',
    VAN: 'Van',
  };

  export const AXLE_CONFIG_POSITIONS: Record<string, string[]> = {
    STANDARD_4: ['FL', 'FR', 'RL', 'RR'],
    PACHA_6: ['FL', 'FR', 'ML', 'MR', 'RL', 'RR'],
    TRUCK_10: ['FL', 'FR', 'ML', 'ML2', 'MR', 'MR2', 'RL', 'RL2', 'RR', 'RR2'],
    TRUCK_14: [
      'FL',
      'FR',
      'ML',
      'ML2',
      'MR',
      'MR2',
      'RL',
      'RL2',
      'RR',
      'RR2',
      'FL2',
      'FR2',
      'FL3',
      'FR3',
    ],
    SEMI_18: [
      'FL',
      'FR',
      'ML',
      'ML2',
      'MR',
      'MR2',
      'RL',
      'RL2',
      'RR',
      'RR2',
      'FL2',
      'FR2',
      'FL3',
      'FR3',
      'RL3',
      'RR3',
      'SPARE',
    ],
    VAN: ['FL', 'FR', 'RL', 'RR', 'SPARE'],
  };

  export const TIRE_POSITION_LABELS: Record<string, string> = {
    FL: 'Del. Izq.',
    FR: 'Del. Der.',
    RL: 'Tras. Izq.',
    RR: 'Tras. Der.',
    ML: 'Med. Izq.',
    MR: 'Med. Der.',
    FL2: 'Del. Izq. 2',
    FR2: 'Del. Der. 2',
    RL2: 'Tras. Izq. 2',
    RR2: 'Tras. Der. 2',
    ML2: 'Med. Izq. 2',
    MR2: 'Med. Der. 2',
    FL3: 'Del. Izq. 3',
    FR3: 'Del. Der. 3',
    RL3: 'Tras. Izq. 3',
    RR3: 'Tras. Der. 3',
    SPARE: 'Repuesto',
  };

  export function getSerialItemColor(
    item: { specs?: { usefulLifePct?: number | null } | null } | null
  ): string {
    if (!item) return '#E5E7EB';
    const pct = item.specs?.usefulLifePct;
    if (pct === null || pct === undefined) return '#9CA3AF';
    if (pct >= 60) return '#22C55E';
    if (pct >= 30) return '#EAB308';
    return '#EF4444';
  }
  ```

  **`src/lib/services/serialized-item-alert.ts`** — Read `src/lib/services/tire-alert.ts` first (for structure reference), then create a new file that generalizes the alert logic:
  - No imports from `@/lib/tire-constants` — import only from `@/lib/serialized-asset-constants`
  - No references to `Tire`, `TireAlert`, `TireEvent` models — use `SerializedItem`, `SerializedItemAlert`
  - Import `TenantPrismaClient` from `@/lib/tenant-prisma`
  - Export the following function (signature from design.md §4):

  ```ts
  export async function evaluateAndCreateAlerts(
    itemId: string,
    specs: Record<string, unknown>,
    tenantId: string,
    vehicleId: string | null,
    tenantPrisma: TenantPrismaClient
  ): Promise<void>;
  ```

  Logic inside `evaluateAndCreateAlerts`:
  1. If `specs.usefulLifePct` is a number and < `TIRE_USEFUL_LIFE_ALERT_THRESHOLD` (30):
     - Upsert a `SerializedItemAlert` with `alertType: 'LOW_USEFUL_LIFE'`, `status: 'ACTIVE'`. Check if one already exists for this item with that alertType; if so, skip creation.
  2. Else if `specs.usefulLifePct` >= `TIRE_USEFUL_LIFE_ALERT_THRESHOLD`:
     - Resolve any existing `LOW_USEFUL_LIFE` alert for this item (set `status: 'RESOLVED'`, `resolvedAt: new Date()`).
  3. If `specs.treadDepthMm` is a number and < `TIRE_TREAD_DEPTH_MIN_MM` (4):
     - Upsert a `LOW_TREAD` alert similarly.
  4. Else if `specs.treadDepthMm` >= `TIRE_TREAD_DEPTH_MIN_MM`:
     - Resolve any existing `LOW_TREAD` alert.
  5. If `specs.nextInspectionDue` is a string date and within `EXTINGUISHER_INSPECTION_WARNING_DAYS` (30) of today:
     - Upsert an `INSPECTION_DUE` alert.
  6. Else if `nextInspectionDue` is beyond the warning window:
     - Resolve any existing `INSPECTION_DUE` alert.

  Alert creation data shape:

  ```ts
  {
    tenantId,
    serializedItemId: itemId,
    vehicleId,
    alertType: '...',
    status: 'ACTIVE',
    message: '<human-readable message in Spanish>',
  }
  ```

---

- [x] **1B** — Update `src/lib/permissions.ts`; update sidebar; update seeds (parallel-safe)

  **Files to modify:**
  - `src/lib/permissions.ts`
  - `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`
  - `prisma/seed.ts`
  - `prisma/seed-multitenancy.ts`

  **`src/lib/permissions.ts`:**
  - Read the file first to find the `TIRE PERMISSIONS` section (approximately lines 421–448 per design.md)
  - Remove all `TIRE_*` role arrays and `canViewTires` / `canManageTires` functions
  - Add the following block in their place:

  ```ts
  // ========================================
  // SERIALIZED ASSET PERMISSIONS
  // ========================================

  export const SERIALIZED_ASSET_VIEW_ROLES = [
    'OWNER',
    'MANAGER',
    'PURCHASER',
    'TECHNICIAN',
  ] as const;

  export const SERIALIZED_ASSET_CREATE_ROLES = [
    'OWNER',
    'MANAGER',
    'PURCHASER',
  ] as const;

  export const SERIALIZED_ASSET_MANAGE_ROLES = ['OWNER', 'MANAGER'] as const;

  export const SERIALIZED_ASSET_OPERATE_ROLES = [
    'OWNER',
    'MANAGER',
    'TECHNICIAN',
  ] as const;

  export function canViewSerializedAssets(role: string): boolean {
    return (SERIALIZED_ASSET_VIEW_ROLES as readonly string[]).includes(role);
  }

  export function canCreateSerializedAssets(role: string): boolean {
    return (SERIALIZED_ASSET_CREATE_ROLES as readonly string[]).includes(role);
  }

  export function canManageSerializedAssets(role: string): boolean {
    return (SERIALIZED_ASSET_MANAGE_ROLES as readonly string[]).includes(role);
  }

  export function canOperateSerializedAssets(role: string): boolean {
    return (SERIALIZED_ASSET_OPERATE_ROLES as readonly string[]).includes(role);
  }
  ```

  **`src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`:**
  - Read the file first
  - Find the entry for `/dashboard/tires` and change the `href` to `/dashboard/assets`
  - Update the label if it says "Neumáticos" or "Tires" — change it to "Activos Serializados" (or "Activos" for brevity)
  - Keep the same icon if it exists, or use any appropriate existing icon

  **`prisma/seed.ts`:**
  - Read the file first
  - Find and remove any `Tire`, `VehicleTire`, `TireEvent`, or `TireAlert` seed blocks
  - Do not add serialized-asset seed data in the global seed (it belongs only in `seed-multitenancy.ts`)

  **`prisma/seed-multitenancy.ts`:**
  - Read the file first
  - Find and remove any `Tire`, `VehicleTire`, `TireEvent`, `TireAlert` blocks
  - Add a minimal demo block for `SerializedItem` and `VehicleItemAssignment` using the pattern:
    - Create 4 demo tires with type `'TIRE'`, status `'IN_STOCK'`, serial numbers `['DEMO-SN-001', 'DEMO-SN-002', 'DEMO-SN-003', 'DEMO-SN-004']`, specs `{ treadDepthMm: 8.0, usefulLifePct: 100 }`
    - Assign 2 of them to the first demo vehicle with positions `'FL'` and `'FR'` (status `'INSTALLED'`)
    - Use `tenantPrisma.serializedItem.create(...)` and `tenantPrisma.vehicleItemAssignment.create(...)`
    - Wrap in a try/catch that logs but does not throw (matching the style of the rest of the seed file)

---

- [x] **1C** — Update `src/app/api/inventory/parts/route.ts` and `src/app/api/inventory/parts/[id]/route.ts` to accept `specifications` field (parallel-safe)

  **Files to modify:**
  - `src/app/api/inventory/parts/route.ts`
  - `src/app/api/inventory/parts/[id]/route.ts`

  **`src/app/api/inventory/parts/route.ts`:**
  - Read the file first
  - In the `POST` handler: after parsing the request body, extract `specifications` (type: `Record<string, unknown> | null | undefined`)
  - Add `specifications` to the `data` object passed to `prisma.masterPart.create()`
  - Validate: if `specifications` is provided and is not null, it must be a plain object (use `typeof specifications === 'object' && !Array.isArray(specifications)`); otherwise return 400 with `{ error: 'specifications must be a plain object' }`

  **`src/app/api/inventory/parts/[id]/route.ts`:**
  - Read the file first
  - In the `PATCH` handler: extract `specifications` from request body (same type as above)
  - Add `specifications` to the `data` object passed to `prisma.masterPart.update()`
  - Apply same validation as in POST
  - Verify that the `GET` handler already includes `specifications` in its `select` or `include` — if not, add it

---

## Batch 2 — API Routes (parallel after Batch 1)

Tasks 2A and 2B have no interdependencies and can run in parallel.

---

- [x] **2A** — Create core CRUD + bulk serialized items API routes; delete old tires CRUD routes (parallel-safe)

  **Files to create:**
  - `src/app/api/serialized-items/route.ts`
  - `src/app/api/serialized-items/bulk/route.ts`
  - `src/app/api/serialized-items/[id]/route.ts`

  **Files to delete:**
  - `src/app/api/tires/route.ts`
  - `src/app/api/tires/[id]/route.ts`

  Read `src/app/api/tires/route.ts` and `src/app/api/tires/[id]/route.ts` first to understand the existing structure and adapt it.

  ***

  **`src/app/api/serialized-items/route.ts`** — `GET /api/serialized-items`

  Auth pattern:

  ```ts
  import { requireCurrentUser } from '@/lib/auth';
  import { canViewSerializedAssets } from '@/lib/permissions';
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewSerializedAssets(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  ```

  Query params to parse from `searchParams`: `status`, `type`, `vehicleId`, `batchNumber`, `search`, `page` (default 1), `pageSize` (default 25, max 100).

  Prisma `where` builder:
  - `tenantId: user.tenantId` — always
  - Add `status` if provided (enum value)
  - Add `type` if provided (enum value)
  - If `vehicleId`: `vehicleAssignments: { some: { vehicleId, removedAt: null } }`
  - If `batchNumber`: exact match `batchNumber: batchNumber`
  - If `search`: `OR: [{ serialNumber: { contains: search, mode: 'insensitive' } }, { notes: { contains: search, mode: 'insensitive' } }]`

  `include` shape:

  ```ts
  {
    invoiceItem: { select: { id: true, description: true, unitPrice: true } },
    vehicleAssignments: {
      where: { removedAt: null },
      take: 1,
      include: { vehicle: { select: { licensePlate: true } } },
    },
    alerts: { where: { status: 'ACTIVE' }, select: { id: true } },
  }
  ```

  Use `Promise.all([tenantPrisma.serializedItem.count({ where }), tenantPrisma.serializedItem.findMany({ where, include, skip, take, orderBy: { receivedAt: 'desc' } })])`.

  Map result: `vehicleAssignments[0]` → `currentAssignment` with `vehicleLicensePlate: assignment.vehicle.licensePlate`.

  Response: `{ items, total, page, pageSize }` with status 200.

  ***

  **`src/app/api/serialized-items/bulk/route.ts`** — `POST /api/serialized-items/bulk`

  Permission: `canCreateSerializedAssets(user.role)` (OWNER + MANAGER + PURCHASER).

  Request body:

  ```ts
  {
    invoiceItemId: string,
    type: string,
    batchNumber?: string,
    items: Array<{ serialNumber: string, specs?: Record<string, unknown> }>
  }
  ```

  **Validation (before transaction):**
  1. Verify `invoiceItemId` belongs to tenant: `tenantPrisma.invoiceItem.findFirst({ where: { id: invoiceItemId } })`; return 404 if not found.
  2. Verify `items.length <= invoiceItem.quantity`; return 422 with `{ error: 'EXCEEDS_QUANTITY' }` if not.
  3. Validate `type` is in `Object.values(SERIALIZED_ITEM_TYPES)`; return 400 if not.
  4. Check for duplicate serial numbers within the request body itself (check for duplicates in the `items` array before hitting DB).
  5. Check all `serialNumber` values against existing tenant records:
     ```ts
     const existing = await tenantPrisma.serializedItem.findMany({
       where: { serialNumber: { in: serialNumbers } },
       select: { serialNumber: true },
     });
     ```
     If any found: return 422 with `{ error: 'DUPLICATE_SERIAL', duplicates: existing.map(e => e.serialNumber) }`.

  **Transaction:**

  ```ts
  const result = await tenantPrisma.$transaction(async tx => {
    const created = [];
    for (const item of items) {
      const serializedItem = await tx.serializedItem.create({
        data: {
          tenantId: user.tenantId,
          invoiceItemId,
          type,
          batchNumber,
          serialNumber: item.serialNumber,
          specs: item.specs ?? null,
          status: 'IN_STOCK',
        },
      });
      await tx.serializedItemEvent.create({
        data: {
          tenantId: user.tenantId,
          serializedItemId: serializedItem.id,
          eventType: 'ALTA',
          performedById: user.id,
        },
      });
      created.push(serializedItem.id);
    }
    return created;
  });
  ```

  Response: `{ created: result.length, ids: result }` with status 201.

  ***

  **`src/app/api/serialized-items/[id]/route.ts`** — `GET /api/serialized-items/[id]`

  Permission: `canViewSerializedAssets(user.role)`.

  Query: `tenantPrisma.serializedItem.findFirst({ where: { id, tenantId: user.tenantId }, include: { ... } })`.

  `include` shape:

  ```ts
  {
    invoiceItem: {
      select: { id: true, description: true, unitPrice: true },
      include: { invoice: { select: { invoiceNumber: true, invoiceDate: true } } },
    },
    vehicleAssignments: {
      where: { removedAt: null },
      take: 1,
      include: { vehicle: { select: { id: true, licensePlate: true } } },
    },
    events: {
      include: { performer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { performedAt: 'desc' },
    },
    alerts: { where: { status: 'ACTIVE' } },
  }
  ```

  Return 404 if not found. Map `vehicleAssignments[0]` → `currentAssignment`.

  Response shape: full detail object from spec.md §3. Status 200.

---

- [x] **2B** — Create events/assign/unassign/vehicles-summary/alerts API routes; delete remaining old tires routes (parallel-safe)

  **Files to create:**
  - `src/app/api/serialized-items/[id]/events/route.ts`
  - `src/app/api/serialized-items/[id]/assign/route.ts`
  - `src/app/api/serialized-items/[id]/unassign/route.ts`
  - `src/app/api/serialized-items/vehicles-summary/route.ts`
  - `src/app/api/serialized-items/alerts/route.ts`
  - `src/app/api/serialized-items/alerts/[id]/route.ts`

  **Files to delete:**
  - `src/app/api/tires/[id]/events/route.ts`
  - `src/app/api/tires/vehicles-summary/route.ts`
  - `src/app/api/tires/alerts/route.ts`
  - `src/app/api/tires/alerts/[id]/route.ts`
  - Check `src/app/api/vehicles/[id]/` for any tire-specific sub-routes (e.g., `tires/route.ts`); if found, delete them.

  Read the corresponding old tire route files first before writing the new ones.

  ***

  **`src/app/api/serialized-items/[id]/events/route.ts`** — `POST`

  Import: `ALLOWED_EVENT_TYPES` from `@/lib/serialized-asset-constants` and `evaluateAndCreateAlerts` from `@/lib/services/serialized-item-alert`.

  Permission check:
  - If `eventType === 'BAJA'`: `canManageSerializedAssets(user.role)` (OWNER + MANAGER only); return 403 otherwise.
  - All other types: `canOperateSerializedAssets(user.role)` (OWNER + MANAGER + TECHNICIAN).

  Validation:
  1. Item exists: `tenantPrisma.serializedItem.findFirst({ where: { id: params.id, tenantId: user.tenantId } })`; return 404 if not found.
  2. `eventType` in `ALLOWED_EVENT_TYPES`; return 400 with `{ error: 'INVALID_EVENT_TYPE' }` if not.

  Request body: `{ eventType, performedAt?, vehicleKm?, specs?, notes? }`.

  Transaction:

  ```ts
  await tenantPrisma.$transaction(async tx => {
    const event = await tx.serializedItemEvent.create({
      data: {
        tenantId: user.tenantId,
        serializedItemId: params.id,
        eventType,
        performedAt: performedAt ? new Date(performedAt) : new Date(),
        performedById: user.id,
        vehicleKm: vehicleKm ?? null,
        specs: specs ?? null,
        notes: notes ?? null,
      },
    });

    if (eventType === 'BAJA') {
      await tx.serializedItem.update({
        where: { id: params.id },
        data: {
          status: 'RETIRED',
          retiredAt: performedAt ? new Date(performedAt) : new Date(),
        },
      });
    }

    return event;
  });
  ```

  After transaction, if `eventType === 'REVISION'` and specs contain `usefulLifePct` or `treadDepthMm`:
  - Get the current active assignment vehicle ID: `tenantPrisma.vehicleItemAssignment.findFirst({ where: { serializedItemId: params.id, removedAt: null } })`
  - Call `evaluateAndCreateAlerts(params.id, specs, user.tenantId, assignment?.vehicleId ?? null, tenantPrisma)`

  Response: `{ id, eventType, performedAt }` with status 201.

  ***

  **`src/app/api/serialized-items/[id]/assign/route.ts`** — `POST`

  Permission: `canOperateSerializedAssets(user.role)`.

  Request body: `{ vehicleId, position?, installedAt? }`.

  Validation:
  1. Item exists, belongs to tenant, `status === 'IN_STOCK'` — if status is not `IN_STOCK`, return 409 with `{ error: 'ITEM_NOT_IN_STOCK' }`.
  2. Check no active assignment: `tenantPrisma.vehicleItemAssignment.findFirst({ where: { serializedItemId: id, removedAt: null } })`; if found, return 409 with `{ error: 'ITEM_ALREADY_INSTALLED', currentVehicle: vehicle.licensePlate, position: assignment.position }`.
  3. Vehicle exists in tenant: `tenantPrisma.vehicle.findFirst({ where: { id: vehicleId } })`; return 404 if not found.

  Transaction:

  ```ts
  await tenantPrisma.$transaction([
    tenantPrisma.vehicleItemAssignment.create({
      data: {
        tenantId: user.tenantId,
        vehicleId,
        serializedItemId: id,
        position: position ?? null,
        installedAt: installedAt ? new Date(installedAt) : new Date(),
      },
    }),
    tenantPrisma.serializedItem.update({
      where: { id },
      data: { status: 'INSTALLED' },
    }),
  ]);
  ```

  Response: `{ assignmentId, position, installedAt }` with status 201.

  ***

  **`src/app/api/serialized-items/[id]/unassign/route.ts`** — `POST`

  Permission: `canOperateSerializedAssets(user.role)` for return to stock; if `retire: true` additionally check `canManageSerializedAssets(user.role)` (return 403 for TECHNICIAN trying to retire).

  Request body: `{ removedAt?, retire?: boolean }`.

  Validation: Active assignment must exist; return 400 with `{ error: 'NO_ACTIVE_ASSIGNMENT' }` if not.

  Transaction:

  ```ts
  await tenantPrisma.$transaction(async tx => {
    const closedAt = removedAt ? new Date(removedAt) : new Date();

    await tx.vehicleItemAssignment.update({
      where: { id: assignment.id },
      data: { removedAt: closedAt },
    });

    if (retire) {
      await tx.serializedItem.update({
        where: { id: params.id },
        data: { status: 'RETIRED', retiredAt: closedAt },
      });
      await tx.serializedItemEvent.create({
        data: {
          tenantId: user.tenantId,
          serializedItemId: params.id,
          eventType: 'BAJA',
          performedAt: closedAt,
          performedById: user.id,
          notes: 'Dado de baja al desinstalar',
        },
      });
    } else {
      await tx.serializedItem.update({
        where: { id: params.id },
        data: { status: 'IN_STOCK' },
      });
    }
  });
  ```

  Response: `{ status: retire ? 'RETIRED' : 'IN_STOCK', removedAt }` with status 200.

  ***

  **`src/app/api/serialized-items/vehicles-summary/route.ts`** — `GET`

  Read `src/app/api/tires/vehicles-summary/route.ts` first (for the existing query structure).

  Permission: `canViewSerializedAssets(user.role)`.

  Query param: `type` (optional — filter by `TIRE | EXTINGUISHER | OTHER`).

  Key query (from design.md §3):

  ```ts
  const vehicles = await tenantPrisma.vehicle.findMany({
    where: {
      status: 'ACTIVE',
      ...(search
        ? { licensePlate: { contains: search, mode: 'insensitive' } }
        : {}),
    },
    include: {
      brand: { select: { name: true } },
      line: { select: { name: true } },
      itemAssignments: {
        where: {
          removedAt: null,
          ...(type ? { serializedItem: { type } } : {}),
        },
        include: {
          serializedItem: {
            select: { id: true, serialNumber: true, type: true, specs: true },
            include: {
              alerts: { where: { status: 'ACTIVE' }, select: { id: true } },
            },
          },
        },
      },
      itemAlerts: { where: { status: 'ACTIVE' }, select: { id: true } },
    },
    orderBy: { licensePlate: 'asc' },
  });
  ```

  Map each vehicle to the response shape (spec.md §3 `vehicles-summary` response). For `totalSlots`, use `AXLE_CONFIG_POSITIONS[v.axleConfig ?? 'STANDARD_4']?.length ?? 4`.

  Response: `{ vehicles: [...] }` with status 200.

  ***

  **`src/app/api/serialized-items/alerts/route.ts`** — `GET`

  Permission: `canViewSerializedAssets(user.role)`.

  Query param: `status` (default `'ACTIVE'`).

  Query:

  ```ts
  tenantPrisma.serializedItemAlert.findMany({
    where: { tenantId: user.tenantId, status },
    include: {
      serializedItem: { select: { id: true, serialNumber: true, type: true } },
      vehicle: { select: { id: true, licensePlate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  ```

  Response: `{ alerts: [...] }` with status 200.

  ***

  **`src/app/api/serialized-items/alerts/[id]/route.ts`** — `PATCH`

  Permission: `canManageSerializedAssets(user.role)`.

  Logic: Update the alert to `{ status: 'RESOLVED', resolvedAt: new Date(), resolvedById: user.id }`.

  Validation: Alert must exist and belong to tenant.

  Response: `{ id, status: 'RESOLVED' }` with status 200.

---

## Batch 3 — UI Components (after Batch 2 completes)

Tasks 3A, 3B, 3C can run in parallel. Task 3D must run after all three complete.

---

- [x] **3A** — Move and update `AxleDiagram` component; create `SerializedItemTable` and `ItemAlertsWidget` (parallel-safe)

  **Existing components to read first:**
  - `src/app/dashboard/tires/components/AxleDiagram/AxleDiagram.tsx`
  - `src/app/dashboard/tires/components/AxleDiagram/AxleDiagram.types.ts`
  - `src/app/dashboard/tires/components/TireTable/TireTable.tsx`
  - `src/app/dashboard/tires/components/TireTable/TireTable.types.ts`
  - `src/app/dashboard/tires/components/TireAlertsWidget/TireAlertsWidget.tsx`
  - `src/app/dashboard/tires/components/TireAlertsWidget/TireAlertsWidget.types.ts`

  **Files to create:**
  - `src/app/dashboard/assets/components/AxleDiagram/AxleDiagram.types.ts`
  - `src/app/dashboard/assets/components/AxleDiagram/AxleDiagram.tsx`
  - `src/app/dashboard/assets/components/AxleDiagram/index.ts`
  - `src/app/dashboard/assets/components/SerializedItemTable/SerializedItemTable.types.ts`
  - `src/app/dashboard/assets/components/SerializedItemTable/SerializedItemTable.tsx`
  - `src/app/dashboard/assets/components/SerializedItemTable/index.ts`
  - `src/app/dashboard/assets/components/ItemAlertsWidget/ItemAlertsWidget.types.ts`
  - `src/app/dashboard/assets/components/ItemAlertsWidget/ItemAlertsWidget.tsx`
  - `src/app/dashboard/assets/components/ItemAlertsWidget/index.ts`

  ***

  **`AxleDiagram.types.ts`** (from design.md §5):

  ```ts
  export interface SerializedSlotData {
    position: string;
    serializedItemId: string;
    serialNumber: string;
    type: string;
    specs: {
      usefulLifePct?: number | null;
      treadDepthMm?: number | null;
    } | null;
    activeAlertCount: number;
  }

  export interface AxleDiagramProps {
    axleConfig: string;
    slots: SerializedSlotData[];
    onSlotClick?: (position: string, data: SerializedSlotData | null) => void;
    className?: string;
  }
  ```

  **`AxleDiagram.tsx`** — Copy the existing `AxleDiagram.tsx` logic, then:
  - Remove all imports from `@/lib/tire-constants` — replace with `import { getSerialItemColor, AXLE_CONFIG_POSITIONS } from '@/lib/serialized-asset-constants'`
  - Remove all Prisma enum imports (`TirePosition`, `AxleConfig`) — change all position type annotations to `string`
  - Change `getSlotColor` calls to `getSerialItemColor` with the slot data shape
  - Change `tireId` references to `serializedItemId`
  - Change `tireData` references to `itemData`
  - The SVG layout logic (axle rows, slot rectangles, click areas) is unchanged
  - `getAxleLayout(axleConfig: string)` — same switch structure with string position labels
  - Helper functions (`singleLeft`, `singleRight`, `doubleRow`, etc.) accept `string` position param

  **`index.ts`** barrel: `export { AxleDiagram } from './AxleDiagram';`

  ***

  **`SerializedItemTable.types.ts`** (from design.md §5):

  ```ts
  export interface SerializedItemRow {
    id: string;
    serialNumber: string;
    batchNumber: string | null;
    type: string;
    status: string;
    receivedAt: string;
    specs: Record<string, unknown> | null;
    invoiceItem: { description: string; unitPrice: number } | null;
    currentAssignment: {
      vehicleLicensePlate: string;
      position: string | null;
    } | null;
    activeAlertCount: number;
  }

  export interface SerializedItemTableProps {
    items: SerializedItemRow[];
    isLoading: boolean;
    onRowClick: (item: SerializedItemRow) => void;
  }
  ```

  **`SerializedItemTable.tsx`** — Adapt from `TireTable.tsx`:
  - Read `TireTable.tsx` to understand the column structure and shadcn Table usage
  - Columns: Serial # | Type (badge using `SERIALIZED_ITEM_TYPES` labels) | Status (badge using `SERIALIZED_ITEM_STATUS_LABELS`) | Vehicle / Position | Alerts (red badge if `activeAlertCount > 0`) | Purchase origin (`invoiceItem.description` or "—") | Received date (formatted)
  - No delete column/action — rows are read-only from the table; clicking a row calls `onRowClick`
  - Import labels from `@/lib/serialized-asset-constants`
  - Show a loading skeleton when `isLoading` is true (use shadcn Skeleton)
  - Show empty state when `items.length === 0`

  **`index.ts`** barrel: `export { SerializedItemTable } from './SerializedItemTable';`

  ***

  **`ItemAlertsWidget.types.ts`** (from design.md §5):

  ```ts
  export interface SerializedItemAlertRow {
    id: string;
    alertType: string;
    message: string;
    createdAt: string;
    serializedItem: { id: string; serialNumber: string; type: string };
    vehicle: { id: string; licensePlate: string } | null;
  }

  export interface ItemAlertsWidgetProps {
    alerts: SerializedItemAlertRow[];
    onResolve: (alertId: string) => void;
  }
  ```

  **`ItemAlertsWidget.tsx`** — Adapt from `TireAlertsWidget.tsx`:
  - Read `TireAlertsWidget.tsx` first
  - Display alert list with: alert type label, message, serial number, vehicle plate (if assigned), createdAt date
  - Each alert has a "Resolver" button that calls `onResolve(alert.id)`
  - Show empty state ("No hay alertas activas") when `alerts.length === 0`
  - Import any needed constants from `@/lib/serialized-asset-constants`

  **`index.ts`** barrel: `export { ItemAlertsWidget } from './ItemAlertsWidget';`

---

- [x] **3B** — Create `SerializedItemDetail` component (parallel-safe)

  **Existing components to read first:**
  - `src/app/dashboard/tires/components/TireSlotDialog/TireSlotDialog.tsx`
  - `src/app/dashboard/tires/components/TireSlotDialog/TireSlotDialog.types.ts`
  - `src/app/dashboard/tires/components/TireDetailSheet/TireDetailSheet.tsx`
  - `src/app/dashboard/tires/components/TireDetailSheet/TireDetailSheet.types.ts`

  **Files to create:**
  - `src/app/dashboard/assets/components/SerializedItemDetail/SerializedItemDetail.types.ts`
  - `src/app/dashboard/assets/components/SerializedItemDetail/SerializedItemDetail.tsx`
  - `src/app/dashboard/assets/components/SerializedItemDetail/index.ts`

  **`SerializedItemDetail.types.ts`** (from design.md §5):

  ```ts
  export interface ActiveAlert {
    id: string;
    alertType: string;
    message: string;
    createdAt: string;
  }

  export interface SerializedItemDetailData {
    id: string;
    serialNumber: string;
    batchNumber: string | null;
    type: string;
    status: string;
    receivedAt: string;
    retiredAt: string | null;
    specs: Record<string, unknown> | null;
    notes: string | null;
    invoiceItem: {
      id: string;
      description: string;
      unitPrice: number;
      invoice: { invoiceNumber: string; invoiceDate: string };
    } | null;
    currentAssignment: {
      id: string;
      vehicleId: string;
      vehicleLicensePlate: string;
      position: string | null;
      installedAt: string;
    } | null;
    events: Array<{
      id: string;
      eventType: string;
      performedAt: string;
      performer: { id: string; firstName: string; lastName: string };
      vehicleKm: number | null;
      specs: Record<string, unknown> | null;
      notes: string | null;
    }>;
    activeAlerts: ActiveAlert[];
  }

  export interface SerializedItemDetailProps {
    itemId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRefresh: () => void;
    vehicleContext?: {
      vehicleId: string;
      vehicleLicensePlate: string;
      position: string;
    };
  }
  ```

  **`SerializedItemDetail.tsx`** — New component combining TireSlotDialog + TireDetailSheet:
  - Use shadcn `Sheet` (side panel) as the container
  - Internal state: `data: SerializedItemDetailData | null`, `isLoading: boolean`, `showEventDialog: boolean`
  - On `open && itemId` change: fetch `GET /api/serialized-items/${itemId}` and set `data`
  - Show loading state while fetching
  - Sections to render (from design.md §5 key behavior):
    1. Header: serial number, type badge (`SERIALIZED_ITEM_TYPES`), status badge (`SERIALIZED_ITEM_STATUS_LABELS`)
    2. Assignment info: current vehicle plate + position (if `status === 'INSTALLED'`)
    3. Invoice origin: `invoiceItem.invoice.invoiceNumber`, description, unit price (formatted as CLP currency or with locale)
    4. Specs section (conditional on `data.type`):
       - TIRE: show "Profundidad de surco" (`specs.treadDepthMm` mm), "Vida útil" (`specs.usefulLifePct`%), progress bar colored via `getSerialItemColor`
       - EXTINGUISHER: show "Presión" (`specs.pressure`), "Próxima inspección" (`specs.nextInspectionDue`)
    5. Active alerts: list of `activeAlerts` (red background, alertType label + message)
    6. Event history: chronological list (newest first) of `events`; each entry shows: eventType label, performedAt date, performer name, vehicleKm if present, specs summary
  - Action buttons (shown conditionally):
    - "Registrar evento" (always, if item is not RETIRED) → sets `showEventDialog: true`
    - "Desinstalar" (if `status === 'INSTALLED'`) → calls `POST /api/serialized-items/${itemId}/unassign` with `{ retire: false }`, then calls `onRefresh()`
    - "Dar de baja" (if status is not RETIRED, role must be checked client-side using a `userRole` prop or context) → calls `POST /api/serialized-items/${itemId}/unassign` with `{ retire: true }` (or directly via events if IN_STOCK), then calls `onRefresh()`
  - Renders `SerialItemEventDialog` when `showEventDialog === true` (imported locally)
  - On `SerialItemEventDialog.onSuccess`: close dialog, re-fetch item data, call `onRefresh()`

  **`index.ts`** barrel: `export { SerializedItemDetail } from './SerializedItemDetail';`

---

- [x] **3C** — Create `SerialItemEventDialog`, `SerialIntakeDialog`, and `SelectSerialDialog` components (parallel-safe)

  **Existing components to read first:**
  - `src/app/dashboard/tires/components/AddTireEventDialog/AddTireEventDialog.tsx`
  - `src/app/dashboard/tires/components/AddTireEventDialog/AddTireEventDialog.types.ts`
  - `src/app/dashboard/tires/components/SelectTireDialog/SelectTireDialog.tsx`
  - `src/app/dashboard/tires/components/SelectTireDialog/SelectTireDialog.types.ts`
  - `src/app/dashboard/tires/components/AddTireDialog/AddTireDialog.tsx` (for form structure reference)

  **Files to create:**
  - `src/app/dashboard/assets/components/SerialItemEventDialog/SerialItemEventDialog.types.ts`
  - `src/app/dashboard/assets/components/SerialItemEventDialog/SerialItemEventDialog.form.ts`
  - `src/app/dashboard/assets/components/SerialItemEventDialog/SerialItemEventDialog.tsx`
  - `src/app/dashboard/assets/components/SerialItemEventDialog/index.ts`
  - `src/app/dashboard/assets/components/SerialIntakeDialog/SerialIntakeDialog.types.ts`
  - `src/app/dashboard/assets/components/SerialIntakeDialog/SerialIntakeDialog.form.ts`
  - `src/app/dashboard/assets/components/SerialIntakeDialog/SerialIntakeDialog.tsx`
  - `src/app/dashboard/assets/components/SerialIntakeDialog/index.ts`
  - `src/app/dashboard/assets/components/SelectSerialDialog/SelectSerialDialog.types.ts`
  - `src/app/dashboard/assets/components/SelectSerialDialog/SelectSerialDialog.tsx`
  - `src/app/dashboard/assets/components/SelectSerialDialog/index.ts`

  ***

  **`SerialItemEventDialog.types.ts`** (from design.md §5):

  ```ts
  export interface SerialItemEventDialogProps {
    itemId: string;
    itemSerialNumber: string;
    itemType: string;
    currentStatus: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
  }
  ```

  **`SerialItemEventDialog.form.ts`** (from design.md §5):

  ```ts
  import { z } from 'zod';

  export const serialItemEventSchema = z.object({
    eventType: z.string().min(1, 'Requerido'),
    performedAt: z.string(),
    vehicleKm: z.number().int().nonneg().optional(),
    specs: z.record(z.unknown()).optional(),
    notes: z.string().max(500).optional(),
  });

  export type SerialItemEventFormValues = z.infer<typeof serialItemEventSchema>;
  ```

  **`SerialItemEventDialog.tsx`** — Adapt from `AddTireEventDialog.tsx`:
  - Use shadcn `Dialog` container
  - Form fields:
    - `eventType` select: options depend on `itemType` prop:
      - TIRE: ALTA, REVISION, ROTACION, BAJA
      - EXTINGUISHER: ALTA, INSPECCION, RECARGA, BAJA
      - OTHER: ALTA, BAJA
      - Display labels using `SERIALIZED_ITEM_EVENT_TYPE_LABELS` from `@/lib/serialized-asset-constants`
    - `performedAt` date+time picker (default: now)
    - `vehicleKm` number input (optional, label: "Kilómetros del vehículo")
    - Dynamic `specs` sub-form (rendered based on selected `eventType`):
      - `REVISION` → two number fields: "Profundidad de surco (mm)" → `specs.treadDepthMm`, "Vida útil (%)" → `specs.usefulLifePct`
      - `INSPECCION` → number field: "Presión" → `specs.pressure`; date field: "Próxima inspección" → `specs.nextInspectionDue`
      - `RECARGA` → number field: "Presión" → `specs.pressure`; text field: "Recargado por" → `specs.rechargedBy`
      - Others → no sub-form
    - `notes` textarea (optional, max 500 chars)
  - On submit: `POST /api/serialized-items/${itemId}/events` with form values
  - On success: toast "Evento registrado", call `onSuccess()`, close dialog
  - On error: show inline error message

  **`index.ts`** barrel: `export { SerialItemEventDialog } from './SerialItemEventDialog';`

  ***

  **`SerialIntakeDialog.types.ts`** (from design.md §5):

  ```ts
  export interface SerialIntakeDialogProps {
    invoiceItemId: string;
    invoiceItemDescription: string;
    quantity: number;
    type: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (createdCount: number) => void;
  }
  ```

  **`SerialIntakeDialog.form.ts`**:

  ```ts
  import { z } from 'zod';

  export const serialIntakeSchema = z.object({
    batchNumber: z.string().optional(),
    items: z
      .array(
        z.object({
          serialNumber: z.string().min(1, 'Número de serie requerido'),
          specs: z.record(z.unknown()).optional(),
        })
      )
      .min(1),
  });

  export type SerialIntakeFormValues = z.infer<typeof serialIntakeSchema>;
  ```

  **`SerialIntakeDialog.tsx`** — New component (no direct equivalent):
  - Use shadcn `Dialog` container
  - Header shows: `invoiceItemDescription`, "Registrar `quantity` unidades"
  - Form: `batchNumber` text input (optional, shared across all items, label: "Número de lote")
  - Dynamic item rows: render exactly `quantity` rows, each with:
    - Serial number input (required, unique within the form — show inline error if duplicate)
    - For TIRE type: optional "Profundidad inicial (mm)" field defaulting to 8.0 → `specs.treadDepthMm`; optional "Vida útil inicial (%)" defaulting to 100 → `specs.usefulLifePct`
  - Client-side duplicate detection: before submitting, check that all serial numbers within the form are unique
  - On submit: `POST /api/serialized-items/bulk` with `{ invoiceItemId, type, batchNumber, items }`
  - Handle 422 response with `DUPLICATE_SERIAL` error: highlight the duplicate serial number fields
  - On success: toast "N activos registrados", call `onSuccess(createdCount)`, close dialog

  **`index.ts`** barrel: `export { SerialIntakeDialog } from './SerialIntakeDialog';`

  ***

  **`SelectSerialDialog.types.ts`** (from design.md §5):

  ```ts
  export interface SelectSerialDialogProps {
    vehicleId: string;
    vehicleLicensePlate: string;
    position: string;
    itemType: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
  }
  ```

  **`SelectSerialDialog.tsx`** — Adapt from `SelectTireDialog.tsx`:
  - Use shadcn `Dialog` container
  - On open: fetch `GET /api/serialized-items?status=IN_STOCK&type=${itemType}`
  - Show searchable list of available items:
    - Each row: serial number, batch number (if present), specs summary (tread depth + useful life for TIRE, pressure for EXTINGUISHER), received date
    - Selected row is highlighted
  - "Confirmar" button: disabled until a row is selected
  - On confirm: `POST /api/serialized-items/${selectedId}/assign` with `{ vehicleId, position, installedAt: new Date().toISOString() }`
  - On success: toast "Activo instalado en posición `position`", call `onSuccess()`
  - On error: show inline error message

  **`index.ts`** barrel: `export { SelectSerialDialog } from './SelectSerialDialog';`

---

- [x] **3D** — Create `assets/page.tsx`; delete `dashboard/tires/` directory (must run after 3A, 3B, 3C complete)

  **Existing file to read first:**
  - `src/app/dashboard/tires/page.tsx`

  **Files to create:**
  - `src/app/dashboard/assets/page.tsx`

  **Files/directories to delete:**
  - `src/app/dashboard/tires/` (entire directory — only after the new page is confirmed created)

  ***

  **`src/app/dashboard/assets/page.tsx`** — Adapt from `tires/page.tsx`:

  This is a client component (`'use client'`). Read the existing tires page carefully to understand the state structure and adapt it.

  State variables (from design.md §5 state mapping):

  ```ts
  const [items, setItems] = useState<SerializedItemRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [filterStatus, setFilterStatus] = useState('_all');
  const [filterType, setFilterType] = useState('_all'); // NEW
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState(''); // NEW
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Vehicles tab state
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [slotDialogData, setSlotDialogData] = useState<{
    vehicleId: string;
    position: string;
    itemData: SerializedSlotData | null;
  } | null>(null);
  const [selectSerialOpen, setSelectSerialOpen] = useState(false);
  ```

  Data fetching functions:
  - `fetchItems()`: `GET /api/serialized-items` with all active filters → sets `items` and `totalItems`
  - `fetchVehicles()`: `GET /api/serialized-items/vehicles-summary` → sets `vehicles`
  - Both should debounce the search inputs (300ms)

  Page structure (from design.md §5):

  ```
  <div className="p-6">
    <h1>Activos Serializados</h1>
    <Tabs defaultValue="vehicles">
      <TabsList>
        <TabsTrigger value="vehicles">Vehículos</TabsTrigger>
        <TabsTrigger value="inventory">Inventario</TabsTrigger>
      </TabsList>

      <TabsContent value="vehicles">
        <Input placeholder="Buscar vehículo..." value={vehicleSearch} onChange={...} />
        {/* Vehicle cards grid */}
        {vehicles.map(v => (
          <VehicleCard onClick={() => setSelectedVehicleId(v.vehicleId)} ... />
        ))}
        {selectedVehicleId && (
          <div className="flex gap-4">
            <AxleDiagram
              axleConfig={selectedVehicle.axleConfig}
              slots={selectedVehicle.assignments.map(...)}
              onSlotClick={(position, data) => {
                if (data) {
                  setSelectedItemId(data.serializedItemId);
                  setDetailOpen(true);
                } else {
                  setSlotDialogData({ vehicleId: selectedVehicleId, position, itemData: null });
                  setSelectSerialOpen(true);
                }
              }}
            />
            <SerializedItemDetail
              itemId={selectedItemId}
              open={detailOpen}
              onOpenChange={setDetailOpen}
              onRefresh={fetchVehicles}
            />
          </div>
        )}
      </TabsContent>

      <TabsContent value="inventory">
        {/* Filter bar */}
        <div className="flex gap-2 mb-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectItem value="_all">Todos los estados</SelectItem>
            {Object.entries(SERIALIZED_ITEM_STATUS_LABELS).map(...)}
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectItem value="_all">Todos los tipos</SelectItem>
            <SelectItem value="TIRE">Neumático</SelectItem>
            <SelectItem value="EXTINGUISHER">Extintor</SelectItem>
            <SelectItem value="OTHER">Otro</SelectItem>
          </Select>
          <Input placeholder="Buscar..." value={filterSearch} onChange={...} />
          <Input placeholder="Número de lote..." value={filterBatch} onChange={...} />
        </div>
        <SerializedItemTable
          items={items}
          isLoading={isLoadingItems}
          onRowClick={(item) => { setSelectedItemId(item.id); setDetailOpen(true); }}
        />
        <SerializedItemDetail
          itemId={selectedItemId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onRefresh={fetchItems}
        />
      </TabsContent>
    </Tabs>

    {/* Dialogs */}
    <SelectSerialDialog
      vehicleId={slotDialogData?.vehicleId ?? ''}
      vehicleLicensePlate={...}
      position={slotDialogData?.position ?? ''}
      itemType="TIRE"
      open={selectSerialOpen}
      onOpenChange={setSelectSerialOpen}
      onSuccess={() => { setSelectSerialOpen(false); fetchVehicles(); }}
    />
  </div>
  ```

  Imports needed:
  - `import { AxleDiagram } from './components/AxleDiagram'`
  - `import { SerializedItemDetail } from './components/SerializedItemDetail'`
  - `import { SerializedItemTable } from './components/SerializedItemTable'`
  - `import { SelectSerialDialog } from './components/SelectSerialDialog'`
  - `import { ItemAlertsWidget } from './components/ItemAlertsWidget'`
  - `import { SERIALIZED_ITEM_STATUS_LABELS } from '@/lib/serialized-asset-constants'`
  - shadcn: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Input`, `Select`, `SelectItem`, etc.

  After creating `assets/page.tsx`, delete the entire `src/app/dashboard/tires/` directory.

---

## Batch 4 — MasterPart Specs UI (parallel-safe with Batches 1 and 2, independent)

This batch can start immediately after Batch 0 completes. It does not depend on Batches 1, 2, or 3.

Tasks 4A, 4B, and 4C can run in parallel.

---

- [ ] **4A** — Update `FormAddPart` to show Technical Specs section for NEUMÁTICOS category (parallel-safe)

  **Files to read first:**
  - `src/app/dashboard/inventory/parts/components/FormAddPart/FormAddPart.tsx`
  - `src/app/dashboard/inventory/parts/components/FormAddPart/FormAddPart.form.ts`
  - `src/app/dashboard/inventory/parts/components/FormAddPart/FormAddPart.types.ts`
  - `src/app/dashboard/inventory/parts/components/constants.ts` (for category constants)

  **Files to modify:**
  - `src/app/dashboard/inventory/parts/components/FormAddPart/FormAddPart.form.ts`
  - `src/app/dashboard/inventory/parts/components/FormAddPart/FormAddPart.tsx`

  **`FormAddPart.form.ts`** changes:
  - Add `specifications: z.record(z.unknown()).nullable().optional()` to the Zod schema

  **`FormAddPart.tsx`** changes:
  - Watch the `category` form field value
  - When `category` is the tire/neumático category value (check `constants.ts` for the exact string — likely `'NEUMATICOS'` or `'NEUMÁTICOS'`), show a "Especificaciones técnicas" collapsible section with:
    - Text input: "Rodado / Talla" → `specifications.rodado` (e.g., "205/65R16")
    - Text input: "Índice de carga" → `specifications.loadIndex` (e.g., "91")
    - Text input: "Índice de velocidad" → `specifications.speedRating` (e.g., "H")
  - On submit: include `specifications` in the POST body as a plain object (omit if no values entered)
  - The `specifications` field should only appear when the selected category matches the tire category; hide it for other categories

---

- [ ] **4B** — Update `FormEditPart` to show and pre-populate Technical Specs section (parallel-safe)

  **Files to read first:**
  - `src/app/dashboard/inventory/parts/components/FormEditPart/FormEditPart.tsx`
  - `src/app/dashboard/inventory/parts/components/FormEditPart/FormEditPart.form.ts`
  - `src/app/dashboard/inventory/parts/components/FormEditPart/FormEditPart.types.ts`

  **Files to modify:**
  - `src/app/dashboard/inventory/parts/components/FormEditPart/FormEditPart.form.ts`
  - `src/app/dashboard/inventory/parts/components/FormEditPart/FormEditPart.tsx`

  Changes are identical to 4A but for the edit form:
  - Add `specifications` to the Zod schema
  - Pre-populate the specifications fields from `defaultValues.specifications` (read the existing `specifications: Record<string, unknown> | null` from the API response)
  - Show the same "Especificaciones técnicas" section when `category` is the tire category
  - On submit: include `specifications` in the PATCH body

---

- [ ] **4C** — Update `PartsList` to show rodado badge for tire parts (parallel-safe)

  **Files to read first:**
  - `src/app/dashboard/inventory/parts/components/PartsList/PartsList.tsx`
  - `src/app/dashboard/inventory/parts/components/PartsList/PartsList.types.ts`

  **Files to modify:**
  - `src/app/dashboard/inventory/parts/components/PartsList/PartsList.tsx`

  Changes:
  - Check if the part's `specifications?.rodado` is a non-empty string
  - If so, render a small badge (shadcn `Badge` with variant `outline` or `secondary`) showing the rodado value (e.g., "205/65R16") next to the part name
  - The badge should only appear for tire parts (where `specifications.rodado` exists); other parts are unaffected
  - No type changes needed to `PartsList.types.ts` if `specifications` is already present in the part data shape; if not, add `specifications: Record<string, unknown> | null` to the part item interface

---

## Batch 5 — Final Verification (sequential, after all batches)

- [ ] **5A** — Run type-check and build verification

  ```bash
  pnpm type-check
  ```

  Must pass with zero TypeScript errors.

  ```bash
  pnpm build
  ```

  Must succeed with no module-not-found errors.

  If errors remain:
  - Module not found for `tire-constants` → some file still imports it; search for `from '@/lib/tire-constants'` and update to `@/lib/serialized-asset-constants`
  - Module not found for `tire-alert` → search for `from '@/lib/services/tire-alert'` and update to `@/lib/services/serialized-item-alert`
  - Type errors on `axleConfig` → the field is now `String?` not an enum; update any code that used `AxleConfig.STANDARD_4` to the string `'STANDARD_4'`
  - Type errors on `TirePosition` → update any remaining references to `string`

- [ ] **5B** — Manual smoke test checklist
  - [ ] Navigate to `/dashboard/assets` — page loads with Vehículos and Inventario tabs
  - [ ] In Inventario tab: filters (status, type, search, batch) work and update the table
  - [ ] Click a row in the table: `SerializedItemDetail` sheet opens with correct data
  - [ ] From "Registrar evento": submit a REVISION event with tread depth + useful life — check that the event appears in the detail history
  - [ ] In Vehículos tab: vehicle cards load; selecting one shows AxleDiagram
  - [ ] Click an empty slot: `SelectSerialDialog` opens with IN_STOCK items
  - [ ] Select an item and confirm: assignment is created; axle diagram refreshes
  - [ ] Click an occupied slot: `SerializedItemDetail` opens; "Desinstalar" button is visible
  - [ ] Run bulk intake: navigate to an invoice with an InvoiceItem, trigger `SerialIntakeDialog`, enter serial numbers, confirm — check items appear in inventory
  - [ ] Navigate to `/dashboard/inventory/parts` → add a tire part with rodado field → confirm badge appears in list

---

## Summary

| Batch     | Tasks                                                        | Notes                                                     |
| --------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Batch 0   | 1 task (0A)                                                  | Sequential — blocks everything                            |
| Batch 1   | 3 tasks (1A, 1B, 1C)                                         | Parallel after Batch 0                                    |
| Batch 2   | 2 tasks (2A, 2B)                                             | Parallel after Batch 1                                    |
| Batch 3   | 4 tasks (3A, 3B, 3C parallel; 3D sequential after all three) | After Batch 2                                             |
| Batch 4   | 3 tasks (4A, 4B, 4C)                                         | Parallel — independent of Batches 1-3, only needs Batch 0 |
| Batch 5   | 2 tasks (5A, 5B)                                             | Sequential — after all batches complete                   |
| **Total** | **15 tasks**                                                 |                                                           |
