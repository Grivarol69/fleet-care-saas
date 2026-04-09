# Proposal: UUID ID Fixes — Remove parseInt Anti-Patterns

## Intent

The project completed a schema migration (`schema-id-normalization`) that converted all Prisma model IDs from `Int` to `String` (UUID). The database and Prisma schema are correct. However, many UI components and API routes were never updated and still treat IDs as integers.

The primary failure mode is `parseInt(uuid)` which silently produces `NaN` in JavaScript. Form submissions send `NaN` to the API, query filters return no results, and TypeScript interfaces typed as `number` cause type mismatches with the actual string data returned by the API. The result is 6 broken modules with 17 critical failure points, including an entire module (Alertas) that is non-functional.

## Scope

### In Scope

- Remove all `parseInt()` calls applied to UUID ID fields (17 critical locations across ~10 files)
- Change TypeScript type annotations from `number` to `string` for ID fields (interfaces, state, props, Zod schemas)
- Fix `Set<number>` and `Map<number>` collections keyed by UUID IDs to use `string`
- Replace dead numeric comparison guards (`id <= 0`) with proper string validation guards in API routes
- Remove redundant `.toString()` calls on IDs that are already strings (cosmetic)

### Out of Scope

- TypeScript errors about `tenantId` missing in `.create()` calls — `getTenantPrisma()` auto-injects `tenantId` at runtime; these TS2322 errors are false positives
- Siigo integration fixes
- Branded/opaque ID types (`type EntityId = string & { __brand: 'EntityId' }`)
- Custom ESLint rule implementation
- Any new features or behavioral changes
- Schema changes

## Approach

Surgical file-by-file patch. For each affected file:
1. Remove `parseInt(someId)` → use `someId` directly
2. Change `number` type annotations to `string` for ID fields
3. Fix `Set<number>` / `Map<number>` → `Set<string>` / `Map<string>` where keyed by entity IDs
4. Replace `id <= 0` API guards → `!id || typeof id !== 'string' || id.trim() === ''`

No new dependencies, no schema changes, no architectural changes. The fix is mechanical and reversible.

For regression prevention: add a note to `CLAUDE.md` prohibiting `parseInt` on ID fields.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/hooks/useMaintenanceAlerts.ts` | Modified | Interface IDs: `id`, `programItemId`, `vehicleId`, `workOrder.id`, `AlertFilters.vehicleId` — all `number` → `string` |
| `src/app/dashboard/maintenance/alerts/page.tsx` | Modified | `selectedAlertIds: number[]` state → `string[]` |
| `src/app/dashboard/maintenance/alerts/components/CreateWorkOrderModal.tsx` | Modified | Props `selectedAlertIds: number[]` → `string[]`; remove `parseInt(technicianId)` and `parseInt(providerId)` |
| `src/app/dashboard/maintenance/alerts/components/AlertsTable.tsx` | Modified | Props `selectedAlertIds: number[]`, `handleToggleAlert(alertId: number)` → `string` |
| `src/app/dashboard/maintenance/alerts/components/ImprovedAlertsTable.tsx` | Modified | Same props pattern as AlertsTable → `string` |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx` | Modified | Remove `parseInt(values.mantItemId)` and `parseInt(values.providerId)` |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PartsTab.tsx` | Modified | `workOrderItemId: number` → `string`; `Set<number>` → `Set<string>`; `Map<number>` → `Map<string>`; remove `parseInt(selectedProviderId)` |
| `src/app/dashboard/invoices/new/page.tsx` | Modified | Remove `parseInt(supplierId)` and `parseInt(workOrderId)`; `workOrderItemId?: number` → `string` in interfaces |
| `src/app/dashboard/inventory/purchases/new/page.tsx` | Modified | Remove `parseInt(supplierId)` |
| `src/app/dashboard/maintenance/vehicle-programs/components/FormAssignProgram/FormAssignProgramImproved.tsx` | Modified | Remove `parseInt(value)` in `onValueChange` for templateId Select |
| `src/app/dashboard/maintenance/vehicle-programs/components/FormAssignProgram/FormAssignProgram.tsx` | Modified | Remove redundant `vehicle.id.toString()` / `template.id.toString()` (already strings) |
| `src/app/api/maintenance/vehicle-parts/route.ts` | Modified | Remove `parseInt(mantItemId)`, `parseInt(vehicleBrandId)`, `parseInt(vehicleLineId)` from GET query filters |
| `src/app/api/maintenance/mant-template/route.ts` | Modified | Replace `vehicleBrandId <= 0` and `vehicleLineId <= 0` dead guards with string validation |
| `src/app/api/maintenance/mant-items/route.ts` | Modified | Replace `categoryId <= 0` dead guard with string validation |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Removing `parseInt` in a non-ID context (e.g., mileage, quantity) | Low | Review each call site: only remove `parseInt` where argument name ends in `Id` or is an entity identifier |
| `getTenantPrisma` TS2322 false positives misidentified as bugs | Low | Documented in exploration as out-of-scope; treat any `tenantId` TS error as pre-existing noise |
| Set/Map type changes break collection operations | Low | JS Set/Map operations are type-agnostic at runtime; only type annotations change |
| String validation guard over-restricts valid UUIDs | Low | Use `!id || id.trim() === ''` — rejects only falsy/empty values, not valid UUID strings |
| FormAssignProgram.tsx cleanup breaks something | Low | The `id.toString()` removal is cosmetic; strings already satisfy the type; if uncertain, skip it |

## Rollback Plan

All changes are contained in ~10 files with no schema or database changes. Rollback options:

1. **Git revert**: `git revert HEAD` if committed as a single commit, or `git checkout <commit> -- <file>` per file
2. **Selective revert**: Each file is independently patchable; revert individual files without affecting others
3. No migrations to roll back, no data changes, no external service changes

## Dependencies

- Requires the `schema-id-normalization` migration to already be applied (it is — confirmed in exploration)
- No new packages or external dependencies

## Success Criteria

- [ ] All 17 critical `parseInt(uuid)` call sites are removed
- [ ] Knowledge Base API (`vehicle-parts/route.ts`) returns results for valid queries
- [ ] Alerts module: alert selection works, CreateWorkOrderModal submits without NaN values
- [ ] Work Order AddItemDialog creates items successfully
- [ ] PartsTab purchase order generation sends a valid `providerId`
- [ ] Invoice creation from `/dashboard/invoices/new` succeeds
- [ ] Inventory purchase creation from `/dashboard/inventory/purchases/new` succeeds
- [ ] Template assignment in FormAssignProgramImproved retains selected value
- [ ] No `parseInt` calls remain on ID fields anywhere in the codebase (verified with `grep -r "parseInt" src/ | grep -i "Id"`)
- [ ] `pnpm type-check` passes (excluding pre-existing `tenantId` false positives from `getTenantPrisma`)
