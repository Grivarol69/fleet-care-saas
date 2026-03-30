# Spec: Serialized Asset Tracking

**Change**: `serialized-assets`
**Status**: Draft
**Date**: 2026-03-24

---

## 1. Requirements

### Functional Requirements

**F-001** — The system shall allow creating `SerializedItem` records linked to a specific `InvoiceItem`, capturing the purchase origin and unit price automatically from the invoice line.

**F-002** — A user shall be able to perform a bulk serial intake: given an `InvoiceItem` with `quantity = N`, enter N serial numbers in a single form submission, creating N `SerializedItem` records all set to `IN_STOCK`.

**F-003** — Each `SerializedItem` shall carry:

- A `serialNumber` unique per tenant
- An optional `batchNumber` for lot/batch grouping and recall queries
- A `type` discriminator: `TIRE | EXTINGUISHER | OTHER`
- A `status`: `IN_STOCK | INSTALLED | RETIRED`
- A `specs: Json?` field for type-specific attributes (tread depth, pressure, etc.)

**F-004** — An item shall be assignable to a vehicle via `VehicleItemAssignment`, with an optional free-text `position` field (e.g., `FL`, `FR`, `RR` for tires; any label for other asset types).

**F-005** — Only one active assignment per item shall be permitted at any time: assigning an already-installed item to a vehicle is blocked unless the current assignment is first closed.

**F-006** — An item's status shall transition automatically:

- `IN_STOCK → INSTALLED` when assigned to a vehicle
- `INSTALLED → IN_STOCK` when unassigned without retirement
- `INSTALLED → RETIRED` or `IN_STOCK → RETIRED` when a `BAJA` event is recorded

**F-007** — Users shall be able to record lifecycle events (`SerializedItemEvent`) against any item. Supported event types (string constants, not DB enum):

- `ALTA` — initial registration
- `REVISION` — inspection/measurement (tread depth, useful life %)
- `ROTACION` — position change between axles (tire-specific)
- `BAJA` — retirement / end of life
- `INSPECCION` — general inspection (extinguisher)
- `RECARGA` — recharge event (extinguisher)

**F-008** — Event specs shall be stored in `SerializedItemEvent.specs: Json?`. For REVISION events on tires this includes `{ treadDepthMm, usefulLifePct }`. For INSPECCION/RECARGA on extinguishers this includes `{ pressure, nextInspectionDue }`.

**F-009** — The vehicle axle diagram view shall render all currently assigned items per vehicle using the `position` field. For tires, positions map to the existing `AXLE_CONFIG_POSITIONS` constants (migrated to the new constants file). Empty slots shall be visually distinct and tappable to trigger assignment.

**F-010** — A user shall be able to look up all `SerializedItem` records sharing the same `batchNumber` (recall query) from the list view filter.

**F-011** — Active alerts (`SerializedItemAlert`) shall be created by the alert service when:

- Tire useful life drops below the configured threshold (e.g., 30%)
- Tread depth drops below the minimum legal limit
- Extinguisher inspection due date has passed or is within a configurable warning window

**F-012** — Alerts shall carry `alertType: String` (constants: `LOW_TREAD`, `LOW_USEFUL_LIFE`, `INSPECTION_DUE`, `RECHARGE_DUE`) and a `status` of `ACTIVE | RESOLVED`. Resolving an alert requires recording the appropriate event (REVISION, INSPECCION, RECARGA) or retiring the item.

**F-013** — The sidebar route shall change from `/dashboard/tires` to `/dashboard/assets`. The old tire API routes under `/api/tires/` shall be removed and replaced by `/api/serialized-items/`.

**F-014** — `MasterPart.specifications: Json?` (already in schema) shall be exposed in the add/edit part forms and accepted in `POST /api/inventory/parts` and `PATCH /api/inventory/parts/[id]`. For tire models this holds `{ rodado: "205/65R16", loadIndex: "91", speedRating: "H" }`.

**F-015** — The old tire-specific Prisma models (`Tire`, `VehicleTire`, `TireEvent`, `TireAlert`) and their enums (`TireStatus`, `TirePosition`, `AxleConfig`, `TireEventType`, `TireAlertStatus`) shall be removed from the schema. The three uncommitted tire migrations shall be deleted and replaced with one clean `add_serialized_assets` migration.

**F-016** — The `Vehicle` model shall remove the `axleConfig AxleConfig` field (enum dropped) and replace it with `axleConfig String? @default("STANDARD_4")` so axle layout is still configurable without a Prisma enum dependency.

---

### Non-Functional Requirements

**NFR-001** — `pnpm type-check` shall pass with zero TypeScript errors after the change.

**NFR-002** — `pnpm build` (Next.js production build) shall succeed with no module-not-found errors.

**NFR-003** — All tenant queries must include `tenantId` in the WHERE clause; the `tenantPrisma` client from `src/lib/tenant-prisma.ts` shall be used in every API route.

**NFR-004** — `eventType` shall be validated at the API layer against the allowed constant array before inserting into the DB. No unknown event types are persisted silently.

**NFR-005** — The bulk intake endpoint (`POST /api/serialized-items/bulk`) shall use a `prisma.$transaction()` to create all N items atomically; partial creation on validation failure is not permitted.

**NFR-006** — The `serialNumber` + `tenantId` uniqueness constraint shall be enforced at the DB level via `@@unique([tenantId, serialNumber])`.

**NFR-007** — The alert service (`src/lib/services/serialized-item-alert.ts`) shall be decoupled from any tire-specific model; it shall operate on `SerializedItem` and `SerializedItemAlert` only.

---

## 2. Data Model

### Enums to Add

```prisma
enum SerializedItemType {
  TIRE
  EXTINGUISHER
  OTHER
}

enum SerializedItemStatus {
  IN_STOCK   // Available, not yet assigned to a vehicle
  INSTALLED  // Currently mounted/assigned to a vehicle
  RETIRED    // End of life, no longer usable
}

enum SerializedItemAlertStatus {
  ACTIVE
  RESOLVED
}
```

### New Models

```prisma
model SerializedItem {
  id          String               @id @default(uuid())
  tenantId    String
  tenant      Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Purchase traceability
  invoiceItemId String?
  invoiceItem   InvoiceItem?       @relation(fields: [invoiceItemId], references: [id], onDelete: SetNull)

  // Identity
  serialNumber  String
  batchNumber   String?            // Lot/recall grouping

  // Classification
  type          SerializedItemType
  status        SerializedItemStatus @default(IN_STOCK)

  // Lifecycle timestamps
  receivedAt    DateTime            @default(now())
  retiredAt     DateTime?

  // Type-specific attributes
  // TIRE: { "treadDepthMm": 8.0, "usefulLifePct": 100, "rodado": "205/65R16" }
  // EXTINGUISHER: { "pressure": 15, "nextInspectionDue": "2026-12-01", "capacity": "6kg" }
  specs         Json?

  notes         String?

  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  events           SerializedItemEvent[]
  vehicleAssignments VehicleItemAssignment[]
  alerts           SerializedItemAlert[]

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

  // String constant, not DB enum — validated in API layer
  // Allowed: "ALTA" | "REVISION" | "ROTACION" | "BAJA" | "INSPECCION" | "RECARGA"
  eventType        String

  performedAt      DateTime @default(now())
  performedById    String
  performer        User     @relation(fields: [performedById], references: [id])

  vehicleKm        Int?     // Odometer reading at time of event

  // Event-specific data
  // REVISION: { "treadDepthMm": 5.5, "usefulLifePct": 68 }
  // INSPECCION: { "pressure": 14, "nextInspectionDue": "2027-03-01" }
  // RECARGA: { "pressure": 15, "rechargedBy": "Proveedor XYZ" }
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

  // Free text position label
  // Tires: "FL" | "FR" | "RL" | "RR" | "ML" | "MR" | "SPARE" | ...
  // Extinguishers/Other: any descriptive label ("Cabina", "Bodega")
  position         String?

  installedAt      DateTime @default(now())
  removedAt        DateTime?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([tenantId])
  @@index([vehicleId])
  @@index([serializedItemId])
  // Enforce single active assignment per item
  @@unique([serializedItemId, removedAt])
}

model SerializedItemAlert {
  id               String                   @id @default(uuid())
  tenantId         String
  tenant           Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  serializedItemId String
  serializedItem   SerializedItem           @relation(fields: [serializedItemId], references: [id], onDelete: Cascade)

  vehicleId        String?                  // Snapshot of vehicle at trigger time
  vehicle          Vehicle?                 @relation(fields: [vehicleId], references: [id], onDelete: SetNull)

  // String constants: "LOW_TREAD" | "LOW_USEFUL_LIFE" | "INSPECTION_DUE" | "RECHARGE_DUE"
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

### Changes to Existing Models

**`InvoiceItem`** — add relation (back-reference only, no new column):

```prisma
// Add to InvoiceItem model:
serializedItems  SerializedItem[]
```

**`Vehicle`** — remove tire-specific relations, remove `axleConfig AxleConfig` enum field, add generic relations:

```prisma
// REMOVE:
//   vehicleTires  VehicleTire[]
//   tireAlerts    TireAlert[]
//   axleConfig    AxleConfig @default(STANDARD_4)

// ADD:
itemAssignments  VehicleItemAssignment[]
itemAlerts       SerializedItemAlert[]
axleConfig       String? @default("STANDARD_4")   // free text, validated in constants
```

**`Tenant`** — remove tire relations, add serialized asset relations:

```prisma
// REMOVE:
//   tires        Tire[]
//   vehicleTires VehicleTire[]
//   tireEvents   TireEvent[]
//   tireAlerts   TireAlert[]

// ADD:
serializedItems       SerializedItem[]
serializedItemEvents  SerializedItemEvent[]
vehicleItemAssignments VehicleItemAssignment[]
serializedItemAlerts  SerializedItemAlert[]
```

**`User`** — remove tire relations, add serialized asset relations:

```prisma
// REMOVE:
//   tireEvents           TireEvent[]
//   tireAlertsDismissed  TireAlert[] @relation("TireAlertDismisser")

// ADD:
serializedItemEvents   SerializedItemEvent[]
alertsResolved         SerializedItemAlert[] @relation("AlertResolver")
```

### Models to DROP

- `Tire`
- `VehicleTire`
- `TireEvent`
- `TireAlert`

### Enums to DROP

- `TireStatus`
- `TirePosition`
- `AxleConfig`
- `TireEventType`
- `TireAlertStatus`

### Migration Strategy

Delete the 3 uncommitted migrations:

- `prisma/migrations/20260324191805_add_tire_tracking/`
- `prisma/migrations/20260324194118_add_tire_event_tread_depth/`
- `prisma/migrations/20260324195617_add_tire_alerts/`

Create one clean migration: `prisma/migrations/YYYYMMDDHHMMSS_add_serialized_assets/`

---

## 3. API Contracts

All routes use the pattern:

```ts
const { user, tenantPrisma } = await requireCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### `GET /api/serialized-items`

List serialized items with optional filters.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | `IN_STOCK \| INSTALLED \| RETIRED` | Filter by lifecycle status |
| `type` | `TIRE \| EXTINGUISHER \| OTHER` | Filter by asset type |
| `vehicleId` | `string` | Items currently assigned to this vehicle |
| `batchNumber` | `string` | Exact match for recall queries |
| `search` | `string` | Fuzzy match on `serialNumber` or `notes` |
| `page` | `number` | Pagination (default 1) |
| `pageSize` | `number` | Items per page (default 25, max 100) |

**Response 200:**

```json
{
  "items": [
    {
      "id": "uuid",
      "serialNumber": "SN-20240001",
      "batchNumber": "LOT-A23",
      "type": "TIRE",
      "status": "INSTALLED",
      "receivedAt": "2026-03-01T00:00:00Z",
      "specs": { "treadDepthMm": 7.2, "usefulLifePct": 82 },
      "invoiceItem": {
        "id": "uuid",
        "description": "Neumático 205/65R16",
        "unitPrice": 180000
      },
      "currentAssignment": {
        "vehicleId": "uuid",
        "vehicleLicensePlate": "ABC-123",
        "position": "FL",
        "installedAt": "2026-03-10T00:00:00Z"
      }
    }
  ],
  "total": 47,
  "page": 1,
  "pageSize": 25
}
```

---

### `POST /api/serialized-items/bulk`

Create N serialized items from a single InvoiceItem (serial intake flow).

**Request body:**

```json
{
  "invoiceItemId": "uuid",
  "type": "TIRE",
  "batchNumber": "LOT-A23",
  "items": [
    {
      "serialNumber": "SN-001",
      "specs": { "treadDepthMm": 8.0, "usefulLifePct": 100 }
    },
    {
      "serialNumber": "SN-002",
      "specs": { "treadDepthMm": 8.0, "usefulLifePct": 100 }
    }
  ]
}
```

**Validation:**

- `invoiceItemId` must exist and belong to tenant
- `items.length` must be <= `invoiceItem.quantity` (cannot register more units than purchased)
- All `serialNumber` values must be unique within tenant
- `type` must be one of `TIRE | EXTINGUISHER | OTHER`
- Each item auto-creates an `ALTA` event

**Response 201:**

```json
{
  "created": 2,
  "ids": ["uuid-1", "uuid-2"]
}
```

**Response 422 (validation error):**

```json
{
  "error": "DUPLICATE_SERIAL",
  "duplicates": ["SN-001"]
}
```

---

### `GET /api/serialized-items/[id]`

Full detail for one item: events, current assignment, active alerts.

**Response 200:**

```json
{
  "id": "uuid",
  "serialNumber": "SN-001",
  "batchNumber": "LOT-A23",
  "type": "TIRE",
  "status": "INSTALLED",
  "receivedAt": "2026-03-01T00:00:00Z",
  "retiredAt": null,
  "specs": { "treadDepthMm": 7.2, "usefulLifePct": 82 },
  "notes": null,
  "invoiceItem": {
    "id": "uuid",
    "description": "Neumático 205/65R16",
    "unitPrice": 180000,
    "invoice": {
      "invoiceNumber": "FAC-2026-001",
      "invoiceDate": "2026-03-01T00:00:00Z"
    }
  },
  "currentAssignment": {
    "id": "uuid",
    "vehicleId": "uuid",
    "vehicleLicensePlate": "ABC-123",
    "position": "FL",
    "installedAt": "2026-03-10T00:00:00Z"
  },
  "events": [
    {
      "id": "uuid",
      "eventType": "ALTA",
      "performedAt": "2026-03-01T00:00:00Z",
      "performer": { "id": "uuid", "firstName": "Juan", "lastName": "Pérez" },
      "vehicleKm": null,
      "specs": null,
      "notes": "Ingreso desde factura FAC-2026-001"
    }
  ],
  "activeAlerts": [
    {
      "id": "uuid",
      "alertType": "LOW_TREAD",
      "message": "Profundidad de surco en 3.2mm — por debajo del límite recomendado (4mm)",
      "createdAt": "2026-03-20T00:00:00Z"
    }
  ]
}
```

---

### `POST /api/serialized-items/[id]/events`

Record a lifecycle event for an item.

**Request body:**

```json
{
  "eventType": "REVISION",
  "performedAt": "2026-03-24T10:00:00Z",
  "vehicleKm": 85200,
  "specs": { "treadDepthMm": 5.5, "usefulLifePct": 68 },
  "notes": "Revisión rutinaria"
}
```

**Validation:**

- `eventType` must be one of `ALTA | REVISION | ROTACION | BAJA | INSPECCION | RECARGA`
- `BAJA` event transitions item status to `RETIRED`
- After `REVISION`, the alert service is called to create/resolve alerts based on new specs
- `performedById` is resolved from the authenticated session

**Response 201:**

```json
{ "id": "uuid", "eventType": "REVISION", "performedAt": "2026-03-24T10:00:00Z" }
```

---

### `POST /api/serialized-items/[id]/assign`

Assign an item to a vehicle position.

**Request body:**

```json
{
  "vehicleId": "uuid",
  "position": "FL",
  "installedAt": "2026-03-24T08:00:00Z"
}
```

**Validation:**

- Item must be in `IN_STOCK` status
- No active `VehicleItemAssignment` for this item may exist (`removedAt IS NULL`)
- `vehicleId` must belong to tenant
- `position` is optional; if provided and type is TIRE, validated against allowed position constants (warn but don't block for OTHER type)

**Side effects:**

- Item status → `INSTALLED`

**Response 201:**

```json
{
  "assignmentId": "uuid",
  "position": "FL",
  "installedAt": "2026-03-24T08:00:00Z"
}
```

**Response 409 (conflict):**

```json
{
  "error": "ITEM_ALREADY_INSTALLED",
  "currentVehicle": "ABC-123",
  "position": "RR"
}
```

---

### `POST /api/serialized-items/[id]/unassign`

Remove an item from its current vehicle assignment.

**Request body:**

```json
{
  "removedAt": "2026-03-24T14:00:00Z",
  "retire": false
}
```

**Side effects:**

- Closes the active `VehicleItemAssignment` by setting `removedAt`
- If `retire: true`: item status → `RETIRED`, auto-creates a `BAJA` event
- If `retire: false`: item status → `IN_STOCK`

**Response 200:**

```json
{ "status": "IN_STOCK", "removedAt": "2026-03-24T14:00:00Z" }
```

---

### `GET /api/serialized-items/vehicles-summary`

Returns all vehicles with their currently installed serialized items, grouped by vehicle. Replaces the former `/api/tires/vehicles-summary` route.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | `TIRE \| EXTINGUISHER \| OTHER` | Filter by asset type (default: all) |

**Response 200:**

```json
{
  "vehicles": [
    {
      "vehicleId": "uuid",
      "licensePlate": "ABC-123",
      "axleConfig": "STANDARD_4",
      "assignments": [
        {
          "position": "FL",
          "serializedItem": {
            "id": "uuid",
            "serialNumber": "SN-001",
            "type": "TIRE",
            "specs": { "treadDepthMm": 7.2, "usefulLifePct": 82 },
            "activeAlerts": []
          }
        }
      ]
    }
  ]
}
```

---

### Existing Routes — `MasterPart` (no structural change, spec only)

**`GET /api/inventory/parts`** — already returns `specifications` field. No change.

**`POST /api/inventory/parts`** — accept `specifications: Record<string, unknown> | null` in request body. Validation: must be a plain object if provided. Stored as-is in `MasterPart.specifications`.

**`PATCH /api/inventory/parts/[id]`** — same as POST for the `specifications` field.

---

## 4. UI Scenarios

### Scenario A — Define tire model in MasterPart (rodado/talla)

**Given** a MANAGER or OWNER is on the Parts Catalog page (`/dashboard/inventory/parts`)
**When** they click "Add Part" and fill in the name ("Neumático 205/65R16"), category, and in the "Technical Specs" section enter `rodado = "205/65R16"`, `loadIndex = "91"`, `speedRating = "H"`
**Then** the part is created with `specifications = { "rodado": "205/65R16", "loadIndex": "91", "speedRating": "H" }` and the specification fields are visible in the part detail view.

---

### Scenario B — Register purchase of 6 tires (InvoiceItem)

**Given** a PURCHASER is registering a new invoice (`/dashboard/invoices/new`)
**When** they add an invoice line with `masterPartId` pointing to the "Neumático 205/65R16" part and set `quantity = 6`
**Then** the InvoiceItem is created with `quantity = 6` and a "Serialize assets" action button appears on the invoice detail for that line item.

---

### Scenario C — Post-purchase serial intake (enter 6 serial numbers)

**Given** a PURCHASER or MANAGER views an invoice detail and the InvoiceItem for 6 tires has no serialized items yet
**When** they click "Serialize assets" for that line item, a dialog opens with 6 serial number input fields (one per unit) pre-populated with the batch number from the invoice; they fill in serial numbers `SN-001` through `SN-006` and confirm
**Then** 6 `SerializedItem` records are created with `status = IN_STOCK`, all linked to the same `invoiceItemId`, and an `ALTA` event is auto-created for each; the dialog closes and the invoice line now shows "6/6 serialized".

---

### Scenario D — View vehicle axle diagram with assigned tires

**Given** a TECHNICIAN or higher-role user navigates to `/dashboard/assets/vehicles` and selects a vehicle with `axleConfig = "STANDARD_4"`
**When** the axle diagram renders
**Then** 4 tire slots are shown (FL, FR, RL, RR); slots with an assigned tire show the serial number and useful life percentage badge; empty slots show a dashed outline with a "+" icon.

---

### Scenario E — Click tire slot → detail dialog → record REVISION event

**Given** the user is viewing the axle diagram of a vehicle and a tire is installed in the FR slot
**When** they click the FR slot
**Then** a detail dialog opens showing: serial number, brand (from MasterPart via InvoiceItem), current tread depth, useful life %, last event date, and active alerts; a "Record event" button is present.

**When** they click "Record event", select type "REVISION", enter tread depth = 5.5mm and useful life = 68%, and confirm
**Then** a `SerializedItemEvent` of type `REVISION` is created with those specs; the item's `specs.treadDepthMm` and `specs.usefulLifePct` are updated; if the new values breach thresholds, a `SerializedItemAlert` is created automatically; the dialog refreshes to show the new event in the history list.

---

### Scenario F — Assign IN_STOCK item to empty vehicle slot

**Given** the user is viewing the axle diagram of a vehicle and the RL slot is empty
**When** they click the empty RL slot, a picker appears listing all `IN_STOCK` TIRE items with their serial numbers and specs
**Then** they select one item and confirm; a `VehicleItemAssignment` is created with `position = "RL"` and `installedAt = now()`; the item status changes to `INSTALLED`; the axle diagram updates to show the item in the RL slot.

---

### Scenario G — Recall items by batch number

**Given** a MANAGER navigates to `/dashboard/assets` (serialized items list)
**When** they type a batch number (e.g., `LOT-DEFECT-X`) in the Batch Number filter field and press Enter
**Then** the list filters to show only items with that `batchNumber`, regardless of current status or vehicle assignment; each row shows: serial number, current status, current vehicle and position (if installed), and a direct link to the item detail.

---

## 5. Permissions

### Permission Roles

| Action                                                           | OWNER | MANAGER | PURCHASER | TECHNICIAN | DRIVER |
| ---------------------------------------------------------------- | ----- | ------- | --------- | ---------- | ------ |
| View serialized items list                                       | Yes   | Yes     | Yes       | Yes        | No     |
| View item detail                                                 | Yes   | Yes     | Yes       | Yes        | No     |
| View vehicle axle diagram                                        | Yes   | Yes     | Yes       | Yes        | No     |
| Perform serial intake (bulk create)                              | Yes   | Yes     | Yes       | No         | No     |
| Record lifecycle event (REVISION, INSPECCION, RECARGA, ROTACION) | Yes   | Yes     | No        | Yes        | No     |
| Assign item to vehicle                                           | Yes   | Yes     | No        | Yes        | No     |
| Unassign item from vehicle                                       | Yes   | Yes     | No        | Yes        | No     |
| Retire item (BAJA event)                                         | Yes   | Yes     | No        | No         | No     |
| Resolve/dismiss alert                                            | Yes   | Yes     | No        | No         | No     |
| Recall query (batch filter)                                      | Yes   | Yes     | Yes       | No         | No     |

### Permission Constants (replace tire permissions in `src/lib/permissions.ts`)

```ts
// Replace TIRE_* constants with:
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

**Note on TECHNICIAN**: Technicians can record events (inspections, rotations) and assign/unassign items — these are operational tasks they perform during service. Retirement (BAJA) requires MANAGER approval because it is an inventory write-off action.

---

## 6. Files to Create / Modify / Delete

### Create

- `openspec/changes/serialized-assets/spec.md` (this file)
- `prisma/migrations/YYYYMMDDHHMMSS_add_serialized_assets/migration.sql`
- `src/lib/serialized-asset-constants.ts` (replaces `tire-constants.ts`)
- `src/lib/services/serialized-item-alert.ts` (replaces `tire-alert.ts`)
- `src/app/api/serialized-items/route.ts` (GET list, no POST — use /bulk)
- `src/app/api/serialized-items/bulk/route.ts` (POST)
- `src/app/api/serialized-items/vehicles-summary/route.ts` (GET)
- `src/app/api/serialized-items/[id]/route.ts` (GET detail)
- `src/app/api/serialized-items/[id]/events/route.ts` (POST)
- `src/app/api/serialized-items/[id]/assign/route.ts` (POST)
- `src/app/api/serialized-items/[id]/unassign/route.ts` (POST)
- `src/app/dashboard/assets/` (entire module, replaces `tires/`)

### Modify

- `prisma/schema.prisma` (new models, drop Tire models, update relations)
- `src/lib/permissions.ts` (replace TIRE*\* with SERIALIZED_ASSET*\*)
- `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts` (route update)
- `prisma/seed.ts` (remove tire seeds)
- `prisma/seed-multitenancy.ts` (replace tire demo data with serialized asset demo data)
- `src/app/api/inventory/parts/route.ts` (accept `specifications` in POST body)
- `src/app/api/inventory/parts/[id]/route.ts` (accept `specifications` in PATCH body)
- `src/app/api/vehicles/[id]/route.ts` (update relations, remove tire-specific fields)

### Delete

- `src/lib/tire-constants.ts`
- `src/lib/services/tire-alert.ts`
- `src/app/api/tires/` (entire directory)
- `src/app/dashboard/tires/` (entire directory)
- `prisma/migrations/20260324191805_add_tire_tracking/`
- `prisma/migrations/20260324194118_add_tire_event_tread_depth/`
- `prisma/migrations/20260324195617_add_tire_alerts/`
