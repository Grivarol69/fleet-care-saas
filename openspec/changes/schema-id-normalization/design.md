# Design: schema-id-normalization

## 1. Architecture Decision: Big Bang vs Incremental

**Decision: Big Bang (Option A) — Single PR**

**Rationale:**
- Project is pre-production. No production data exists to preserve.
- `prisma migrate reset` wipes and re-applies all migrations cleanly.
- A single atomic change is easier to reason about than 6 partial states.
- If something breaks, `git revert` + `prisma migrate reset` + `pnpm db:seed` restores everything.

**Rejected alternatives:**
- Option B (6-cluster batches): adds coordination overhead with no benefit when DB can be reset.
- Option C (dual-key): schema pollution; adds unnecessary complexity for a pre-production change.

---

## 2. Migration Execution Plan

```bash
# Step 1: Edit prisma/schema.prisma
# Step 2: Validate schema compiles
pnpm prisma validate

# Step 3: Reset and apply migration
pnpm prisma migrate reset --force --skip-seed

# Step 4: Edit src/lib/validation.ts (replace integer validators)
# Step 5: Edit all API route files (replace parseInt with validateIdParam)
# Step 6: Edit all TypeScript type files (id: number → id: string)
# Step 7: Edit Zod form schemas (z.number() → z.string().min(1) for IDs)
# Step 8: Edit test files (crypto.randomUUID() for test IDs)
# Step 9: TypeScript check
pnpm type-check

# Step 10: Re-seed
pnpm db:seed

# Step 11: Run tests
pnpm test
```

**Gate**: `pnpm type-check` must pass 0 errors before running tests or seed.

---

## 3. Schema Changes Map — All 24 Models

### Cluster 1: Vehicle Foundation

#### VehicleBrand
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
// AFTER
id  String  @id @default(uuid())
```
FK fields on OTHER models that must change:
- `VehicleLine.brandId  Int` → `String`
- `Vehicle.brandId  Int` → `String`
- `MaintenanceTemplate.vehicleBrandId  Int?` → `String?`
- `MantItemVehiclePart.vehicleBrandId  Int?` → `String?`

#### VehicleLine
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
// AFTER
id  String  @id @default(uuid())
```
FK fields on OTHER models:
- `Vehicle.lineId  Int?` → `String?`
- `MaintenanceTemplate.vehicleLineId  Int?` → `String?`
- `MantItemVehiclePart.vehicleLineId  Int?` → `String?`

#### VehicleType
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
// AFTER
id  String  @id @default(uuid())
```
FK fields on OTHER models:
- `Vehicle.typeId  Int?` → `String?`

#### Vehicle
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
brandId Int
lineId  Int?
typeId  Int?
// AFTER
id      String  @id @default(uuid())
brandId String
lineId  String?
typeId  String?
```
FK fields on OTHER models:
- `WorkOrder.vehicleId  Int` → `String`
- `Document.vehicleId  Int` → `String`
- `OdometerLog.vehicleId  Int` → `String`
- `MaintenanceAlert.vehicleId  Int` → `String`
- `VehicleDriver.vehicleId  Int` → `String`
- `VehicleMantProgram.vehicleId  Int` → `String`

#### VehicleDriver
```prisma
// BEFORE
id        Int  @id @default(autoincrement())
vehicleId Int
driverId  Int
// AFTER
id        String  @id @default(uuid())
vehicleId String
driverId  String
```

#### OdometerLog
```prisma
// BEFORE
id            Int  @id @default(autoincrement())
vehicleId     Int
driverId      Int?
technicianId  Int?
// AFTER
id            String  @id @default(uuid())
vehicleId     String
driverId      String?
technicianId  String?
```

### Cluster 2: Documents

#### DocumentTypeConfig
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
// AFTER
id  String  @id @default(uuid())
```
FK fields on OTHER models:
- `Document.documentTypeId  Int?` → `String?`

### Cluster 3: Maintenance Items

#### MantCategory
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
// AFTER
id  String  @id @default(uuid())
```
FK fields on OTHER models:
- `MantItem.categoryId  Int` → `String`
- `MantItemRequest.categoryId  Int?` → `String?`

#### MantItem
```prisma
// BEFORE
id          Int  @id @default(autoincrement())
categoryId  Int
// AFTER
id          String  @id @default(uuid())
categoryId  String
```
FK fields on OTHER models:
- `PackageItem.mantItemId  Int` → `String`
- `WorkOrderItem.mantItemId  Int?` → `String?`
- `VehicleProgramItem.mantItemId  Int?` → `String?`
- `MantItemPart.mantItemId  Int` → `String`
- `MantItemVehiclePart.mantItemId  Int` → `String`
- `PurchaseOrderItem.mantItemId  Int?` → `String?`

#### MantItemRequest
```prisma
// BEFORE
id                Int  @id @default(autoincrement())
categoryId        Int?
createdMantItemId Int?  // ← NON-FK, stores MantItem.id by value
// AFTER
id                String  @id @default(uuid())
categoryId        String?
createdMantItemId String?  // ← must change to String?
```
Note: `createdMantItemId` has NO Prisma relation. All code that reads/writes this field must handle the String type.

#### MantItemVehiclePart
```prisma
// BEFORE
id             Int  @id @default(autoincrement())
mantItemId     Int
vehicleBrandId Int?
vehicleLineId  Int?
// AFTER
id             String  @id @default(uuid())
mantItemId     String
vehicleBrandId String?
vehicleLineId  String?
```

### Cluster 4: Maintenance Templates

#### MaintenanceTemplate
```prisma
// BEFORE
id              Int  @id @default(autoincrement())
vehicleBrandId  Int?
vehicleLineId   Int?
// AFTER
id              String  @id @default(uuid())
vehicleBrandId  String?
vehicleLineId   String?
```
FK fields on OTHER models:
- `MaintenancePackage.templateId  Int` → `String`

#### MaintenancePackage
```prisma
// BEFORE
id          Int  @id @default(autoincrement())
templateId  Int
// AFTER
id          String  @id @default(uuid())
templateId  String
```
FK fields on OTHER models:
- `PackageItem.packageId  Int` → `String`

#### PackageItem
```prisma
// BEFORE
id          Int  @id @default(autoincrement())
packageId   Int
mantItemId  Int
// AFTER
id          String  @id @default(uuid())
packageId   String
mantItemId  String
```

### Cluster 5: Vehicle Programs

#### VehicleMantProgram
```prisma
// BEFORE
id        Int  @id @default(autoincrement())
vehicleId Int
// AFTER
id        String  @id @default(uuid())
vehicleId String
```
FK fields on OTHER models:
- `VehicleProgramPackage.programId  Int` → `String`

#### VehicleProgramPackage
```prisma
// BEFORE
id            Int   @id @default(autoincrement())
programId     Int
technicianId  Int?
providerId    Int?
workOrderId   Int?
// AFTER
id            String   @id @default(uuid())
programId     String
technicianId  String?
providerId    String?
workOrderId   String?
```
FK fields on OTHER models:
- `VehicleProgramItem.packageId  Int` → `String`

#### VehicleProgramItem
```prisma
// BEFORE
id            Int  @id @default(autoincrement())
packageId     Int
technicianId  Int?
providerId    Int?
// AFTER
id            String  @id @default(uuid())
packageId     String
technicianId  String?
providerId    String?
```

### Cluster 6: Work Orders

#### WorkOrder
```prisma
// BEFORE
id            Int  @id @default(autoincrement())
vehicleId     Int
technicianId  Int?
providerId    Int?
// AFTER
id            String  @id @default(uuid())
vehicleId     String
technicianId  String?
providerId    String?
```
FK fields on OTHER models:
- `WorkOrderItem.workOrderId  Int` → `String`
- `WorkOrderExpense.workOrderId  Int` → `String`  (WorkOrderExpense uses cuid but its FK is Int)
- `WorkOrderApproval.workOrderId  Int` → `String`  (WorkOrderApproval uses cuid but its FK is Int)
- `ExpenseAuditLog.workOrderId  Int` → `String`
- `MaintenanceAlert.workOrderId  Int?` → `String?`
- `FinancialAlert.workOrderId  Int?` → `String?`
- `Invoice.workOrderId  Int?` → `String?`  (Invoice uses cuid but its FK is Int)
- `InternalWorkTicket.workOrderId  Int?` → `String?`  (InternalWorkTicket uses cuid but its FK is Int)
- `PurchaseOrder.workOrderId  Int?` → `String?`  (PurchaseOrder uses cuid but its FK is Int)
- `VehicleProgramPackage.workOrderId  Int?` → `String?`

#### WorkOrderItem
```prisma
// BEFORE
id            Int  @id @default(autoincrement())
workOrderId   Int
// AFTER
id            String  @id @default(uuid())
workOrderId   String
```
FK fields on OTHER models:
- `InvoiceItem.workOrderItemId  Int?` → `String?`
- `TicketLaborEntry.workOrderItemId  Int?` → `String?`
- `TicketPartEntry.workOrderItemId  Int?` → `String?`
- `PurchaseOrderItem.workOrderItemId  Int?` → `String?`

### Cluster 7: Alerts

#### MaintenanceAlert
```prisma
// BEFORE
id            Int  @id @default(autoincrement())
vehicleId     Int
workOrderId   Int?
programItemId Int?
// AFTER
id            String  @id @default(uuid())
vehicleId     String
workOrderId   String?
programItemId String?
```

#### FinancialAlert
```prisma
// BEFORE
id          Int  @id @default(autoincrement())
workOrderId Int?
// AFTER
id          String  @id @default(uuid())
workOrderId String?
```

### Cluster 8: People

#### Technician
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
// AFTER
id  String  @id @default(uuid())
```
FK fields on OTHER models:
- `WorkOrder.technicianId  Int?` → `String?`
- `VehicleProgramPackage.technicianId  Int?` → `String?`
- `VehicleProgramItem.technicianId  Int?` → `String?`
- `InternalWorkTicket.technicianId  Int` → `String`  (InternalWorkTicket uses cuid but FK is Int)
- `TicketLaborEntry.technicianId  Int` → `String`  (TicketLaborEntry uses cuid but FK is Int)
- `OdometerLog.technicianId  Int?` → `String?`

#### Provider
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
// AFTER
id  String  @id @default(uuid())
```
FK fields on OTHER models:
- `WorkOrder.providerId  Int?` → `String?`
- `Invoice.supplierId  Int?` → `String?`
- `PartPriceHistory.supplierId  Int?` → `String?`
- `WorkOrderExpense.providerId  Int?` → `String?`
- `PurchaseOrder.providerId  Int?` → `String?`
- `VehicleProgramPackage.providerId  Int?` → `String?`
- `VehicleProgramItem.providerId  Int?` → `String?`

#### Driver
```prisma
// BEFORE
id  Int  @id @default(autoincrement())
// AFTER
id  String  @id @default(uuid())
```
FK fields on OTHER models:
- `OdometerLog.driverId  Int?` → `String?`
- `VehicleDriver.driverId  Int` → `String`

---

## 4. validation.ts Refactoring Design

```typescript
// ============ BEFORE ============
export function safeParseInt(id: string | undefined): number | null {
  if (!id) return null
  const n = parseInt(id, 10)
  return isNaN(n) ? null : n
}

export function parseIdParam(id: string | undefined): number | null {
  return safeParseInt(id)
}

export function validateIdParam(
  id: string | undefined
): { id: number } | { error: string; status: number } {
  const parsed = safeParseInt(id)
  if (parsed === null) return { error: 'Invalid ID', status: 400 }
  return { id: parsed }
}

export const positiveIntSchema = z.number().positive().int()

// ============ AFTER ============
export function safeParseId(id: string | undefined): string | null {
  if (!id || id.trim() === '') return null
  return id
}

export function parseIdParam(id: string | undefined): string | null {
  return safeParseId(id)
}

export function validateIdParam(
  id: string | undefined
): { id: string } | { error: string; status: number } {
  const parsed = safeParseId(id)
  if (parsed === null) return { error: 'Invalid ID', status: 400 }
  return { id: parsed }
}

export const idSchema = z.string().min(1)
```

---

## 5. API Routes Refactoring Pattern

### Standard route handler pattern:

```typescript
// ============ BEFORE ============
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const item = await prisma.vehicle.findFirst({
    where: { id, tenantId: user.tenantId }
  })
  ...
}

// ============ AFTER ============
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = validateIdParam(params.id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  const { id } = result

  const item = await prisma.vehicle.findFirst({
    where: { id, tenantId: user.tenantId }
  })
  ...
}
```

---

## 6. TypeScript Types Refactoring Pattern

```typescript
// ============ BEFORE ============
export interface Vehicle {
  id: number
  brandId: number
  lineId?: number
  typeId?: number
  // ...
}

// ============ AFTER ============
export interface Vehicle {
  id: string
  brandId: string
  lineId?: string
  typeId?: string
  // ...
}
```

Same pattern for all 37 type files containing `id: number` for migrated models.

---

## 7. Seed File Strategy

`prisma/seed-staging-demo.ts` should NOT specify `id:` fields for migrated models — Prisma auto-generates UUIDs.

```typescript
// ============ BEFORE (if present) ============
const brand = await prisma.vehicleBrand.create({
  data: { id: 1, name: 'Toyota', ... }
})

// ============ AFTER ============
const brand = await prisma.vehicleBrand.create({
  data: { name: 'Toyota', ... }
  // id auto-generated as UUID
})

// Referencing in FK:
const vehicle = await prisma.vehicle.create({
  data: {
    brandId: brand.id,  // ← use variable, not hardcoded 1
    ...
  }
})
```

---

## 8. Test Strategy

```typescript
// ============ BEFORE ============
const mockVehicle = {
  id: 1,
  brandId: 2,
  ...
}

// ============ AFTER ============
const mockVehicle = {
  id: crypto.randomUUID(),
  brandId: crypto.randomUUID(),
  ...
}
```

Or use readable test UUIDs:
```typescript
const TEST_VEHICLE_ID = '00000000-0000-0000-0000-000000000001'
const TEST_BRAND_ID = '00000000-0000-0000-0000-000000000002'
```

---

## 9. Execution Checklist

### Phase 1: Schema
- [ ] Edit `prisma/schema.prisma` — 24 models PK change (Int → String uuid)
- [ ] Edit `prisma/schema.prisma` — all FK fields on all models (Int → String, including models that keep cuid PKs but have FK references to Int models)
- [ ] Run `pnpm prisma validate` — must pass
- [ ] Run `pnpm prisma migrate reset --force --skip-seed`

### Phase 2: Validation Utility
- [ ] Edit `src/lib/validation.ts` — replace integer validators with string validators
- [ ] Grep `safeParseInt` across all files — confirm 0 remaining references

### Phase 3: API Routes
- [ ] Grep `parseInt(` in `src/app/api/` — list all 28 files
- [ ] Update each route to use `validateIdParam()` from validation.ts
- [ ] Grep `parseInt(` again — confirm 0 remaining (excluding validation.ts itself)

### Phase 4: TypeScript Types
- [ ] Grep `id: number` in `src/app/dashboard/` and `src/app/api/` type files
- [ ] Update all 37 type files
- [ ] Grep `z.number()` in form schema files — update ID fields

### Phase 5: Tests
- [ ] Grep `id: [0-9]` in `src/app/api/**/__tests__/` — list numeric ID usages
- [ ] Update test factories to use `crypto.randomUUID()`
- [ ] Update direct test variable declarations

### Phase 6: Seed
- [ ] Review `prisma/seed-staging-demo.ts` for explicit `id:` fields on migrated models
- [ ] Replace hardcoded numeric ID references with variable references

### Phase 7: Verification
- [ ] Run `pnpm type-check` — must pass 0 errors
- [ ] Run `pnpm db:seed`
- [ ] Run `pnpm test`
- [ ] Run `pnpm build`
