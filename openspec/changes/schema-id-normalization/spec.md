# Spec: Schema ID Normalization (Int → UUID)

**Change**: schema-id-normalization
**Status**: Draft
**Depends on**: proposal.md
**Date**: 2026-02-25

---

## Overview

This specification defines the exact behavioral contract for migrating 24 Prisma models from `Int @id @default(autoincrement())` to `String @id @default(uuid())`. It covers 6 domains: Schema changes, Validation utility refactoring, API route ID handling, TypeScript type correctness, Test file updates, and Seed file updates. Each domain includes Gherkin-style acceptance scenarios and explicit acceptance criteria.

---

## Domain 1: Schema — Primary Keys

### 1.1 Rule: All 24 models must migrate from Int to UUID

Every model in scope must have its primary key changed from:
```prisma
id Int @id @default(autoincrement())
```
to:
```prisma
id String @id @default(uuid())
```

Every FK field in any model that references one of the 24 migrated models must change its type from `Int` to `String`.

### 1.2 Model-by-Model Inventory

The following 24 models are in scope for PK change, along with every FK field that must change in consequence:

| # | Model | FK fields that must change (field → model.field) |
|---|-------|--------------------------------------------------|
| 1 | `VehicleBrand` | `VehicleLine.brandId`, `Vehicle.brandId`, `MaintenanceTemplate.vehicleBrandId`, `MantItemVehiclePart.vehicleBrandId` |
| 2 | `VehicleLine` | `Vehicle.lineId`, `MaintenanceTemplate.vehicleLineId`, `MantItemVehiclePart.vehicleLineId` |
| 3 | `VehicleType` | `Vehicle.typeId` |
| 4 | `Vehicle` | `WorkOrder.vehicleId`, `Document.vehicleId`, `OdometerLog.vehicleId`, `MaintenanceAlert.vehicleId`, `VehicleDriver.vehicleId`, `VehicleMantProgram.vehicleId` |
| 5 | `MantCategory` | `MantItem.categoryId`, `MantItemRequest.categoryId` |
| 6 | `MantItem` | `PackageItem.mantItemId`, `WorkOrderItem.mantItemId`, `VehicleProgramItem.mantItemId`, `MantItemPart.mantItemId`, `MantItemVehiclePart.mantItemId`, `PurchaseOrderItem.mantItemId` |
| 7 | `MantItemRequest` | `MantItemRequest.createdMantItemId` (non-FK value field, `Int?` → `String?`) |
| 8 | `MantItemVehiclePart` | (FK fields on this model): `mantItemId`, `vehicleBrandId`, `vehicleLineId` |
| 9 | `MaintenanceTemplate` | `MaintenancePackage.templateId` |
| 10 | `MaintenancePackage` | `PackageItem.packageId` |
| 11 | `PackageItem` | (FK fields on this model): `packageId` (→ MaintenancePackage), `mantItemId` (→ MantItem) |
| 12 | `WorkOrder` | `WorkOrderItem.workOrderId`, `WorkOrderExpense.workOrderId`, `WorkOrderApproval.workOrderId`, `ExpenseAuditLog.workOrderId`, `MaintenanceAlert.workOrderId`, `FinancialAlert.workOrderId`, `Invoice.workOrderId`, `InternalWorkTicket.workOrderId`, `PurchaseOrder.workOrderId`, `VehicleProgramPackage.workOrderId` |
| 13 | `WorkOrderItem` | `InvoiceItem.workOrderItemId`, `TicketLaborEntry.workOrderItemId`, `TicketPartEntry.workOrderItemId`, `PurchaseOrderItem.workOrderItemId` |
| 14 | `Technician` | `WorkOrder.technicianId`, `VehicleProgramPackage.technicianId`, `VehicleProgramItem.technicianId`, `InternalWorkTicket.technicianId`, `TicketLaborEntry.technicianId` |
| 15 | `Provider` | `WorkOrder.providerId`, `Invoice.supplierId`, `PartPriceHistory.supplierId`, `WorkOrderExpense.providerId`, `PurchaseOrder.providerId`, `VehicleProgramPackage.providerId`, `VehicleProgramItem.providerId` |
| 16 | `Driver` | `OdometerLog.driverId`, `VehicleDriver.driverId` |
| 17 | `VehicleDriver` | (FK fields on this model): `vehicleId` (→ Vehicle), `driverId` (→ Driver) |
| 18 | `OdometerLog` | (FK fields on this model): `vehicleId` (→ Vehicle), `driverId` (→ Driver), `technicianId` (→ Technician) |
| 19 | `MaintenanceAlert` | (FK fields on this model): `vehicleId` (→ Vehicle), `workOrderId` (`Int?` → `String?`, → WorkOrder) |
| 20 | `FinancialAlert` | (FK fields on this model): `workOrderId` (`Int?` → `String?`, → WorkOrder) |
| 21 | `DocumentTypeConfig` | `Document.documentTypeId` |
| 22 | `VehicleMantProgram` | (FK fields on this model): `vehicleId` (→ Vehicle); affects: `VehicleProgramPackage.programId` |
| 23 | `VehicleProgramPackage` | (FK fields on this model): `programId` (→ VehicleMantProgram), `technicianId?` (→ Technician), `providerId?` (→ Provider), `workOrderId?` (→ WorkOrder) |
| 24 | `VehicleProgramItem` | (FK fields on this model): `packageId` (→ VehicleProgramPackage), `technicianId?` (→ Technician), `providerId?` (→ Provider) |

### 1.3 Migration Strategy

- Migration approach: `prisma migrate reset`
- Rationale: Pre-production environment with no live tenant data. A Big Bang reset is safe and avoids the complexity of multi-step backfill migrations across 24 models and ~55 FK fields.
- Command sequence:
  1. Edit `prisma/schema.prisma` (all 24 PKs + all FK types)
  2. `pnpm prisma:generate` — validate schema; fix any reported errors before proceeding
  3. `pnpm prisma migrate reset` — destructive reset; confirm developer intention first

### 1.4 Special Case: MantItemRequest.createdMantItemId

This field stores a MantItem ID by value — it is NOT declared as a Prisma `@relation` FK, but it semantically references MantItem. It must be changed from `Int?` to `String?` in the schema, and all code that reads/writes this field must be audited for `parseInt` coercions.

### 1.5 Gherkin Scenarios

```gherkin
Feature: Schema Primary Keys (Domain 1)

  Scenario: VehicleBrand PK is UUID after migration
    Given prisma/schema.prisma has been updated
    When I run `pnpm prisma:generate`
    Then VehicleBrand model has `id String @id @default(uuid())`
    And VehicleLine.brandId is of type String
    And Vehicle.brandId is of type String
    And MaintenanceTemplate.vehicleBrandId is of type String
    And MantItemVehiclePart.vehicleBrandId is of type String

  Scenario: WorkOrder PK change propagates to 10 dependent models
    Given WorkOrder.id is now String
    When I check all FK fields pointing to WorkOrder
    Then WorkOrderItem.workOrderId is String
    And WorkOrderExpense.workOrderId is String
    And WorkOrderApproval.workOrderId is String
    And ExpenseAuditLog.workOrderId is String
    And MaintenanceAlert.workOrderId is String?
    And FinancialAlert.workOrderId is String?
    And Invoice.workOrderId is String (nullable)
    And InternalWorkTicket.workOrderId is String (nullable)
    And PurchaseOrder.workOrderId is String (nullable)
    And VehicleProgramPackage.workOrderId is String (nullable)

  Scenario: migrate reset succeeds with clean schema
    Given all 24 PKs and all FK fields have been updated in schema.prisma
    When I run `pnpm prisma migrate reset` and confirm the prompt
    Then the database is recreated with no errors
    And `pnpm prisma:generate` reports 0 schema validation errors
    And the generated Prisma client exposes `id: string` on all 24 migrated models

  Scenario: MantItemRequest.createdMantItemId is treated as String? after migration
    Given MantItemRequest.createdMantItemId was Int?
    When schema is updated and migrate reset is run
    Then MantItemRequest.createdMantItemId is String? in the generated client
    And no code path calls parseInt() on this field value
```

---

## Domain 2: Validation Utility Contract

### 2.1 Rule: validation.ts must replace integer utilities with string-safe equivalents

The file `src/lib/validation.ts` currently exports integer-specific utilities. After this change, the contract is:

**Removals** (these exports must no longer exist):
- `safeParseInt(id: string | undefined): number | null` — REMOVED
- `positiveIntSchema` (Zod `z.number().positive().int()`) — REMOVED

**Changes** (existing exports with new signatures):
- `parseIdParam(id: string | undefined): string | null`
  - Was: `number | null`
  - Now: returns the `id` string trimmed if non-empty and non-undefined, otherwise `null`
  - Must NOT call `parseInt`, `Number()`, or `+id`
- `validateIdParam(id: string | undefined): { id: string } | { error: string; status: number }`
  - Was: `{ id: number } | { error: string; status: number }`
  - Now: returns `{ id: string }` on success, `{ error: 'ID is required', status: 400 }` on empty/undefined

**Additions**:
- `safeParseId(id: string | undefined): string | null`
  - Returns the trimmed id string if non-empty and non-undefined, otherwise `null`
  - Alias/replacement for the removed `safeParseInt` — same call sites, new return type
- `idSchema`
  - Zod schema: `z.string().min(1)`
  - Replaces `positiveIntSchema` for all ID validation in Zod schemas

### 2.2 No parseInt on URL Path Parameters

No file under `src/app/api/` may call `parseInt()`, `Number()`, or use the unary `+` operator on a URL path parameter that represents a model ID (e.g., `params.id`, `params.vehicleId`).

### 2.3 Gherkin Scenarios

```gherkin
Feature: Validation Utility Contract (Domain 2)

  Scenario: safeParseId returns string when valid
    Given safeParseId is imported from @/lib/validation
    When called with "abc123-uuid-value"
    Then it returns "abc123-uuid-value"

  Scenario: safeParseId returns null for empty string
    Given safeParseId is imported from @/lib/validation
    When called with ""
    Then it returns null

  Scenario: safeParseId returns null for undefined
    Given safeParseId is imported from @/lib/validation
    When called with undefined
    Then it returns null

  Scenario: parseIdParam returns string for valid id
    Given parseIdParam is imported from @/lib/validation
    When called with "some-uuid-string"
    Then it returns "some-uuid-string" as a string
    And it does NOT call parseInt or Number internally

  Scenario: parseIdParam returns null for missing id
    Given parseIdParam is imported from @/lib/validation
    When called with undefined or ""
    Then it returns null

  Scenario: validateIdParam returns id object on success
    Given validateIdParam is imported from @/lib/validation
    When called with "valid-uuid-string"
    Then it returns { id: "valid-uuid-string" }
    And id is of type string

  Scenario: validateIdParam returns error on empty input
    Given validateIdParam is imported from @/lib/validation
    When called with undefined
    Then it returns { error: "ID is required", status: 400 }

  Scenario: idSchema validates non-empty strings
    Given idSchema is imported from @/lib/validation
    When I call idSchema.parse("abc")
    Then it succeeds and returns "abc"
    When I call idSchema.parse("")
    Then it throws a ZodError

  Scenario: positiveIntSchema is no longer exported
    Given validation.ts has been updated
    When I import positiveIntSchema from @/lib/validation
    Then TypeScript reports a compile-time error (export does not exist)

  Scenario: safeParseInt is no longer exported
    Given validation.ts has been updated
    When I import safeParseInt from @/lib/validation
    Then TypeScript reports a compile-time error (export does not exist)
```

---

## Domain 3: API Routes — ID Handling

### 3.1 Rule: All 28 route files must use string IDs

All route files under `src/app/api/` that currently extract model IDs from URL params must be updated to:
1. Use `validateIdParam()` or `parseIdParam()` from `src/lib/validation` (string-returning versions)
2. Pass the resulting string directly to Prisma `where: { id: ... }` without any numeric coercion
3. Remove all `parseInt(params.id, 10)`, `Number(params.id)`, or `+params.id` calls on model ID params

### 3.2 Affected Route Files

The following 28 route files are in scope (based on proposal analysis):

- `src/app/api/vehicles/vehicles/[id]/route.ts`
- `src/app/api/vehicles/brands/[id]/route.ts`
- `src/app/api/vehicles/lines/[id]/route.ts`
- `src/app/api/vehicles/types/[id]/route.ts`
- `src/app/api/vehicles/documents/[id]/route.ts`
- `src/app/api/vehicles/odometer/[id]/route.ts`
- `src/app/api/maintenance/mant-items/[id]/route.ts`
- `src/app/api/maintenance/mant-categories/[id]/route.ts`
- `src/app/api/maintenance/mant-template/[id]/route.ts`
- `src/app/api/maintenance/packages/[id]/route.ts`
- `src/app/api/maintenance/package-items/[id]/route.ts`
- `src/app/api/maintenance/vehicle-programs/[id]/route.ts`
- `src/app/api/maintenance/vehicle-parts/[id]/route.ts`
- `src/app/api/maintenance/work-orders/[id]/route.ts`
- `src/app/api/maintenance/work-orders/[id]/items/route.ts`
- `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts`
- `src/app/api/maintenance/work-orders/[id]/expenses/route.ts`
- `src/app/api/maintenance/work-orders/[id]/expenses/[expenseId]/route.ts`
- `src/app/api/maintenance/work-orders/[id]/import-recipe/route.ts`
- `src/app/api/maintenance/alerts/[id]/route.ts`
- `src/app/api/people/drivers/[id]/route.ts`
- `src/app/api/people/technicians/[id]/route.ts`
- `src/app/api/people/providers/[id]/route.ts`
- `src/app/api/invoices/[id]/route.ts`
- `src/app/api/purchase-orders/[id]/route.ts`
- `src/app/api/purchase-orders/[id]/items/route.ts`
- `src/app/api/inventory/items/[id]/route.ts`
- `src/app/api/internal-tickets/[id]/route.ts`

### 3.3 Response Shape Invariant

The JSON response shape of all API routes is unchanged. IDs are now strings in the response payload, but all other fields, nesting structure, and status codes remain identical. Callers that were already treating IDs as opaque values require no change. Callers that were doing numeric comparisons on IDs must be updated (see Domain 4).

### 3.4 Standard Pattern

After this change, the standard ID extraction pattern in all route files is:

```typescript
// Before (Int era)
const id = parseInt(params.id, 10);
if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

// After (UUID era)
const result = validateIdParam(params.id);
if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
const { id } = result;
// id is now a string, passed directly to Prisma
```

### 3.5 Gherkin Scenarios

```gherkin
Feature: API Routes ID Handling (Domain 3)

  Scenario: GET /api/vehicles/brands/:id with valid UUID returns 200
    Given a VehicleBrand with id "a1b2c3d4-uuid-value" exists in the database
    When GET /api/vehicles/brands/a1b2c3d4-uuid-value is called
    Then the response status is 200
    And the response body contains id "a1b2c3d4-uuid-value" as a string

  Scenario: GET /api/vehicles/brands/:id with numeric string returns 404 or 400
    Given no VehicleBrand has id "42" (since IDs are now UUIDs)
    When GET /api/vehicles/brands/42 is called
    Then the response status is 404 (record not found)
    And the route does NOT attempt parseInt on the param

  Scenario: DELETE /api/maintenance/work-orders/:id with empty id returns 400
    When DELETE /api/maintenance/work-orders/ is called with an empty id segment
    Then the response status is 400
    And the response body contains { "error": "ID is required" }

  Scenario: No parseInt call exists in any API route file for model IDs
    Given the codebase after migration
    When I grep for 'parseInt(params' across src/app/api/
    Then no matches are found

  Scenario: PATCH /api/people/technicians/:id updates correctly with string id
    Given a Technician with id "tech-uuid-abc123" exists
    When PATCH /api/people/technicians/tech-uuid-abc123 is called with valid body
    Then the response status is 200
    And the updated Technician.id in the response is "tech-uuid-abc123" as a string

  Scenario: Nested route /api/maintenance/work-orders/:id/items/:itemId handles both IDs as strings
    Given a WorkOrder with id "wo-uuid-1" and a WorkOrderItem with id "item-uuid-1"
    When GET /api/maintenance/work-orders/wo-uuid-1/items/item-uuid-1 is called
    Then the route passes "wo-uuid-1" and "item-uuid-1" as strings to Prisma
    And no parseInt or Number() coercion is applied to either param

  Scenario: API continues to return correct tenant-scoped data after ID type change
    Given a tenant with tenantId "tenant-abc"
    And a Vehicle belonging to that tenant with id "vehicle-uuid-xyz"
    When GET /api/vehicles/vehicles/vehicle-uuid-xyz is called with the correct tenant session
    Then the response returns the vehicle with id "vehicle-uuid-xyz"
    And no cross-tenant data is returned (tenant isolation unchanged)
```

---

## Domain 4: TypeScript Types

### 4.1 Rule: All type interfaces for migrated models must use string IDs

Every TypeScript interface, type alias, or Zod schema that represents one of the 24 migrated models or their FK relations must be updated:

- `id: number` → `id: string` for the 24 model interfaces
- `xyzId: number` → `xyzId: string` for all FK fields referencing migrated models
- `xyzId?: number` → `xyzId?: string` for nullable FK fields
- Zod schemas: `z.number()` or `z.number().positive().int()` used for ID fields → `z.string().min(1)`

### 4.2 Affected Type Files (estimated 37 files)

Type files are located primarily in:
- `src/app/dashboard/[module]/components/[Component]/[Component].types.ts`
- `src/app/api/[module]/route.ts` (inline type assertions)
- `src/lib/types.ts` or similar shared type files

All files must be discovered via `pnpm type-check` output after schema and validation changes — TypeScript strict mode will surface any remaining `number` where `string` is expected.

### 4.3 Zod Schema Updates

Any Zod schema used for validating request bodies or form data that includes an ID field for a migrated model must change:

```typescript
// Before
const schema = z.object({
  vehicleId: z.number().positive().int(),
  technicianId: z.number().optional(),
});

// After
const schema = z.object({
  vehicleId: z.string().min(1),
  technicianId: z.string().min(1).optional(),
});
```

### 4.4 Build Verification Gate

`pnpm type-check` must exit with code 0. This is a hard gate — no TypeScript errors are acceptable after this change. The strict TypeScript configuration (`noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) means any missed `id: number` annotation will be caught at type-check time.

### 4.5 Gherkin Scenarios

```gherkin
Feature: TypeScript Types (Domain 4)

  Scenario: Vehicle interface has id as string
    Given the Vehicle TypeScript interface is defined
    Then id is of type string, not number
    And brandId is of type string
    And lineId is of type string
    And typeId is of type string

  Scenario: WorkOrder interface FK fields are all strings
    Given the WorkOrder TypeScript interface is defined
    Then vehicleId is of type string
    And technicianId is of type string or undefined
    And providerId is of type string or undefined

  Scenario: Zod form schema for work order creation uses string for vehicleId
    Given the work order creation Zod schema
    When vehicleId is validated with a UUID string "vehicle-uuid-abc"
    Then validation passes and returns "vehicle-uuid-abc"
    When vehicleId is validated with the number 42
    Then TypeScript reports a compile-time error (type mismatch)

  Scenario: pnpm type-check passes with 0 errors after all type changes
    Given all 37 type files have been updated
    When `pnpm type-check` is run
    Then it exits with code 0
    And no diagnostic mentions "number" in relation to a migrated model ID

  Scenario: idSchema is used in place of positiveIntSchema in all Zod schemas
    Given validation.ts exports idSchema = z.string().min(1)
    When any route or component Zod schema needs to validate an ID
    Then it imports idSchema from @/lib/validation
    And not positiveIntSchema (which no longer exists)

  Scenario: No interface for a migrated model has id: number
    Given the codebase after migration
    When I grep for 'id: number' in TypeScript files for the 24 migrated models
    Then no matches are found in any interface, type, or inline annotation for those models
```

---

## Domain 5: Tests

### 5.1 Rule: Test factories must use UUID strings for IDs

All test files and factory helpers must:
1. Generate IDs via `crypto.randomUUID()` or use fixed UUID-format strings (e.g., `'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'`)
2. Never hardcode numeric IDs (e.g., `id: 1`, `vehicleId: 2`, `technicianId: 42`)
3. Use string equality for all ID comparisons (e.g., `expect(result.id).toBe('vehicle-uuid-1')` not `expect(result.id).toBe(1)`)

### 5.2 Affected Test Files

Minimum 4 test files identified in proposal; actual scope must be confirmed by running:
```bash
grep -r 'id: [0-9]' src/app/api/**/__tests__/
```

Known affected tests:
- `src/app/api/maintenance/work-orders/__tests__/work-order-api.test.ts`
- `src/app/api/maintenance/__tests__/mant-items-crud.test.ts`
- `src/app/api/vehicles/__tests__/vehicles-crud.test.ts`
- `src/app/api/__tests__/multi-tenant-security.test.ts`

Any additional test files surfaced by the grep must also be updated.

### 5.3 Test Factory Pattern

```typescript
// Before (Int era)
const mockVehicle = {
  id: 1,
  brandId: 2,
  lineId: 3,
  typeId: 4,
};

// After (UUID era)
const mockVehicle = {
  id: crypto.randomUUID(),
  brandId: crypto.randomUUID(),
  lineId: crypto.randomUUID(),
  typeId: crypto.randomUUID(),
};

// OR with fixed deterministic values for snapshot-style tests
const mockVehicle = {
  id: 'vehicle-test-uuid-0001',
  brandId: 'brand-test-uuid-0001',
  lineId: 'line-test-uuid-0001',
  typeId: 'type-test-uuid-0001',
};
```

### 5.4 Gherkin Scenarios

```gherkin
Feature: Tests (Domain 5)

  Scenario: Test factory generates UUID string IDs
    Given a test factory for Vehicle
    When it creates a mock Vehicle
    Then vehicle.id is a string
    And vehicle.id matches the UUID format or a fixed string constant
    And vehicle.id is NOT a number

  Scenario: All Jest tests pass after ID type migration
    Given all test files have been updated
    When `pnpm test` is run
    Then all test suites pass with 0 failures

  Scenario: No test file contains numeric hardcoded ID for a migrated model
    Given the codebase after migration
    When I grep for 'id: [0-9]+' in test files for migrated models
    Then no matches are found

  Scenario: Multi-tenant security test uses UUID IDs for all models
    Given multi-tenant-security.test.ts has been updated
    When it creates mock vehicles and work orders for tenant isolation testing
    Then all IDs are string UUIDs
    And tenant isolation assertions use string equality (===)

  Scenario: Work order lifecycle test passes with UUID IDs
    Given work-order-api.test.ts has been updated
    When the full work order lifecycle is exercised in tests
    Then all intermediate WorkOrder.id values are strings
    And Prisma mock calls receive string IDs in where clauses

  Scenario: ID comparisons in tests use string equality
    Given a test that checks returned vehicle ID
    Then the assertion is expect(vehicle.id).toBe('vehicle-uuid-string')
    And NOT expect(vehicle.id).toBe(1)
    And NOT expect(vehicle.id).toEqual(expect.any(Number))
```

---

## Domain 6: Seed Files

### 6.1 Rule: Seed files must not specify explicit id values for migrated models

The four seed files must be updated to:
1. **Not specify** `id:` fields for the 24 migrated models — Prisma will auto-generate UUIDs via `@default(uuid())`
2. **Replace** all `connect: { id: N }` patterns (where N is a numeric literal) with variable references to previously created records

Affected seed files:
- `prisma/seed.ts`
- `prisma/seed-multitenancy.ts`
- `prisma/seed-staging-demo.ts`
- `prisma/seed-financial-demo.ts`

### 6.2 Pattern Update

```typescript
// Before (Int era) — explicit numeric ID + numeric FK connect
const brand = await prisma.vehicleBrand.create({
  data: { id: 1, name: 'Toyota', tenantId: tenant.id },
});
const vehicle = await prisma.vehicle.create({
  data: {
    licensePlate: 'ABC-123',
    brandId: 1,  // or connect: { id: 1 }
    tenantId: tenant.id,
  },
});

// After (UUID era) — no explicit id, use variable reference for FK
const brand = await prisma.vehicleBrand.create({
  data: { name: 'Toyota', tenantId: tenant.id },
  // id auto-generated as UUID by Prisma
});
const vehicle = await prisma.vehicle.create({
  data: {
    licensePlate: 'ABC-123',
    brandId: brand.id,  // reference the created record's auto-generated UUID
    tenantId: tenant.id,
  },
});
```

### 6.3 Seed Execution Contract

- `pnpm db:seed` must complete with no TypeScript type errors
- `pnpm db:seed` must complete with no Prisma FK constraint violations
- Seed data relationships must be preserved — the same logical data structure must be created, only the ID generation mechanism changes
- Seed files may continue to use `upsert` with `where: { id: someVar }` if and only if `someVar` is a string variable, not a numeric literal

### 6.4 Gherkin Scenarios

```gherkin
Feature: Seed Files (Domain 6)

  Scenario: Seed completes without FK constraint errors after migration
    Given prisma migrate reset has been run successfully
    And all four seed files have been updated
    When `pnpm db:seed` is run
    Then it exits with code 0
    And no Prisma FK constraint violation is reported
    And no TypeScript type error is reported during compilation

  Scenario: VehicleBrand created in seed has auto-generated UUID id
    Given seed-staging-demo.ts creates a VehicleBrand without specifying id
    When the seed runs and creates the VehicleBrand
    Then vehicleBrand.id is a UUID string (length 36, format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    And NOT a number

  Scenario: FK connect uses variable reference, not numeric literal
    Given seed-staging-demo.ts creates a VehicleBrand then a VehicleLine
    When VehicleLine is created with brandId
    Then brandId is set to vehicleBrand.id (variable reference)
    And NOT to a numeric literal such as 1 or 2

  Scenario: Seed file for staging demo seeds all relationships correctly
    Given seed-staging-demo.ts has been updated
    When `pnpm seed:demo` is run (or `pnpm db:seed` with staging config)
    Then all vehicles are created with valid string UUID vehicleIds
    And all work orders are created with valid string UUID vehicleIds and technicianIds
    And all maintenance alerts reference vehicles by string UUID

  Scenario: No seed file contains 'connect: { id: N }' for a numeric N
    Given all four seed files have been updated
    When I grep for 'connect: { id: [0-9]' in prisma/seed*.ts
    Then no matches are found

  Scenario: No seed file specifies explicit numeric id for a migrated model
    Given all four seed files have been updated
    When I grep for '^  id: [0-9]' in prisma/seed*.ts
    Then no matches are found for any of the 24 migrated model create calls
```

---

## Acceptance Criteria

The following 10 criteria must ALL pass before this change is considered complete:

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| AC-1 | `pnpm prisma validate` passes with 0 errors after schema changes | `pnpm prisma:generate` exits with code 0 |
| AC-2 | `prisma migrate reset` completes without error | Command exits with code 0; no migration failure in output |
| AC-3 | `pnpm type-check` passes with 0 TypeScript errors | Command exits with code 0; no diagnostic output |
| AC-4 | No file contains `parseInt(` applied to a model ID URL param | `grep -r "parseInt(params" src/app/api/` returns 0 matches |
| AC-5 | No TypeScript interface for a migrated model has `id: number` | `grep -r "id: number" src/` returns 0 matches for the 24 migrated model interfaces |
| AC-6 | `positiveIntSchema` export is removed from validation.ts | `grep "positiveIntSchema" src/lib/validation.ts` returns 0 matches |
| AC-7 | `pnpm db:seed` completes without error | Command exits with code 0; seed completes all inserts |
| AC-8 | All Jest tests pass | `pnpm test` exits with code 0; 0 test failures |
| AC-9 | No test file contains `id: [0-9]+` for migrated model IDs | `grep -rn "id: [0-9]" src/app/api/**/__tests__/` returns 0 matches for migrated models |
| AC-10 | `pnpm build` passes with 0 errors | `pnpm build` exits with code 0; no build errors |

---

## Implementation Order

The 6 domains must be addressed in this sequence to minimize cascading TypeScript errors:

1. **Domain 1** (Schema) — Must be first; Prisma client regeneration makes the new types available to all downstream files
2. **Domain 2** (Validation utility) — Must come before Domain 3; routes depend on the updated utility signatures
3. **Domain 6** (Seeds) — Can be done in parallel with Domain 3 once Domain 1 is complete
4. **Domain 3** (API Routes) — Depends on Domain 2; update all 28 route files
5. **Domain 4** (TypeScript Types) — Run `pnpm type-check` after Domains 1-3 to surface all remaining type errors; fix them all
6. **Domain 5** (Tests) — Last; after types are clean, update test factories and fix any test type errors; run `pnpm test`

Gate between phases: run `pnpm type-check` after each domain. Do not proceed to the next domain with type errors remaining from the previous one.

---

## Out of Scope (Reaffirmed from Proposal)

- The 22 models already on UUID/CUID: Tenant, User, Subscription, Payment, WorkOrderExpense, WorkOrderApproval, ExpenseAuditLog, MasterPart, MantItemPart, Invoice, InvoiceItem, PartPriceHistory, InvoicePayment, PurchaseOrder, PurchaseOrderItem, PartCompatibility, InventoryItem, InventoryMovement, InternalWorkTicket, TicketLaborEntry, TicketPartEntry, Document — untouched
- Changing CUID models to UUID format
- Adding `tenantId` to child models (separate `schema-tenant-isolation` change)
- Subdomain routing, billing, feature work
- Production deployment
