# Design: Serialized Asset Tracking

**Change**: `serialized-assets`
**Status**: Draft
**Date**: 2026-03-24

---

## 1. Architecture Overview

### Layer Diagram

```
Prisma Schema (PostgreSQL / Neon)
  SerializedItem  ──┬── SerializedItemEvent
                   ├── VehicleItemAssignment → Vehicle
                   └── SerializedItemAlert   → Vehicle
  InvoiceItem ──────┘ (invoiceItemId, optional)

API Layer  src/app/api/serialized-items/
  route.ts                   GET  (list, paginated, filtered)
  bulk/route.ts              POST (N items from one InvoiceItem, atomic)
  vehicles-summary/route.ts  GET  (all vehicles + active assignments)
  [id]/route.ts              GET  (full detail: events, assignment, alerts)
  [id]/events/route.ts       POST (record lifecycle event)
  [id]/assign/route.ts       POST (assign item to vehicle position)
  [id]/unassign/route.ts     POST (close current assignment, optional retire)
  alerts/route.ts            GET  (list active alerts for tenant)
  alerts/[id]/route.ts       PATCH (resolve alert)

Constants / Services  src/lib/
  serialized-asset-constants.ts   (replaces tire-constants.ts)
  services/serialized-item-alert.ts (replaces tire-alert.ts)
  permissions.ts               (extend with SERIALIZED_ASSET_* functions)

Dashboard  src/app/dashboard/assets/     (replaces dashboard/tires/)
  page.tsx                     Tabs: Vehículos | Inventario
  components/
    AxleDiagram/               (existing, update types only)
    SerializedItemDetail/      (replaces TireSlotDialog + TireDetailSheet)
    SerialItemEventDialog/     (replaces AddTireEventDialog)
    SerialIntakeDialog/        (new — bulk serial intake post-purchase)
    SelectSerialDialog/        (replaces SelectTireDialog)
    SerializedItemTable/       (replaces TireTable)
    ItemAlertsWidget/          (replaces TireAlertsWidget)
```

### How SerializedItem Fits into the Inventory Flow

```
InvoiceItem (quantity=N, masterPartId)
       │
       │  "Serialize assets" action on invoice detail
       ▼
SerialIntakeDialog  ──POST /api/serialized-items/bulk──►  SerializedItem × N
                                                          (status=IN_STOCK)
                                                          auto ALTA event × N
       │
       │  user picks item in axle diagram empty slot
       ▼
VehicleItemAssignment  (position, installedAt, removedAt=null)
  item.status → INSTALLED

       │  "Record event" on installed item
       ▼
SerializedItemEvent  (eventType, specs, vehicleKm)
  alert service evaluates thresholds → SerializedItemAlert (if breach)

       │  "Retire" on unassign
       ▼
item.status → RETIRED, auto BAJA event
```

### Final Directory Structure

```
src/app/api/serialized-items/
  route.ts
  bulk/
    route.ts
  vehicles-summary/
    route.ts
  alerts/
    route.ts
    [id]/
      route.ts
  [id]/
    route.ts
    events/
      route.ts
    assign/
      route.ts
    unassign/
      route.ts

src/app/dashboard/assets/
  page.tsx
  components/
    AxleDiagram/
      AxleDiagram.tsx
      AxleDiagram.types.ts
      index.ts
    SerializedItemDetail/
      SerializedItemDetail.tsx
      SerializedItemDetail.types.ts
      index.ts
    SerialItemEventDialog/
      SerialItemEventDialog.tsx
      SerialItemEventDialog.types.ts
      SerialItemEventDialog.form.ts
      index.ts
    SerialIntakeDialog/
      SerialIntakeDialog.tsx
      SerialIntakeDialog.types.ts
      SerialIntakeDialog.form.ts
      index.ts
    SelectSerialDialog/
      SelectSerialDialog.tsx
      SelectSerialDialog.types.ts
      index.ts
    SerializedItemTable/
      SerializedItemTable.tsx
      SerializedItemTable.types.ts
      index.ts
    ItemAlertsWidget/
      ItemAlertsWidget.tsx
      ItemAlertsWidget.types.ts
      index.ts
```

---

## 2. Schema Migration Plan

### Step 1 — Delete Existing Uncommitted Tire Migrations

Remove these three directories entirely (they are not deployed to production):

- `prisma/migrations/20260324191805_add_tire_tracking/`
- `prisma/migrations/20260324194118_add_tire_event_tread_depth/`
- `prisma/migrations/20260324195617_add_tire_alerts/`

### Step 2 — Update `prisma/schema.prisma`

**Remove:**

- Models: `Tire`, `VehicleTire`, `TireEvent`, `TireAlert`
- Enums: `TireStatus`, `TirePosition`, `AxleConfig`, `TireEventType`, `TireAlertStatus`
- From `Vehicle`: `vehicleTires VehicleTire[]`, `tireAlerts TireAlert[]`, `axleConfig AxleConfig @default(STANDARD_4)`
- From `Tenant`: `tires Tire[]`, `vehicleTires VehicleTire[]`, `tireEvents TireEvent[]`, `tireAlerts TireAlert[]`
- From `User`: `tireEvents TireEvent[]`, `tireAlertsDismissed TireAlert[] @relation("TireAlertDismisser")`

**Add enums:**

```prisma
enum SerializedItemType     { TIRE  EXTINGUISHER  OTHER }
enum SerializedItemStatus   { IN_STOCK  INSTALLED  RETIRED }
enum SerializedItemAlertStatus { ACTIVE  RESOLVED }
```

**Add to `Vehicle`:**

```prisma
itemAssignments  VehicleItemAssignment[]
itemAlerts       SerializedItemAlert[]
axleConfig       String?  @default("STANDARD_4")
```

**Add to `Tenant`:**

```prisma
serializedItems        SerializedItem[]
serializedItemEvents   SerializedItemEvent[]
vehicleItemAssignments VehicleItemAssignment[]
serializedItemAlerts   SerializedItemAlert[]
```

**Add to `User`:**

```prisma
serializedItemEvents  SerializedItemEvent[]
alertsResolved        SerializedItemAlert[] @relation("AlertResolver")
```

**Add to `InvoiceItem`:**

```prisma
serializedItems  SerializedItem[]
```

**Add 4 new models:** See spec.md §2 for the full model definitions.

### Step 3 — Generate One Clean Migration

```bash
npx prisma migrate dev --name add_serialized_assets
```

This produces `prisma/migrations/YYYYMMDDHHMMSS_add_serialized_assets/migration.sql`.

### Model Relationships with Cardinality

```
Tenant          1 ──< SerializedItem
InvoiceItem     1 ──< SerializedItem          (optional FK, SetNull on delete)
SerializedItem  1 ──< SerializedItemEvent
SerializedItem  1 ──< VehicleItemAssignment
SerializedItem  1 ──< SerializedItemAlert
Vehicle         1 ──< VehicleItemAssignment
Vehicle         1 ──< SerializedItemAlert      (snapshot FK, SetNull on delete)
User            1 ──< SerializedItemEvent      (performedById)
User            1 ──< SerializedItemAlert      (resolvedById, optional)
Tenant          1 ──< SerializedItemEvent
Tenant          1 ──< VehicleItemAssignment
Tenant          1 ──< SerializedItemAlert
```

### Index Strategy

| Table                   | Index                                               | Rationale                        |
| ----------------------- | --------------------------------------------------- | -------------------------------- |
| `SerializedItem`        | `(tenantId)`                                        | Every query is tenant-scoped     |
| `SerializedItem`        | `(type)`                                            | Filter by TIRE / EXTINGUISHER    |
| `SerializedItem`        | `(status)`                                          | List IN_STOCK items for picker   |
| `SerializedItem`        | `(batchNumber)`                                     | Recall queries                   |
| `SerializedItem`        | `(invoiceItemId)`                                   | Show items per invoice line      |
| `SerializedItem`        | `@@unique([tenantId, serialNumber])`                | Duplicate prevention             |
| `SerializedItemEvent`   | `(tenantId)`, `(serializedItemId)`, `(performedAt)` | Event history queries            |
| `VehicleItemAssignment` | `(tenantId)`, `(vehicleId)`, `(serializedItemId)`   | Dashboard vehicle lookups        |
| `VehicleItemAssignment` | `@@unique([serializedItemId, removedAt])`           | Enforce single active assignment |
| `SerializedItemAlert`   | `(tenantId, status)`                                | Active alert list                |
| `SerializedItemAlert`   | `(serializedItemId, status)`                        | Alerts per item                  |
| `SerializedItemAlert`   | `(tenantId, vehicleId, status)`                     | Vehicle alert badge count        |

---

## 3. API Layer Design

All routes use the standard auth pattern:

```ts
const { user, tenantPrisma } = await requireCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### `GET /api/serialized-items` — `route.ts`

**File:** `src/app/api/serialized-items/route.ts`

**Permission check:** `canViewSerializedAssets(user.role)`

**Query logic:**

- Parse `status`, `type`, `vehicleId`, `batchNumber`, `search`, `page`, `pageSize` from searchParams
- Build Prisma `where` object incrementally
- If `vehicleId` provided: filter by active `VehicleItemAssignment` (subquery via `vehicleAssignments.some({ vehicleId, removedAt: null })`)
- If `search` provided: OR across `serialNumber` and `notes` (contains, insensitive)
- Include: `invoiceItem { id, description, unitPrice }`, `vehicleAssignments (where: removedAt null, take: 1, include: vehicle { licensePlate })`, `alerts (where: status ACTIVE)`
- `Promise.all([count, findMany])` for pagination
- Map `vehicleAssignments[0]` to `currentAssignment` in response shape

**Reuse pattern:** Mirrors `GET /api/tires` pagination structure, adapts include shape.

---

### `POST /api/serialized-items/bulk` — `bulk/route.ts`

**File:** `src/app/api/serialized-items/bulk/route.ts`

**Permission check:** `canCreateSerializedAssets(user.role)` (OWNER + MANAGER + PURCHASER)

**Validation (before transaction):**

1. Verify `invoiceItemId` exists in tenant (single query)
2. Verify `items.length <= invoiceItem.quantity`
3. Verify `type` is in `SERIALIZED_ITEM_TYPES`
4. Check all `serialNumber` values for duplicates against existing tenant records using `findMany({ where: { serialNumber: { in: serialNumbers } } })`; if any found, return 422 with `{ error: 'DUPLICATE_SERIAL', duplicates: [...] }`

**Transaction logic** (`prisma.$transaction()`):

- For each item: `serializedItem.create({ data: { tenantId, invoiceItemId, type, batchNumber, serialNumber, specs, status: 'IN_STOCK' } })`
- For each created item: `serializedItemEvent.create({ data: { tenantId, serializedItemId, eventType: 'ALTA', performedById: user.id } })`
- Collect all created IDs

**Response:** `{ created: N, ids: [...] }` with status 201

---

### `GET /api/serialized-items/[id]` — `[id]/route.ts`

**File:** `src/app/api/serialized-items/[id]/route.ts`

**Permission check:** `canViewSerializedAssets(user.role)`

**Query:** Single `findFirst({ where: { id, tenantId } })` with full includes:

- `invoiceItem { id, description, unitPrice, invoice { invoiceNumber, invoiceDate } }`
- `vehicleAssignments (where: removedAt null, take: 1, include: vehicle { licensePlate })`
- `events (include: performer { firstName, lastName }, orderBy: performedAt desc)`
- `alerts (where: status ACTIVE)`

**Response:** Full detail object as specified in spec.md §3. Returns 404 if not found.

---

### `POST /api/serialized-items/[id]/events` — `[id]/events/route.ts`

**File:** `src/app/api/serialized-items/[id]/events/route.ts`

**Permission check:**

- `BAJA` event type → `canManageSerializedAssets(user.role)` (OWNER + MANAGER only)
- All other types → `canOperateSerializedAssets(user.role)` (OWNER + MANAGER + TECHNICIAN)

**Validation:**

- Item exists and belongs to tenant
- `eventType` is in `ALLOWED_EVENT_TYPES` constant array; reject 400 if not

**Transaction logic:**

1. Create `SerializedItemEvent` with `performedById: user.id`
2. If `eventType === 'BAJA'`: update item `status → RETIRED`, set `retiredAt = performedAt`
3. If `eventType === 'REVISION'` and `specs.usefulLifePct` or `specs.treadDepthMm` present: call `evaluateAndCreateAlerts(itemId, specs, tenantId, vehicleId?)` from the alert service (see §4)

All in a single `prisma.$transaction()`.

**Response:** `{ id, eventType, performedAt }` with status 201.

---

### `POST /api/serialized-items/[id]/assign` — `[id]/assign/route.ts`

**File:** `src/app/api/serialized-items/[id]/assign/route.ts`

**Permission check:** `canOperateSerializedAssets(user.role)`

**Validation:**

1. Item exists, belongs to tenant, `status === 'IN_STOCK'`
2. No active assignment exists: `VehicleItemAssignment.findFirst({ where: { serializedItemId: id, removedAt: null } })` — if found, return 409 with current vehicle info
3. `vehicleId` exists in tenant
4. If `type === 'TIRE'` and `position` provided: validate position is in `AXLE_CONFIG_POSITIONS[vehicle.axleConfig]` (warn only — do not block)

**Transaction:**

1. `VehicleItemAssignment.create({ data: { tenantId, vehicleId, serializedItemId: id, position, installedAt } })`
2. `SerializedItem.update({ where: { id }, data: { status: 'INSTALLED' } })`

**Response:** `{ assignmentId, position, installedAt }` with status 201.

---

### `POST /api/serialized-items/[id]/unassign` — `[id]/unassign/route.ts`

**File:** `src/app/api/serialized-items/[id]/unassign/route.ts`

**Permission check:** `canOperateSerializedAssets(user.role)` for return to stock; `canManageSerializedAssets(user.role)` if `retire: true`

**Validation:**

- Active assignment exists (`removedAt: null`) — 400 if not

**Transaction:**

1. `VehicleItemAssignment.update({ where: { id: assignment.id }, data: { removedAt } })`
2. If `retire: true`: update item `status → RETIRED`, `retiredAt = removedAt`; create `BAJA` event with `performedById: user.id`
3. If `retire: false`: update item `status → IN_STOCK`

**Response:** `{ status, removedAt }` with status 200.

---

### `GET /api/serialized-items/vehicles-summary` — `vehicles-summary/route.ts`

**File:** `src/app/api/serialized-items/vehicles-summary/route.ts`

**Permission check:** `canViewSerializedAssets(user.role)`

**Query:** Rewrite of `src/app/api/tires/vehicles-summary/route.ts`

```ts
// Key query shape:
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
      where: { removedAt: null },
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

**Map logic:**

- `totalSlots` = `AXLE_CONFIG_POSITIONS[v.axleConfig]?.length ?? 4` (axleConfig is now a String; fallback to STANDARD_4 if unrecognized)
- `minUsefulLifePct` computed from `specs.usefulLifePct` of type=TIRE assignments
- Response shape per spec.md §3

---

### `GET /api/serialized-items/alerts` — `alerts/route.ts`

**File:** `src/app/api/serialized-items/alerts/route.ts`

**Permission check:** `canViewSerializedAssets(user.role)`

**Query:** List active alerts with item and vehicle info included. Supports `status` param (default ACTIVE).

---

### `PATCH /api/serialized-items/alerts/[id]` — `alerts/[id]/route.ts`

**File:** `src/app/api/serialized-items/alerts/[id]/route.ts`

**Permission check:** `canManageSerializedAssets(user.role)`

**Logic:** Set `status = RESOLVED`, `resolvedAt = now()`, `resolvedById = user.id`

---

## 4. Constants & Utilities

### `src/lib/serialized-asset-constants.ts`

Replaces `src/lib/tire-constants.ts`. No imports from `@prisma/client` (no Prisma enums used).

```ts
// Item types (mirrors Prisma enum — kept in sync manually)
export const SERIALIZED_ITEM_TYPES = {
  TIRE: 'TIRE',
  EXTINGUISHER: 'EXTINGUISHER',
  OTHER: 'OTHER',
} as const;
export type SerializedItemType =
  (typeof SERIALIZED_ITEM_TYPES)[keyof typeof SERIALIZED_ITEM_TYPES];

// Item statuses
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

// Event types — String constants validated in API layer
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

// ALLOWED_EVENT_TYPES — used for API validation
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

// Alert type constants
export const SERIALIZED_ITEM_ALERT_TYPES = {
  LOW_TREAD: 'LOW_TREAD',
  LOW_USEFUL_LIFE: 'LOW_USEFUL_LIFE',
  INSPECTION_DUE: 'INSPECTION_DUE',
  RECHARGE_DUE: 'RECHARGE_DUE',
} as const;

// Alert thresholds
export const TIRE_USEFUL_LIFE_ALERT_THRESHOLD = 30; // %
export const TIRE_TREAD_DEPTH_MIN_MM = 4; // mm (recommended minimum)
export const EXTINGUISHER_INSPECTION_WARNING_DAYS = 30;

// Axle config positions — now keyed by String, not enum
// Keeping the same position labels (FL/FR/RL etc.) — they are strings, not enums
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

// Color helper — replaces getSlotColor in AxleDiagram
export function getSerialItemColor(
  item: { specs?: { usefulLifePct?: number | null } | null } | null
): string {
  if (!item) return '#E5E7EB'; // empty slot
  const pct = item.specs?.usefulLifePct;
  if (pct === null || pct === undefined) return '#9CA3AF'; // installed, no data
  if (pct >= 60) return '#22C55E';
  if (pct >= 30) return '#EAB308';
  return '#EF4444';
}
```

### `src/lib/services/serialized-item-alert.ts`

Replaces `src/lib/services/tire-alert.ts`. Operates only on `SerializedItem` and `SerializedItemAlert`.

Key exported function:

```ts
export async function evaluateAndCreateAlerts(
  itemId: string,
  specs: Record<string, unknown>,
  tenantId: string,
  vehicleId: string | null,
  tenantPrisma: TenantPrismaClient
): Promise<void>;
```

Logic:

- For `usefulLifePct` below `TIRE_USEFUL_LIFE_ALERT_THRESHOLD`: upsert `LOW_USEFUL_LIFE` alert
- For `treadDepthMm` below `TIRE_TREAD_DEPTH_MIN_MM`: upsert `LOW_TREAD` alert
- For extinguisher `nextInspectionDue` within `EXTINGUISHER_INSPECTION_WARNING_DAYS`: upsert `INSPECTION_DUE` alert
- Resolve alerts that are no longer triggered

### `src/lib/permissions.ts` — Changes

Remove the `TIRE PERMISSIONS` section (lines 421-448) and replace with:

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

---

## 5. Component Design

### `AxleDiagram` — Update types only

**File:** `src/app/dashboard/assets/components/AxleDiagram/AxleDiagram.types.ts`

```ts
// REPLACES TireSlotData / AxleDiagramProps (no Prisma enum imports)
export interface SerializedSlotData {
  position: string; // was TirePosition enum
  serializedItemId: string; // was tireId
  serialNumber: string;
  type: string; // 'TIRE' | 'EXTINGUISHER' | 'OTHER'
  specs: { usefulLifePct?: number | null; treadDepthMm?: number | null } | null;
  activeAlertCount: number;
}

export interface AxleDiagramProps {
  axleConfig: string; // was AxleConfig enum
  slots: SerializedSlotData[];
  onSlotClick?: (position: string, data: SerializedSlotData | null) => void;
  className?: string;
}
```

`AxleDiagram.tsx` — The SVG layout logic, slot rendering, and click callbacks are **unchanged**. Only update:

- Import types from updated `AxleDiagram.types.ts` (remove Prisma enum imports)
- `SlotRect.position` type: `string` instead of `TirePosition`
- `getSlotColor` → import `getSerialItemColor` from `@/lib/serialized-asset-constants`
- Helper builders (`singleLeft`, `singleRight`, `doubleRow`) accept `string` position
- `getAxleLayout(axleConfig: string)` — same switch cases, position labels already strings

---

### `SerializedItemDetail` — Dialog showing item detail + event history

Replaces: `TireSlotDialog` (slot click) + `TireDetailSheet` (inventory row click).
This is a single Sheet/Dialog that handles both entry points.

**File:** `src/app/dashboard/assets/components/SerializedItemDetail/SerializedItemDetail.types.ts`

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
  itemId: string | null; // null = closed
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  // Optional: which vehicle/position context opened it (for unassign action)
  vehicleContext?: {
    vehicleId: string;
    vehicleLicensePlate: string;
    position: string;
  };
}
```

**Key behavior:**

- On `open && itemId`: fetch `GET /api/serialized-items/[id]`
- Show: serial number, type badge, status badge, invoice origin, current position
- Show `specs` fields relevant to type (tread depth + useful life % for TIRE; pressure + next inspection for EXTINGUISHER)
- Show active alerts (red badge)
- Show event history in a chronological list (newest first)
- Action buttons (conditional on status and role — passed as props or checked via API response):
  - "Registrar evento" → opens `SerialItemEventDialog`
  - "Desinstalar" (if INSTALLED) → calls `POST /api/serialized-items/[id]/unassign`
  - "Dar de baja" (if INSTALLED or IN_STOCK, MANAGER+) → unassign with `retire: true`

---

### `SerialItemEventDialog` — Record lifecycle event

Replaces: `AddTireEventDialog`

**File:** `src/app/dashboard/assets/components/SerialItemEventDialog/SerialItemEventDialog.types.ts`

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

**File:** `SerialItemEventDialog.form.ts`

```ts
// Zod schema
const schema = z.object({
  eventType: z.string().min(1),
  performedAt: z.string(),
  vehicleKm: z.number().int().nonneg().optional(),
  specs: z.record(z.unknown()).optional(),
  notes: z.string().max(500).optional(),
});
```

**Key behavior:**

- `eventType` select: shows only types relevant to `itemType` (TIRE shows ALTA/REVISION/ROTACION/BAJA; EXTINGUISHER shows ALTA/INSPECCION/RECARGA/BAJA; OTHER shows ALTA/BAJA)
- Dynamic specs sub-form rendered based on selected `eventType`:
  - REVISION → tread depth (mm) + useful life (%)
  - INSPECCION → pressure + next inspection date
  - RECARGA → pressure + recharged by
- POST to `/api/serialized-items/[id]/events`
- On success: calls `onSuccess()`, closes dialog

---

### `SerialIntakeDialog` — Bulk serial intake post-purchase

**New component** (no direct equivalent in tires module — `AddTireDialog` was single-item).

**File:** `src/app/dashboard/assets/components/SerialIntakeDialog/SerialIntakeDialog.types.ts`

```ts
export interface SerialIntakeDialogProps {
  // Triggered from InvoiceItem "Serialize" action
  invoiceItemId: string;
  invoiceItemDescription: string;
  quantity: number;
  // Type pre-determined from MasterPart category or user selection
  type: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdCount: number) => void;
}
```

**Key behavior:**

- Form shows `quantity` serial number input fields (one per unit)
- Optional `batchNumber` field shared across all items
- Optional `specs` fields per item (pre-filled defaults: treadDepthMm=8.0, usefulLifePct=100 for TIRE)
- Validates all serial numbers are non-empty and unique within the form before submitting
- POST to `/api/serialized-items/bulk`
- On success: shows "N items registrados" toast, calls `onSuccess(N)`

---

### `SelectSerialDialog` — Pick IN_STOCK item for empty vehicle slot

Replaces: `SelectTireDialog`

**File:** `src/app/dashboard/assets/components/SelectSerialDialog/SelectSerialDialog.types.ts`

```ts
export interface SelectSerialDialogProps {
  vehicleId: string;
  vehicleLicensePlate: string;
  position: string; // was TirePosition
  itemType: string; // default 'TIRE' for axle diagram
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

**Key behavior:**

- Fetches `GET /api/serialized-items?status=IN_STOCK&type=[itemType]`
- Displays a searchable list of available items (serial number, batch number, specs summary)
- On confirm: POST `/api/serialized-items/[id]/assign` with `{ vehicleId, position, installedAt: now() }`
- On success: calls `onSuccess()` (triggers vehicle refresh in parent)

---

### `SerializedItemTable` — Inventory list

Replaces: `TireTable`

**File:** `src/app/dashboard/assets/components/SerializedItemTable/SerializedItemTable.types.ts`

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

**Key behavior:**

- Columns: Serial #, Type, Status (badge), Vehicle/Position (if installed), Alerts badge, Purchase origin (invoice description), Received date
- No delete action (retirement is an event, not a delete)
- Row click → opens `SerializedItemDetail`

---

### `ItemAlertsWidget` — Active alerts summary

Replaces: `TireAlertsWidget`

**File:** `src/app/dashboard/assets/components/ItemAlertsWidget/ItemAlertsWidget.types.ts`

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

---

### `page.tsx` — Assets Dashboard Page

**File:** `src/app/dashboard/assets/page.tsx`

Replaces: `src/app/dashboard/tires/page.tsx`

**Structure:**

```
AssetsPage (client component)
  Tabs:
    "Vehículos" tab:
      Input (vehicle search, debounced 300ms)
      Vehicle cards grid (vehicleId, licensePlate, axleConfig, installedCount/totalSlots, alertCount)
      Selected vehicle detail panel:
        AxleDiagram (axleConfig: string, slots: SerializedSlotData[])
        Right panel: SerializedItemDetail (itemId from slotClick)
        SelectSerialDialog (for empty slot clicks)
    "Inventario" tab:
      Filter bar: status select, type select, search input, batchNumber input
      SerializedItemTable
      SerializedItemDetail sheet
      ItemAlertsWidget (sidebar or collapsible)
  Floating: SerialItemEventDialog (launched from SerializedItemDetail)
```

**State mapping from current `TiresPage`:**

| Current state var                  | New state var                            | Change                                                |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `tires`                            | `items`                                  | `TireRow[]` → `SerializedItemRow[]`                   |
| `filterStatus`                     | `filterStatus`                           | same                                                  |
| `filterSearch`                     | `filterSearch`                           | same                                                  |
| `selectedTire`                     | `selectedItemId`                         | store ID only; detail fetched in SerializedItemDetail |
| `vehicles`                         | `vehicles`                               | shape updated                                         |
| `slotDialogData.tireData`          | `slotDialogData.itemData`                | `TireSlotData` → `SerializedSlotData`                 |
| API: `/api/tires`                  | `/api/serialized-items`                  |                                                       |
| API: `/api/tires/vehicles-summary` | `/api/serialized-items/vehicles-summary` |                                                       |

**New state vars:**

- `filterType: string` ('\_all' | 'TIRE' | 'EXTINGUISHER' | 'OTHER')
- `filterBatch: string` (for recall queries)

---

## 6. Implementation Order (Batch Plan)

### Batch 0 — Schema Migration (blocks everything)

**Sequential. Must complete before any other batch.**

1. Delete `prisma/migrations/20260324191805_add_tire_tracking/`
2. Delete `prisma/migrations/20260324194118_add_tire_event_tread_depth/`
3. Delete `prisma/migrations/20260324195617_add_tire_alerts/`
4. Update `prisma/schema.prisma`: remove Tire models/enums, add 4 new models, update Vehicle/Tenant/User/InvoiceItem
5. Run `npx prisma migrate dev --name add_serialized_assets`
6. Run `npx prisma generate`
7. Verify `pnpm type-check` finds no schema-related errors

**Sub-agent:** 1 agent, single task (schema + migration + generate)

---

### Batch 1 — Constants + Permissions + Services (parallel, after Batch 0)

Can run as 2 parallel sub-tasks after Batch 0 completes:

**1A — Constants + Alert Service:**

- Create `src/lib/serialized-asset-constants.ts`
- Create `src/lib/services/serialized-item-alert.ts`
- Delete `src/lib/tire-constants.ts`
- Delete `src/lib/services/tire-alert.ts`

**1B — Permissions + Sidebar + Seeds:**

- Update `src/lib/permissions.ts` (replace TIRE*\* with SERIALIZED_ASSET*\*)
- Update `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts` (route `/dashboard/tires` → `/dashboard/assets`)
- Update `prisma/seed.ts` (remove tire seeds)
- Update `prisma/seed-multitenancy.ts` (replace tire demo data)

---

### Batch 2 — API Routes (parallel, after Batch 1 completes)

Can run as 2 parallel sub-tasks:

**2A — Core CRUD + bulk:**

- `src/app/api/serialized-items/route.ts` (GET list)
- `src/app/api/serialized-items/bulk/route.ts` (POST bulk)
- `src/app/api/serialized-items/[id]/route.ts` (GET detail)
- Delete `src/app/api/tires/route.ts` and `src/app/api/tires/[id]/route.ts`

**2B — Events + Assignment + Vehicles + Alerts:**

- `src/app/api/serialized-items/[id]/events/route.ts`
- `src/app/api/serialized-items/[id]/assign/route.ts`
- `src/app/api/serialized-items/[id]/unassign/route.ts`
- `src/app/api/serialized-items/vehicles-summary/route.ts`
- `src/app/api/serialized-items/alerts/route.ts`
- `src/app/api/serialized-items/alerts/[id]/route.ts`
- Delete `src/app/api/tires/` remaining routes
- Delete/update `src/app/api/vehicles/[id]/tires/route.ts`

---

### Batch 3 — UI Components (after Batch 2 completes)

Can run as 3 parallel sub-tasks:

**3A — AxleDiagram + types update:**

- Move `src/app/dashboard/tires/components/AxleDiagram/` → `src/app/dashboard/assets/components/AxleDiagram/`
- Update `AxleDiagram.types.ts`: replace `TirePosition`/`AxleConfig` enum imports with plain `string`
- Update `AxleDiagram.tsx`: position type `string`, import `getSerialItemColor` from constants

**3B — Dialogs (SerializedItemDetail + SerialItemEventDialog + SelectSerialDialog):**

- Create `SerializedItemDetail/` (replaces TireSlotDialog + TireDetailSheet)
- Create `SerialItemEventDialog/` (replaces AddTireEventDialog)
- Create `SelectSerialDialog/` (replaces SelectTireDialog)

**3C — Table + Widget + SerialIntakeDialog:**

- Create `SerializedItemTable/` (replaces TireTable)
- Create `ItemAlertsWidget/` (replaces TireAlertsWidget)
- Create `SerialIntakeDialog/` (new)

After 3A + 3B + 3C complete:

**3D — Page (must be last in Batch 3):**

- Create `src/app/dashboard/assets/page.tsx` (replaces tires page)
- Delete `src/app/dashboard/tires/` (entire directory)

---

### Batch 4 — MasterPart Specs UI (independent, can run in parallel with Batches 1-2)

This batch is independent because `MasterPart.specifications` already exists in the schema.

- Update `src/app/api/inventory/parts/route.ts`: accept `specifications` in POST body
- Update `src/app/api/inventory/parts/[id]/route.ts`: accept `specifications` in PATCH body
- Add "Technical Specs" key-value editor section to the add/edit part form in `src/app/dashboard/inventory/parts/`

---

### Batch 5 — Final Verification

Sequential, after all batches:

1. `pnpm type-check` — must pass with zero errors
2. `pnpm build` — must succeed with no module-not-found errors
3. Manual smoke test: create item via bulk, assign to vehicle, record REVISION event, verify alert triggers

---

## 7. Decisions Log

| Decision                                                               | Choice                                      | Rationale                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eventType: String` not a DB enum                                      | String constant, validated in API layer     | Allows adding new event types without a schema migration; `ALLOWED_EVENT_TYPES` constant provides compile-time safety                                                                                                                                              |
| `specs: Json?` on both `SerializedItem` and `SerializedItemEvent`      | Json                                        | Type-specific attributes vary by `type` discriminator; JSON avoids N sparse columns and allows future attribute additions without migrations                                                                                                                       |
| `axleConfig: String?` on Vehicle (not enum)                            | String with `@default("STANDARD_4")`        | Drops `AxleConfig` Prisma enum dependency; constants file validates allowed values; allows new axle configs without schema migration                                                                                                                               |
| Dashboard URL stays at `/dashboard/tires`                              | Proposal said rename to `/dashboard/assets` | **Spec overrides proposal** — spec §F-013 says `/dashboard/assets`. Design follows spec.                                                                                                                                                                           |
| `@@unique([serializedItemId, removedAt])` for single active assignment | Unique constraint                           | DB-level enforcement; `removedAt: null` means active (but note: multiple closed records with same `serializedItemId` and non-null `removedAt` are all distinct values, so uniqueness works only for the `null` case — this enforces at most one active assignment) |
| `SerializedItemDetail` merges TireSlotDialog + TireDetailSheet         | Single component                            | Both dialogs showed the same underlying data from different entry points; merging reduces code duplication and state management complexity                                                                                                                         |
| `SerialIntakeDialog` is separate from regular create                   | New dialog                                  | Bulk intake is a fundamentally different flow (N items from one invoice line) vs. the old `AddTireDialog` (one tire at a time with brand/size fields); the new flow is quantity-driven and purchase-linked                                                         |
| Alert service receives `tenantPrisma` as parameter                     | Dependency injection                        | Avoids creating a second Prisma client inside the service; consistent with project patterns; testable without DB                                                                                                                                                   |
| `getSerialItemColor` moved to constants file                           | `serialized-asset-constants.ts`             | Color logic is reusable across components; keeping it in the constants file avoids importing a UI-layer function into multiple components                                                                                                                          |
| Positions remain as string labels (FL/FR/RL etc.)                      | String, not enum                            | `TirePosition` enum is dropped; the position labels themselves are human-meaningful strings (FL = Front Left) that the axle diagram SVG already uses; no semantic loss                                                                                             |
| `canOperateSerializedAssets` covers assign/unassign for TECHNICIAN     | New permission function                     | Technicians physically perform installations during service; this matches real-world fleet operations where a technician would mount or dismount a tire                                                                                                            |
| BAJA event (retirement) requires `canManageSerializedAssets`           | OWNER + MANAGER only                        | Retirement is an inventory write-off; requires management approval; mirrors how DRIVER cannot edit most things                                                                                                                                                     |
| `invoiceItemId` is optional (nullable FK)                              | `String?`                                   | Items can be created without a purchase record (e.g., existing fleet items being onboarded); `SetNull` on InvoiceItem delete preserves item history                                                                                                                |
| Alert resolution requires recording an event                           | Business rule, not auto-resolved            | Ensures traceability: an alert is only resolved when a human records the corrective action (REVISION, INSPECCION, RECARGA) — not simply when conditions change                                                                                                     |
