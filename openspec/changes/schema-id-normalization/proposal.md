# Proposal: Schema ID Normalization (Int → UUID)

## Intent

24 Prisma models currently use `Int @id @default(autoincrement())` as their primary key. This creates several concrete problems:

1. **Sequential ID leakage**: Auto-increment integers expose internal row counts to API consumers and URLs (e.g., `/work-orders/42` reveals you have at least 42 work orders — an information leak in a B2B SaaS context).
2. **API validation debt**: `src/lib/validation.ts` exports `safeParseInt`, `parseIdParam`, `validateIdParam`, and `positiveIntSchema` — 4 utilities that exist solely to parse integer IDs from URL params. These propagate into 28 API route files as `parseInt(params.id, 10)` calls, creating a class of subtle bugs (NaN handling, off-by-one after type coercion).
3. **Future-proofing**: If the project ever shards databases, merges tenants, or integrates with external systems, integer IDs create merge conflicts. UUID/CUID IDs are globally unique by construction.
4. **Inconsistency**: 22 models already use UUID/CUID (Tenant, User, Invoice, WorkOrderExpense, MasterPart, etc.). Mixing Int and String IDs in the same codebase means every join and FK reference has to mentally track which type applies — cognitive overhead that compounds with each new developer.

The project is pre-production with no live tenant data that would be at risk. This is the correct moment to complete the normalization.

## Scope

### In Scope

- Migrate the 24 remaining `Int @id @default(autoincrement())` models to `String @id @default(uuid())`:
  - **Vehicles cluster**: VehicleBrand, VehicleLine, VehicleType, Vehicle, VehicleDriver, OdometerLog
  - **Maintenance cluster**: MantCategory, MantItem, MantItemRequest, MantItemVehiclePart, MaintenanceTemplate, MaintenancePackage, PackageItem, VehicleMantProgram, VehicleProgramPackage, VehicleProgramItem
  - **Work Orders cluster**: WorkOrder, WorkOrderItem
  - **Alerts cluster**: MaintenanceAlert, FinancialAlert
  - **People cluster**: Technician, Provider, Driver
  - **Config cluster**: DocumentTypeConfig
- Update all ~55 FK fields that reference the above Int PKs to `String`
- Replace `src/lib/validation.ts` integer-parsing utilities with UUID-compatible equivalents
- Update all 28 API route files that call `parseInt(params.id, 10)` to use string IDs directly
- Update all TypeScript type files where `id: number` references these models (37 files estimated)
- Update 4+ test files with hardcoded numeric ID assumptions
- Run `prisma migrate reset` to apply the schema change cleanly (pre-production: no data to preserve)
- Update seed files to use string IDs

### Out of Scope

- The 22 models already on UUID/CUID — untouched (Tenant, User, Subscription, Payment, WorkOrderExpense, WorkOrderApproval, ExpenseAuditLog, MasterPart, MantItemPart, Invoice, InvoiceItem, PartPriceHistory, InvoicePayment, PurchaseOrder, PurchaseOrderItem, PartCompatibility, InventoryItem, InventoryMovement, InternalWorkTicket, TicketLaborEntry, TicketPartEntry, Document)
- Changing CUID models to UUID or vice versa — format consistency within the existing UUID set is not required
- Adding `tenantId` to child models — that is tracked under the separate `schema-tenant-isolation` change
- Subdomain routing, billing, or any feature work
- Production deployment — this change applies only to development and staging environments

## Approach

**Option A — Big Bang (single migration reset)** is the chosen approach, given:
- The project is pre-production with no live customer data
- `prisma migrate reset` is a safe, supported operation in this context
- A phased column-by-column migration would require complex multi-step backfills across 24 models and 55 FKs, with no data preservation benefit

**Execution sequence:**

1. **Schema update** (`prisma/schema.prisma`): Change all 24 models from `Int @id @default(autoincrement())` to `String @id @default(uuid())`. Update all FK fields from `Int` to `String` across relations. Update `MantItemRequest.createdMantItemId` from `Int?` to `String?` (stores a MantItem ID by value, not a formal FK — must be treated manually).

2. **Migration reset**: Run `pnpm prisma migrate reset` — drops and recreates the schema. Confirm Prisma client generation succeeds.

3. **validation.ts replacement**: Remove `safeParseInt`, `parseIdParam`, `validateIdParam`, `positiveIntSchema`. Add a `parseUuidParam(id: string): string` utility that validates UUID format and throws a typed error on invalid input. This breaks 11 routes that import these utilities — all 11 must be updated.

4. **API route sweep**: Replace all `parseInt(params.id, 10)` calls across 28 route files with direct string usage (or the new `parseUuidParam`). Remove `Number(id)` / `+id` coercions in where-clause comparisons.

5. **TypeScript type sweep**: Replace `id: number` → `id: string` in the 37 affected type files. Fix any downstream TS errors surfaced by `pnpm type-check`.

6. **Test file updates**: Replace hardcoded numeric IDs (e.g., `id: 1`, `vehicleId: 2`) with UUID strings in the 4+ affected test files.

7. **Seed file updates**: Update `prisma/seed.ts`, `prisma/seed-multitenancy.ts`, `prisma/seed-staging-demo.ts`, `prisma/seed-financial-demo.ts` — replace integer ID literals and `autoincrement()` assumptions with string UUID references.

8. **Build verification**: `pnpm type-check` → `pnpm build` → `pnpm test`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | 24 model PKs changed; ~55 FK fields changed from Int to String |
| `src/lib/validation.ts` | Modified | Remove integer utilities; add `parseUuidParam` |
| `src/app/api/vehicles/` | Modified | All route files: remove parseInt, use string IDs |
| `src/app/api/maintenance/` | Modified | All route files: remove parseInt, use string IDs |
| `src/app/api/maintenance/work-orders/` | Modified | parseInt removal; WorkOrderItem FK type change |
| `src/app/api/maintenance/alerts/` | Modified | MaintenanceAlert + FinancialAlert FK changes |
| `src/app/api/people/` | Modified | Technician, Provider, Driver — parseInt removal |
| `src/app/api/invoices/` | Modified | WorkOrderItem.workOrderId FK type change (indirect) |
| `src/app/api/purchase-orders/` | Modified | WorkOrder FK string change |
| `src/app/api/inventory/` | Modified | MantItem, Provider FK changes |
| `src/app/api/internal-tickets/` | Modified | Technician, InventoryItem FK type changes |
| `src/app/api/dashboard/` | Modified | WorkOrder, Vehicle FK queries — parseInt removal |
| TypeScript type files (37 files) | Modified | `id: number` → `id: string` for 24 affected models |
| Test files (4+ files) | Modified | Hardcoded numeric IDs replaced with UUID strings |
| `prisma/seed*.ts` (4 files) | Modified | Integer ID literals updated to string UUID values |
| `src/app/dashboard/` UI components | Modified | Any component passing numeric IDs to routes/APIs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing an FK field causes Prisma schema validation failure at `prisma generate` | Med | Run `pnpm prisma:generate` after schema edits and fix all reported errors before proceeding. Schema validation is exhaustive — any missed field is caught here. |
| `validation.ts` removal breaks 11 importing route files with TypeScript errors | High | Enumerate all 11 importers with grep before editing. Update all in the same commit as the validation.ts change. `pnpm type-check` will surface any missed. |
| `MantItemRequest.createdMantItemId` is an `Int?` that stores a MantItem ID by value (non-FK) | Med | Change to `String?` in schema. Search codebase for all read/write usages of this field and ensure no parseInt coercion remains. |
| Test files with hardcoded numeric IDs fail TypeScript strict mode after type change | Med | Grep for `id: [0-9]` in test files. Replace with `id: 'test-uuid-1'` style strings. |
| MaintenanceAlert and FinancialAlert both have `workOrderId Int?` FK — WorkOrder is in a different cluster | Low | Both FKs become `String?`. Because WorkOrder PK is in scope, this is covered by the standard FK sweep. Mark explicitly in spec to avoid oversight. |
| Seed files reference integer IDs in relational creates (e.g., `vehicleId: 1`) | High | All seed files must be updated. `pnpm db:seed` will fail immediately if any integer FK is passed to a String column. Treat seed verification as a mandatory step. |
| UI components pass numeric IDs (from state or URL params) to API calls | Low | After API route sweep, run `pnpm type-check` from the root — Prisma-generated types will flag any component passing `number` where `string` is expected. |
| `prisma migrate reset` destroys all local development data | Low | Expected and acceptable — project is pre-production. Confirm with developer before running in any shared environment. |

## Rollback Plan

Because this change uses `prisma migrate reset` rather than a forward-only migration, rollback is:

1. `git revert` (or `git checkout`) to the pre-change commit
2. `pnpm prisma migrate reset` — drops and recreates the schema in its original integer-ID form
3. `pnpm db:seed` — re-seeds with development data
4. `pnpm type-check && pnpm build` — confirm clean state

No production data is at risk. There is no partial-state scenario requiring a hotfix — the reset is atomic.

## Dependencies

- No external dependencies or infrastructure changes required
- `prisma migrate reset` requires developer confirmation (destructive to local DB)
- The `schema-tenant-isolation` change (tracked separately, tasks in `openspec/changes/schema-tenant-isolation/tasks.md`) should **not** be merged until this change is complete — it adds nullable `tenantId` columns to child models, and if those models still have Int PKs at the time, the FK types would conflict

## Success Criteria

- [ ] `pnpm prisma:generate` completes with zero errors after schema edits
- [ ] `pnpm prisma migrate reset` succeeds cleanly (schema recreated)
- [ ] `pnpm db:seed` completes with no type errors or FK constraint violations
- [ ] `pnpm type-check` exits with code 0 — zero TypeScript errors across the full codebase
- [ ] `pnpm build` exits with code 0 — production build succeeds
- [ ] All existing unit tests pass (`pnpm test`)
- [ ] No remaining `parseInt(params.id)` calls in any API route file (verified by grep)
- [ ] No remaining `id: number` type annotations for any of the 24 migrated models (verified by grep)
- [ ] All 24 migrated models have `String @id @default(uuid())` in `prisma/schema.prisma`
- [ ] `src/lib/validation.ts` no longer exports `safeParseInt`, `parseIdParam`, `validateIdParam`, or `positiveIntSchema`
