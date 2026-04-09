# Tasks: Schema ID Normalization (Int → UUID)

**Change**: schema-id-normalization
**Status**: Ready for implementation
**Date**: 2026-02-25
**Total tasks**: 69

---

## Phase 1: Schema Changes

Edit `prisma/schema.prisma` to migrate all 24 models from `Int @id @default(autoincrement())` to `String @id @default(uuid())`, and update all FK fields that reference those models.

- [ ] 1.1 Edit `prisma/schema.prisma` — change PKs for 6 Vehicle cluster models:
  - `VehicleBrand.id  Int` → `String @id @default(uuid())`
  - `VehicleLine.id  Int` → `String @id @default(uuid())`
  - `VehicleType.id  Int` → `String @id @default(uuid())`
  - `Vehicle.id  Int` → `String @id @default(uuid())`
  - `VehicleDriver.id  Int` → `String @id @default(uuid())`
  - `OdometerLog.id  Int` → `String @id @default(uuid())`

- [ ] 1.2 Edit `prisma/schema.prisma` — change PKs for 1 Documents cluster model:
  - `DocumentTypeConfig.id  Int` → `String @id @default(uuid())`

- [ ] 1.3 Edit `prisma/schema.prisma` — change PKs for 4 Maintenance Items cluster models:
  - `MantCategory.id  Int` → `String @id @default(uuid())`
  - `MantItem.id  Int` → `String @id @default(uuid())`
  - `MantItemRequest.id  Int` → `String @id @default(uuid())`
  - `MantItemVehiclePart.id  Int` → `String @id @default(uuid())`

- [ ] 1.4 Edit `prisma/schema.prisma` — change PKs for 3 Maintenance Templates cluster models:
  - `MaintenanceTemplate.id  Int` → `String @id @default(uuid())`
  - `MaintenancePackage.id  Int` → `String @id @default(uuid())`
  - `PackageItem.id  Int` → `String @id @default(uuid())`

- [ ] 1.5 Edit `prisma/schema.prisma` — change PKs for 3 Vehicle Programs cluster models:
  - `VehicleMantProgram.id  Int` → `String @id @default(uuid())`
  - `VehicleProgramPackage.id  Int` → `String @id @default(uuid())`
  - `VehicleProgramItem.id  Int` → `String @id @default(uuid())`

- [ ] 1.6 Edit `prisma/schema.prisma` — change PKs for 2 Work Orders cluster models:
  - `WorkOrder.id  Int` → `String @id @default(uuid())`
  - `WorkOrderItem.id  Int` → `String @id @default(uuid())`

- [ ] 1.7 Edit `prisma/schema.prisma` — change PKs for 2 Alerts cluster models:
  - `MaintenanceAlert.id  Int` → `String @id @default(uuid())`
  - `FinancialAlert.id  Int` → `String @id @default(uuid())`

- [ ] 1.8 Edit `prisma/schema.prisma` — change PKs for 3 People cluster models:
  - `Technician.id  Int` → `String @id @default(uuid())`
  - `Provider.id  Int` → `String @id @default(uuid())`
  - `Driver.id  Int` → `String @id @default(uuid())`

- [ ] 1.9 Edit `prisma/schema.prisma` — change all FK fields on Vehicle cluster models (own FK fields and incoming from other models):
  - `Vehicle.brandId  Int` → `String`
  - `Vehicle.lineId  Int?` → `String?`
  - `Vehicle.typeId  Int?` → `String?`
  - `VehicleDriver.vehicleId  Int` → `String`
  - `VehicleDriver.driverId  Int` → `String`
  - `OdometerLog.vehicleId  Int` → `String`
  - `OdometerLog.driverId  Int?` → `String?`
  - `OdometerLog.technicianId  Int?` → `String?`

- [ ] 1.10 Edit `prisma/schema.prisma` — change all FK fields on models that point to VehicleBrand, VehicleLine, VehicleType, or Vehicle:
  - `VehicleLine.brandId  Int` → `String`
  - `MaintenanceTemplate.vehicleBrandId  Int?` → `String?`
  - `MaintenanceTemplate.vehicleLineId  Int?` → `String?`
  - `MantItemVehiclePart.vehicleBrandId  Int?` → `String?`
  - `MantItemVehiclePart.vehicleLineId  Int?` → `String?`
  - `WorkOrder.vehicleId  Int` → `String`
  - `Document.vehicleId  Int` → `String`
  - `MaintenanceAlert.vehicleId  Int` → `String`
  - `VehicleMantProgram.vehicleId  Int` → `String`

- [ ] 1.11 Edit `prisma/schema.prisma` — change all FK fields pointing to DocumentTypeConfig:
  - `Document.documentTypeId  Int?` → `String?`

- [ ] 1.12 Edit `prisma/schema.prisma` — change all FK fields pointing to MantCategory and MantItem:
  - `MantItem.categoryId  Int` → `String`
  - `MantItemRequest.categoryId  Int?` → `String?`
  - `MantItemRequest.createdMantItemId  Int?` → `String?`  (non-FK value field — still must become String?)
  - `MantItemVehiclePart.mantItemId  Int` → `String`
  - `PackageItem.mantItemId  Int` → `String`
  - `WorkOrderItem.mantItemId  Int?` → `String?`
  - `VehicleProgramItem.mantItemId  Int?` → `String?`
  - `MantItemPart.mantItemId  Int` → `String`  (MantItemPart uses cuid PK but FK is Int)
  - `PurchaseOrderItem.mantItemId  Int?` → `String?`

- [ ] 1.13 Edit `prisma/schema.prisma` — change all FK fields pointing to MaintenanceTemplate and MaintenancePackage:
  - `MaintenancePackage.templateId  Int` → `String`
  - `PackageItem.packageId  Int` → `String`

- [ ] 1.14 Edit `prisma/schema.prisma` — change all FK fields pointing to VehicleMantProgram and VehicleProgramPackage:
  - `VehicleProgramPackage.programId  Int` → `String`
  - `VehicleProgramPackage.technicianId  Int?` → `String?`
  - `VehicleProgramPackage.providerId  Int?` → `String?`
  - `VehicleProgramPackage.workOrderId  Int?` → `String?`
  - `VehicleProgramItem.packageId  Int` → `String`
  - `VehicleProgramItem.technicianId  Int?` → `String?`
  - `VehicleProgramItem.providerId  Int?` → `String?`

- [ ] 1.15 Edit `prisma/schema.prisma` — change all FK fields pointing to WorkOrder and WorkOrderItem (note: WorkOrderExpense, WorkOrderApproval, ExpenseAuditLog, Invoice, InternalWorkTicket, PurchaseOrder use cuid PKs but their FK fields are Int — all must change):
  - `WorkOrderItem.workOrderId  Int` → `String`
  - `WorkOrderExpense.workOrderId  Int` → `String`
  - `WorkOrderApproval.workOrderId  Int` → `String`
  - `ExpenseAuditLog.workOrderId  Int` → `String`
  - `MaintenanceAlert.workOrderId  Int?` → `String?`
  - `FinancialAlert.workOrderId  Int?` → `String?`
  - `Invoice.workOrderId  Int?` → `String?`
  - `InternalWorkTicket.workOrderId  Int?` → `String?`
  - `PurchaseOrder.workOrderId  Int?` → `String?`
  - `InvoiceItem.workOrderItemId  Int?` → `String?`
  - `TicketLaborEntry.workOrderItemId  Int?` → `String?`
  - `TicketPartEntry.workOrderItemId  Int?` → `String?`
  - `PurchaseOrderItem.workOrderItemId  Int?` → `String?`

- [ ] 1.16 Edit `prisma/schema.prisma` — change all FK fields pointing to MaintenanceAlert and FinancialAlert (own FK fields already covered above; verify `MaintenanceAlert.programItemId  Int?` → `String?`):
  - `MaintenanceAlert.programItemId  Int?` → `String?`

- [ ] 1.17 Edit `prisma/schema.prisma` — change all FK fields pointing to Technician, Provider, and Driver:
  - `WorkOrder.technicianId  Int?` → `String?`
  - `WorkOrder.providerId  Int?` → `String?`
  - `Invoice.supplierId  Int?` → `String?`
  - `PartPriceHistory.supplierId  Int?` → `String?`
  - `WorkOrderExpense.providerId  Int?` → `String?`
  - `PurchaseOrder.providerId  Int?` → `String?`
  - `InternalWorkTicket.technicianId  Int` → `String`  (InternalWorkTicket uses cuid PK but FK is Int)
  - `TicketLaborEntry.technicianId  Int` → `String`  (TicketLaborEntry uses cuid PK but FK is Int)

- [ ] 1.18 Run `pnpm prisma validate` — command must exit with code 0 and report no schema errors. Fix any reported field mismatches before proceeding.

- [ ] 1.19 Run `pnpm prisma migrate reset --force --skip-seed` — database is dropped and recreated. Confirm developer intention before running. Command must exit with code 0.

- [ ] 1.20 Run `pnpm prisma generate` — Prisma client is regenerated. Verify output shows no errors and that generated types expose `id: string` on all 24 migrated models.

---

## Phase 2: Validation Utility Refactoring

Replace all integer-parsing utilities in `src/lib/validation.ts` with string-safe equivalents, and update all files that import the removed symbols.

- [ ] 2.1 Edit `src/lib/validation.ts` — make the following changes:
  - Remove `safeParseInt` function entirely
  - Remove `positiveIntSchema` export entirely
  - Change `parseIdParam(value: string | undefined | null, paramName: string): number` → returns `string` (delegates to new `safeParseId`)
  - Change `validateIdParam(value, paramName): { valid: true; id: number } | ...` → returns `{ id: string }` on success (remove `valid: true` wrapper, return `{ error, status }` on failure per spec pattern)
  - Add `safeParseId(id: string | undefined): string | null` — returns trimmed string or null if empty/undefined
  - Add `idSchema = z.string().min(1)` export
  - Keep `optionalPositiveIntSchema` and `paginationSchema` untouched (they handle pagination limits, not model IDs)

- [ ] 2.2 Edit `src/app/api/vehicles/lines/route.ts` — replace `import { safeParseInt }` with `import { safeParseId }` from `@/lib/validation`; replace `safeParseInt(String(brandId))` → `safeParseId(brandId)`; remove any numeric coercion on the result (line 107)

- [ ] 2.3 Edit `src/app/api/maintenance/alerts/route.ts` — replace `import { safeParseInt }` with `import { safeParseId }` from `@/lib/validation`; replace `safeParseInt(vehicleIdParam)` → `safeParseId(vehicleIdParam)`; remove any numeric coercion on the result (line 57)

- [ ] 2.4 Update all 10 other files that import `validateIdParam` or `parseIdParam` from `@/lib/validation` to use the new string-returning signatures. Run `grep -r "from '@/lib/validation'" src/app/api/` to get the complete list. Confirm each import compiles after the validation.ts change.

- [ ] 2.5 Verify: run `grep -r "safeParseInt" src/` — must return 0 matches across the entire codebase

- [ ] 2.6 Verify: run `grep -r "positiveIntSchema" src/` — must return 0 matches across the entire codebase

---

## Phase 3: API Routes — parseInt Removal

Replace all `parseInt()` and `Number()` coercions on model ID params across 30 route files. Each file must use string IDs directly.

**Standard replacement pattern:**
```typescript
// BEFORE
const id = parseInt(params.id, 10);
if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

// AFTER
const result = validateIdParam(params.id);
if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
const { id } = result;
```

- [ ] 3.1 Edit `src/app/api/maintenance/work-orders/[id]/route.ts` — replace all 3 `parseInt(id)` calls (lines 75, 227, 526) with string ID extraction using `validateIdParam`; remove `isNaN` guards

- [ ] 3.2 Edit `src/app/api/maintenance/work-orders/[id]/expenses/route.ts` — replace 2 `parseInt(params.id)` calls (lines 46, 112) with `validateIdParam`

- [ ] 3.3 Edit `src/app/api/maintenance/work-orders/[id]/import-recipe/route.ts` — replace `parseInt(params.id)` (line 28) with `validateIdParam`

- [ ] 3.4 Edit `src/app/api/maintenance/work-orders/[id]/items/route.ts` — replace 2 `parseInt(id)` calls (lines 23, 110) with `validateIdParam`

- [ ] 3.5 Edit `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts` — replace any `parseInt` calls on both `params.id` and `params.itemId` with direct string usage; update `where` clauses to use string IDs

- [ ] 3.6 Edit `src/app/api/maintenance/work-orders/route.ts` — replace `parseInt(vehicleId)` (line 29) with direct string `vehicleId`; replace `parseInt(limit)` (line 92) only if referencing a model ID (keep `parseInt(limit)` for pagination take-clause — this is a non-ID integer and should remain)

- [ ] 3.7 Edit `src/app/api/vehicles/odometer/[id]/route.ts` — replace 3 `parseInt(params.id)` calls (lines 17, 73, 209) with `validateIdParam`

- [ ] 3.8 Edit `src/app/api/vehicles/document-types/[id]/route.ts` — replace 3 `parseInt(id, 10)` calls (lines 19, 82, 181) with `validateIdParam`

- [ ] 3.9 Edit `src/app/api/maintenance/package-items/[id]/route.ts` — replace `parseInt` calls with `validateIdParam`

- [ ] 3.10 Edit `src/app/api/maintenance/package-items/route.ts` — replace `parseInt(packageId)` (line 26) with direct string `packageId` in the `where` clause

- [ ] 3.11 Edit `src/app/api/maintenance/packages/[id]/route.ts` — replace `parseInt` calls with `validateIdParam`

- [ ] 3.12 Edit `src/app/api/maintenance/packages/route.ts` — replace `parseInt(templateId)` (line 26) with direct string `templateId` in the `where` clause

- [ ] 3.13 Edit `src/app/api/maintenance/vehicle-parts/[id]/route.ts` — replace `parseInt` calls with `validateIdParam`

- [ ] 3.14 Edit `src/app/api/maintenance/vehicle-parts/route.ts` — replace `parseInt(mantItemId)`, `parseInt(vehicleBrandId)`, `parseInt(vehicleLineId)` (lines 26-28) with direct string values in `where` clauses

- [ ] 3.15 Edit `src/app/api/maintenance/vehicle-parts/suggest/route.ts` — replace `parseInt(searchParams.get('mantItemId'))` and `parseInt(searchParams.get('vehicleId'))` (lines 20-21) with direct string values

- [ ] 3.16 Edit `src/app/api/maintenance/vehicle-programs/[id]/route.ts` — replace `parseInt` calls with `validateIdParam`

- [ ] 3.17 Edit `src/app/api/maintenance/vehicle-programs/route.ts` — replace `parseInt(vehicleId)` (line 19) with direct string `vehicleId`

- [ ] 3.18 Edit `src/app/api/maintenance/vehicles/[id]/recipes/route.ts` — replace any `parseInt` on the vehicle ID param with `validateIdParam` or direct string usage

- [ ] 3.19 Edit `src/app/api/maintenance/mant-categories/[id]/route.ts` — replace 3 `parseInt(id)` calls (lines 19, 59, 140) with `validateIdParam`

- [ ] 3.20 Edit `src/app/api/maintenance/mant-item-requests/[id]/route.ts` — replace 2 `parseInt(id, 10)` calls (lines 21, 70) with `validateIdParam`

- [ ] 3.21 Edit `src/app/api/maintenance/mant-items/[id]/route.ts` — replace 2 `parseInt(id)` calls (lines 18, 72) with `validateIdParam`

- [ ] 3.22 Edit `src/app/api/maintenance/mant-template/[id]/route.ts` — this file uses `validateIdParam` from validation.ts; update the import and usage to match the new string-returning signature (remove `valid: true` check, use `'error' in result` pattern)

- [ ] 3.23 Edit `src/app/api/maintenance/invoices/route.ts` — replace `parseInt(workOrderId)` (line 39), `parseInt(supplierId)` (line 50) with direct strings; replace `parseInt(limit)` (line 101) only if it is a model ID (keep for pagination)

- [ ] 3.24 Edit `src/app/api/invoices/route.ts` — replace `parseInt(workOrderId)` (line 36) with direct string `workOrderId`; keep `parseInt(limit)` for pagination only

- [ ] 3.25 Edit `src/app/api/purchase-orders/route.ts` — replace `parseInt(workOrderId)` (line 39) and `parseInt(providerId)` (line 42) with direct strings; keep `parseInt(limit)` for pagination; keep `parseInt(lastOC.orderNumber.split('-')[2])` (line 158) — this parses an order number sequence, not a model ID

- [ ] 3.26 Edit `src/app/api/inventory/parts/recommendations/route.ts` — replace `parseInt(vehicleId)` (line 22) with direct string `vehicleId`

- [ ] 3.27 Edit `src/app/api/internal-tickets/route.ts` — replace `parseInt(workOrderId, 10)` (line 23) with direct string `workOrderId`

- [ ] 3.28 Edit `src/app/api/vehicles/brands/[id]/route.ts` — this file uses `validateIdParam` from validation.ts; update import and usage to match the new string-returning signature

- [ ] 3.29 Edit `src/app/api/vehicles/lines/[id]/route.ts` — this file uses `validateIdParam` from validation.ts; update import and usage to match the new string-returning signature

- [ ] 3.30 Edit `src/app/api/vehicles/types/[id]/route.ts` — this file uses `validateIdParam` from validation.ts; update import and usage to match the new string-returning signature

- [ ] 3.31 Edit `src/app/api/vehicles/vehicles/[id]/route.ts` — this file uses `validateIdParam` from validation.ts; update import and usage to match the new string-returning signature

- [ ] 3.32 Edit `src/app/api/people/drivers/[id]/route.ts` — this file uses `validateIdParam` from validation.ts; update import and usage to match the new string-returning signature

- [ ] 3.33 Edit `src/app/api/people/providers/[id]/route.ts` — this file uses `validateIdParam` from validation.ts; update import and usage to match the new string-returning signature

- [ ] 3.34 Edit `src/app/api/people/technicians/[id]/route.ts` — this file uses `validateIdParam` from validation.ts; update import and usage to match the new string-returning signature

- [ ] 3.35 Verify: run `grep -rn "parseInt(params" src/app/api/` — must return 0 matches for any model ID extraction

- [ ] 3.36 Verify: run `grep -rn "parseInt(id\b" src/app/api/` — must return 0 matches (excluding pagination parseInt calls)

---

## Phase 4: TypeScript Type Files

Update all 27 `.types.ts` files that contain `id: number` for migrated models. Also update inline type annotations in route files if any remain after type-check.

- [ ] 4.1 Edit `src/app/dashboard/people/driver/components/DriverList/DriverList.types.ts` — change `id: number` → `id: string` on the Driver interface

- [ ] 4.2 Edit `src/app/dashboard/people/provider/components/ProviderList/ProviderList.types.ts` — change `id: number` → `id: string` on the Provider interface

- [ ] 4.3 Edit `src/app/dashboard/people/technician/components/TechnicianList/TechnicianList.types.ts` — change `id: number` → `id: string` on the Technician interface

- [ ] 4.4 Edit `src/app/dashboard/vehicles/brands/components/BrandList/BrandList.types.ts` — change `id: number` → `id: string`

- [ ] 4.5 Edit `src/app/dashboard/vehicles/brands/components/FormAddBrand/FormAddBrand.types.ts` — change `id: number` → `id: string` in callback type `onAddBrand: (brand: { id: number; name: string }) => void`

- [ ] 4.6 Edit `src/app/dashboard/vehicles/brands/components/FormEditBrand/FormEditBrand.types.ts` — change `id: number` → `id: string` in both the `brand` prop type and the `onEditBrand` callback type

- [ ] 4.7 Edit `src/app/dashboard/vehicles/lines/components/LineList/LineList.types.ts` — change `id: number` → `id: string`; change any `brandId: number` → `brandId: string`

- [ ] 4.8 Edit `src/app/dashboard/vehicles/lines/components/FormEditLine/FormEditLine.types.ts` — change all `id: number` → `id: string` occurrences (4 total across nested types)

- [ ] 4.9 Edit `src/app/dashboard/vehicles/types/components/TypeList/TypeList.types.ts` — change `id: number` → `id: string`

- [ ] 4.10 Edit `src/app/dashboard/vehicles/types/components/FormAddType/FormAddType.types.ts` — change `id: number` → `id: string` in the `onAddType` callback type

- [ ] 4.11 Edit `src/app/dashboard/vehicles/types/components/FormEditType/FormEditType.types.ts` — change `id: number` → `id: string` in both the `type` prop and `onEditType` callback

- [ ] 4.12 Edit `src/app/dashboard/maintenance/mant-categories/components/CategoriesList/CategoriesList.types.ts` — change `id: number` → `id: string`

- [ ] 4.13 Edit `src/app/dashboard/maintenance/mant-categories/components/FormAddCategory/FormAddCategory.types.ts` — change `id: number` → `id: string` in the `onAddCategory` callback type

- [ ] 4.14 Edit `src/app/dashboard/maintenance/mant-categories/components/FormEditCategory/FormEditCategory.types.ts` — change `id: number` → `id: string` in both the `category` prop and `onEditCategory` callback

- [ ] 4.15 Edit `src/app/dashboard/maintenance/mant-items/components/MantItemsList/MantItemsList.types.ts` — change all `id: number` occurrences → `id: string` (3 total, including nested category type)

- [ ] 4.16 Edit `src/app/dashboard/maintenance/mant-template/components/MantTemplatesList/MantTemplatesList.types.ts` — change all `id: number` → `id: string` (28 total occurrences across multiple nested interfaces)

- [ ] 4.17 Edit `src/app/dashboard/maintenance/mant-template/components/FormAddMantTemplate/FormAddMantTemplate.types.ts` — change all `id: number` → `id: string` (14 occurrences including nested brand, line, template, package interfaces)

- [ ] 4.18 Edit `src/app/dashboard/maintenance/mant-template/components/FormEditMantTemplate/FormEditMantTemplate.types.ts` — change all `id: number` → `id: string` (3 occurrences)

- [ ] 4.19 Edit `src/app/dashboard/maintenance/mant-template/components/FormEditMantTemplate/components/PackageList/PackageList.types.ts` — change all `id: number` → `id: string` (18 occurrences)

- [ ] 4.20 Edit `src/app/dashboard/maintenance/mant-template/components/FormEditMantTemplate/components/FormEditPackage/FormEditPackage.types.ts` — change all `id: number` → `id: string` (16 occurrences)

- [ ] 4.21 Edit `src/app/dashboard/maintenance/mant-template/components/FormEditMantTemplate/components/FormEditPackage/components/PackageItemList/PackageItemList.types.ts` — change all `id: number` → `id: string` (12 occurrences)

- [ ] 4.22 Edit `src/app/dashboard/maintenance/mant-template/components/FormEditMantTemplate/components/FormEditPackage/components/FormAddPackageItem/FormAddPackageItem.types.ts` — change all `id: number` → `id: string` (12 occurrences)

- [ ] 4.23 Edit `src/app/dashboard/maintenance/mant-template/components/FormEditMantTemplate/components/FormEditPackage/components/FormEditPackageItem/FormEditPackageItem.types.ts` — change all `id: number` → `id: string` (11 occurrences)

- [ ] 4.24 Edit `src/app/dashboard/maintenance/vehicle-programs/components/VehicleProgramsList/VehicleProgramsList.types.ts` — change all `id: number` → `id: string` (39 occurrences across deeply nested program, package, and item interfaces)

- [ ] 4.25 Edit `src/app/dashboard/maintenance/vehicle-parts/components/FormAddVehiclePart/FormAddVehiclePart.types.ts` — change all `id: number` → `id: string` (4 occurrences including mantItemId, vehicleBrandId, vehicleLineId fields)

- [ ] 4.26 Edit `src/app/dashboard/maintenance/vehicle-parts/components/VehiclePartsList/VehiclePartsList.types.ts` — change all `id: number` → `id: string` (6 occurrences)

- [ ] 4.27 Run `pnpm type-check` after completing tasks 4.1–4.26 — identify any remaining TypeScript errors in dashboard components, inline route type assertions, or shared lib types; fix each until `pnpm type-check` exits with code 0

---

## Phase 5: Zod Form Schemas

Update Zod schemas in `.form.ts` files to replace `z.number()` with `z.string().min(1)` for all ID fields (fields referencing migrated model PKs). Non-ID numeric fields (mileage, quantity, year, cylinder) must NOT be changed.

- [ ] 5.1 Edit `src/app/dashboard/vehicles/fleet/components/FormAddFleetVehicle/FormAddFleetVehicle.form.ts` — change:
  - `brandId: z.number()` → `brandId: z.string().min(1)`
  - `lineId: z.number()` → `lineId: z.string().min(1).optional()` (or nullable as appropriate)
  - `typeId: z.number()` → `typeId: z.string().min(1).optional()`
  - Leave `mileage: z.number()`, `cylinder: z.number()`, `year: z.number()` unchanged

- [ ] 5.2 Edit `src/app/dashboard/vehicles/fleet/components/FormEditFleetVehicle/FormEditFleetVehicle.form.ts` — change:
  - `id: z.number()` → `id: z.string().min(1)`
  - `brandId: z.number().nullable()` → `brandId: z.string().nullable()`
  - `lineId: z.number().nullable()` → `lineId: z.string().nullable()`
  - `typeId: z.number().nullable()` → `typeId: z.string().nullable()`
  - Leave `mileage`, `cylinder`, `year` unchanged

- [ ] 5.3 Edit `src/app/dashboard/vehicles/fleet/components/FormEditFleetVehicle/components/FormAddDocument/FormAddDocument.form.ts` — change:
  - `documentTypeId: z.number()` → `documentTypeId: z.string().min(1)`

- [ ] 5.4 Edit `src/app/dashboard/vehicles/fleet/components/FormEditFleetVehicle/components/FormEditDocument/FormEditDocument.form.ts` — change:
  - `documentTypeId: z.number()` → `documentTypeId: z.string().min(1)`

- [ ] 5.5 Edit `src/app/dashboard/vehicles/lines/components/FormEditLine/FormEditLine.form.ts` — change:
  - `brandId: z.number()` → `brandId: z.string().min(1)`

- [ ] 5.6 Edit `src/app/dashboard/maintenance/vehicle-parts/components/FormAddVehiclePart/FormAddVehiclePart.form.ts` — change:
  - `mantItemId: z.number().min(1, ...)` → `mantItemId: z.string().min(1, ...)`
  - `vehicleBrandId: z.number().min(1, ...)` → `vehicleBrandId: z.string().min(1, ...)`
  - `vehicleLineId: z.number().min(1, ...)` → `vehicleLineId: z.string().min(1, ...)`
  - Leave `yearFrom: z.number().nullable()`, `yearTo: z.number().nullable()`, `quantity: z.number().min(0.1)` unchanged

- [ ] 5.7 Edit `src/app/dashboard/maintenance/vehicle-parts/components/FormEditVehiclePart/FormEditVehiclePart.form.ts` — no ID fields need changing (yearFrom, yearTo, quantity are not model IDs); verify no z.number() on ID fields remain

- [ ] 5.8 Edit `src/app/dashboard/maintenance/mant-items/components/FormEditMantItem/FormEditMantItem.form.ts` — change:
  - `categoryId: z.number().min(1, ...)` → `categoryId: z.string().min(1, ...)`

- [ ] 5.9 Verify: run `grep -rn "z\.number()" src/app/dashboard/ | grep -E "Id:|id:"` — confirm 0 matches for ID fields (brandId, lineId, typeId, categoryId, mantItemId, vehicleBrandId, vehicleLineId, documentTypeId)

---

## Phase 6: Seed Files

Update seed files that have type annotations or runtime coercions using numeric IDs for migrated models.

- [ ] 6.1 Edit `prisma/seed-staging-demo.ts` — make the following changes:
  - Change type annotation `vehicleId: number` (line 705) → `vehicleId: string`
  - Change type annotation `programId: number` (line 706) → `programId: string`
  - Change `let driverId: number | null = null` (line 930) → `let driverId: string | null = null`
  - Replace `parseInt(woIdStr, 10)` (line 1447) with direct string `woIdStr`
  - Replace `parseInt(woIdStr, 10)` (line 1501) with direct string `woIdStr`
  - Replace `parseInt(woIdStr, 10)` (line 1218) with direct string `woIdStr`
  - Replace `workOrderIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n))` (line 1321) with `workOrderIds.filter(id => id.trim() !== '')`
  - Replace `parseInt(woIdStr, 10)` (line 2073) with direct string
  - Replace `parseInt(woIdStr, 10)` (line 2176) with direct string
  - Remove any explicit `id:` field from `prisma.vehicleBrand.create`, `prisma.vehicleLine.create`, `prisma.vehicleType.create`, etc. — Prisma auto-generates UUID

- [ ] 6.2 Edit `prisma/seed-multitenancy.ts` — change:
  - `vehicleId: number` (line 23) → `vehicleId: string` in function parameter type
  - Verify no other hardcoded numeric FK literals exist

- [ ] 6.3 Edit `prisma/seed.ts` — verify it contains no hardcoded numeric IDs for the 24 migrated models; update any `parseInt` calls on model ID fields if found

- [ ] 6.4 Edit `prisma/seed-financial-demo.ts` — verify it contains no hardcoded numeric IDs for the 24 migrated models; update any `parseInt` calls on model ID fields if found

- [ ] 6.5 Verify: run `grep -rn "parseInt" prisma/seed*.ts` — confirm any remaining `parseInt` calls are for non-ID numeric values (e.g., order number sequences, not model IDs)

---

## Phase 7: Test Files

Update test files that mock or assert on numeric IDs for migrated models.

- [ ] 7.1 Edit `src/lib/services/__tests__/MaintenanceAlertService.test.ts` — replace all numeric IDs for migrated models:
  - `id: 1` (vehicle mock, lines 34, 86, 133, 185) → `id: 'vehicle-test-uuid-0001'`
  - `id: 10` (package mock, lines 40, 92, 139, 191) → `id: 'package-test-uuid-0010'`
  - `id: 5` (mantItem mock, lines 41, 93, 140, 192) → `id: 'mant-item-test-uuid-0005'`
  - `id: 999` (pending alert mock, line 150) → `id: 'alert-test-uuid-0999'`
  - Update all `expect(result.id).toBe(N)` string assertions accordingly

- [ ] 7.2 Edit `src/lib/logic/__tests__/maintenance-logic.test.ts` — replace all numeric IDs in item mocks:
  - `{ id: 1, status: 'COMPLETED', ... }` (lines 106, 116, 124, 139) → `{ id: 'item-test-uuid-0001', ... }`
  - `{ id: 2, status: 'COMPLETED', ... }` (lines 107, 117, 125) → `{ id: 'item-test-uuid-0002', ... }`
  - These are VehicleProgramItem mocks — VehicleProgramItem is a migrated model

- [ ] 7.3 Scan remaining test files for any numeric ID usages that were missed. Run:
  `grep -rn "id: [0-9]" src/ --include="*.test.ts"` — for each match, determine if the model is one of the 24 migrated models; if yes, replace with a string UUID constant. Files to spot-check:
  - `src/app/api/maintenance/__tests__/mant-items-crud.test.ts`
  - `src/app/api/vehicles/__tests__/vehicles-crud.test.ts`
  - `src/app/api/__tests__/multi-tenant-security.test.ts`
  - `src/app/api/maintenance/work-orders/__tests__/work-order-api.test.ts`
  - `src/app/api/maintenance/work-orders/__tests__/preventive-circuit.test.ts`
  - `src/app/api/maintenance/work-orders/__tests__/corrective-internal.test.ts`
  - `src/app/api/maintenance/work-orders/__tests__/e2e-flow.test.ts`
  - `src/app/api/maintenance/work-orders/[id]/__tests__/route.test.ts`
  - `src/app/api/invoices/__tests__/invoice-lifecycle.test.ts`
  - `src/app/api/inventory/__tests__/inventory-lifecycle.test.ts`
  - `src/app/api/purchase-orders/__tests__/purchase-order-lifecycle.test.ts`
  - `src/app/api/people/__tests__/people-crud.test.ts`

- [ ] 7.4 Verify: after all test file updates, run `grep -rn "id: [0-9]" src/ --include="*.test.ts"` — remaining matches must only be for models NOT in the migrated set (e.g., pure numeric sequence values in assertions unrelated to model IDs)

---

## Phase 8: Verification Gates

Run all verification steps in order. Each gate must pass before proceeding to the next.

- [ ] 8.1 Run `pnpm type-check` — must exit with code 0. Zero TypeScript errors across the entire codebase. Fix any remaining type errors surfaced before proceeding.

- [ ] 8.2 Run `pnpm db:seed` — must exit with code 0. No FK constraint violations. No TypeScript compile errors in seed files. Verify seed produces data with string UUID IDs by checking a sample record.

- [ ] 8.3 Run `pnpm test` — must exit with code 0. All Jest test suites pass with 0 failures. Fix any test failures before considering the change complete.

- [ ] 8.4 Run `pnpm build` — must exit with code 0. No build errors. Webpack/TypeScript compilation succeeds for the full Next.js production build.

- [ ] 8.5 Final grep verification — all acceptance criteria from spec.md:
  - `grep -r "parseInt(params" src/app/api/` → 0 matches
  - `grep -r "safeParseInt" src/` → 0 matches
  - `grep -r "positiveIntSchema" src/` → 0 matches
  - `grep -rn "id: number" src/app/dashboard/` → 0 matches for migrated model interfaces
  - `grep -rn "connect: { id: [0-9]" prisma/seed*.ts` → 0 matches

---

## Implementation Notes

### Execution Order

The phases must be completed in this strict order:

1. **Phase 1** (Schema) — Must be first. `prisma generate` makes the new `id: string` types available to all downstream files. Without this, TypeScript cannot verify subsequent changes.
2. **Phase 2** (Validation) — Must come before Phase 3. Route files depend on the updated `validateIdParam` and `safeParseId` signatures.
3. **Phase 5** (Zod Schemas) — Can be done in parallel with Phase 3 once Phase 1 is complete.
4. **Phase 3** (API Routes) — Depends on Phase 2. All 30+ route files updated.
5. **Phase 6** (Seed Files) — Can be done in parallel with Phases 3–4 once Phase 1 is complete.
6. **Phase 4** (TypeScript Types) — Run `pnpm type-check` after Phases 1–3 and fix all surfaced errors. The strict TypeScript config will catch everything.
7. **Phase 7** (Tests) — After types are clean, update test mocks and verify `pnpm test` passes.
8. **Phase 8** (Verification) — Final gates; must all pass.

### Key Risk Callouts

- `MantItemRequest.createdMantItemId` is NOT a Prisma relation FK — it stores a MantItem ID by value. It requires a manual type change to `String?` and a code audit for any `parseInt` on reads/writes of this field.
- `WorkOrderExpense`, `WorkOrderApproval`, `ExpenseAuditLog`, `Invoice`, `InternalWorkTicket`, `PurchaseOrder`, `MantItemPart`, `TicketLaborEntry`, `TicketPartEntry` — these models keep their cuid/uuid PKs but have FK fields pointing to Int-PK models. These FK fields MUST be changed to String in Phase 1 tasks 1.12–1.17.
- Pagination `parseInt` calls (e.g., `parseInt(limit)`) must NOT be removed — only model ID `parseInt` calls are in scope.

### Done Condition

The change is complete when all 8 phases are checked off AND Phase 8's verification gates all pass with exit code 0.
