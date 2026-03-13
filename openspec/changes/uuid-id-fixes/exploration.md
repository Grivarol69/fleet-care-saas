## Exploration: uuid-id-fixes

### Current State

The project completed a schema migration (`schema-id-normalization`) that converted all 24+ Prisma model IDs from `Int` to `String` (UUID). The database and Prisma schema are correct — UUIDs are stored as `String` fields. The problem is that many UI components and API route files were written when IDs were integers and were never updated after the migration.

The most common anti-pattern is `parseInt(uuid)` which silently produces `NaN` at runtime. JavaScript coerces UUID strings to `NaN` when passed to `parseInt()`, meaning form submissions send `NaN` values to the API, query filters return no results, and TypeScript interfaces typed as `number` cause mismatches with the actual string data from the API.

A second anti-pattern is numeric comparison guards in API routes: `vehicleBrandId <= 0` evaluates to `false` for any UUID string (JS coerces strings in numeric comparisons), so these guards never reject invalid input — they are simply dead code with UUIDs.

**Architecture note on `getTenantPrisma`:** `src/lib/tenant-prisma.ts` implements a Prisma extension that auto-injects `tenantId` into all `create` and filters all `findMany/findFirst/etc` operations. TypeScript may report "tenantId is required but not provided" in `.create()` calls when using `tenantPrisma` — these are FALSE POSITIVES because the extension handles injection at runtime. These must NOT be treated as bugs in this change.

### Affected Areas

**Alerts module (entire module broken — 5 files):**
- `src/lib/hooks/useMaintenanceAlerts.ts` — Interface `MaintenanceAlert` has `id: number`, `programItemId: number`, `vehicleId: number`, `workOrder: { id: number }`. Also `AlertFilters.vehicleId: number`. All mutations using alertId as number type fail because actual IDs from API are UUID strings.
- `src/app/dashboard/maintenance/alerts/page.tsx` — `selectedAlertIds: number[]` state; checkbox selection and filtering break because alert IDs are strings.
- `src/app/dashboard/maintenance/alerts/components/CreateWorkOrderModal.tsx` — Props `selectedAlertIds: number[]`; line ~129-132 `parseInt(technicianId)` and `parseInt(providerId)` in submit payload → sends NaN to API.
- `src/app/dashboard/maintenance/alerts/components/AlertsTable.tsx` — Props `selectedAlertIds: number[]`, `handleToggleAlert(alertId: number)` → type mismatch with actual string IDs.
- `src/app/dashboard/maintenance/alerts/components/ImprovedAlertsTable.tsx` — Same props pattern as AlertsTable.

**Work Orders module (2 files):**
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx` — Lines ~317,322: `parseInt(values.mantItemId)` and `parseInt(values.providerId)` in submit → NaN values sent to API, items never created.
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PartsTab.tsx` — `workOrderItemId: number`, `Set<number>`, `Map<number>` with UUID string keys → item selection never works; `parseInt(selectedProviderId)` → PO generated with `providerId: NaN`.

**Facturacion module (1 file, 2 locations):**
- `src/app/dashboard/invoices/new/page.tsx` — Lines ~539-541: `parseInt(supplierId)` and `parseInt(workOrderId)` in submit payload → invoices never created (NaN sent). Lines ~57,99: Interfaces `workOrderItemId?: number` must be `string`.

**Inventario module (1 file):**
- `src/app/dashboard/inventory/purchases/new/page.tsx` — Line ~174: `parseInt(supplierId)` in submit → Zod rejects with 422 (expected string/number, gets NaN).

**Mantenimiento — Asignar Programa (2 files):**
- `src/app/dashboard/maintenance/vehicle-programs/components/FormAssignProgram/FormAssignProgramImproved.tsx` — Line ~402: `onValueChange={value => field.onChange(parseInt(value))}` on templateId Select → UUID → NaN; dropdown loses selection, payload is broken. Schema already has `z.string()` so parseInt is wrong.
- `src/app/dashboard/maintenance/vehicle-programs/components/FormAssignProgram/FormAssignProgram.tsx` — Lines ~245,288: `vehicle.id.toString()` / `template.id.toString()` — redundant since UUIDs are already strings; low risk but noisy.

**Mantenimiento — APIs (2 files):**
- `src/app/api/maintenance/mant-template/route.ts` — Lines ~95-107: `vehicleBrandId <= 0` and `vehicleLineId <= 0` validation guards — dead code with UUIDs (`"uuid-string" <= 0` is always false in JS); invalid string IDs pass through unchecked.
- `src/app/api/maintenance/mant-items/route.ts` — Line ~87: Same `categoryId <= 0` dead guard pattern.

**Knowledge Base API (1 file):**
- `src/app/api/maintenance/vehicle-parts/route.ts` — Lines ~26-28: `parseInt(mantItemId)`, `parseInt(vehicleBrandId)`, `parseInt(vehicleLineId)` in GET query filters → UUID strings become NaN → Prisma receives NaN as filter value → KB always returns empty results.

### Approaches

1. **Fix files individually (surgical patch)**
   - For each affected file: replace `parseInt(id)` with `id` directly, change `number` type annotations to `string`, fix numeric comparison guards to string guards.
   - Pros: Minimal scope, easy to review, no new infrastructure, zero risk of breaking working code, fast to apply.
   - Cons: Does not prevent future regressions; a developer could reintroduce `parseInt` for a new UUID field.
   - Effort: Low-Medium (17 critical locations across ~10 files)

2. **Add custom ESLint rule to prevent regression**
   - Implement a no-parse-int-on-id-fields ESLint rule or use a lint plugin to flag `parseInt` calls where the argument is named like an ID field (ending in `Id`, `Id[]`, etc.).
   - Pros: Automated regression prevention, enforced at PR time.
   - Cons: Custom ESLint rules require maintenance; false positives possible; may not catch all patterns (e.g., variable named differently).
   - Effort: Medium (rule authoring + config)

3. **TypeScript branded/opaque ID type**
   - Define `type EntityId = string & { __brand: 'EntityId' }` and use it across all models. This makes assigning a `number` or using `parseInt` on an `EntityId` a compile-time error.
   - Pros: Compile-time guarantee, self-documenting.
   - Cons: High refactor cost — would touch all 46 models and every place IDs are used. Risk of breaking code that currently works. Scope is 2-3x larger than just fixing the bugs.
   - Effort: High (cross-cutting refactor)

### Recommendation

**Apply Approach 1 (surgical file fixes) combined with a lightweight version of Approach 2.**

Fix all 17 critical locations directly. For regression prevention, add a comment/convention in `CLAUDE.md` prohibiting `parseInt` on ID fields, and optionally add a grep-based pre-commit check rather than a full ESLint rule. This gives regression protection with zero infrastructure cost.

Priority order for fixes:
1. **vehicle-parts API** — KB entirely broken for all tenants (GET returns empty always)
2. **Alerts module (5 files)** — Entire module non-functional (selection, WO creation, mutations all fail)
3. **Work Orders AddItemDialog + PartsTab** — Core WO workflow broken
4. **Invoice new page** — Invoice creation broken
5. **Inventory purchase new page** — Purchase creation broken
6. **FormAssignProgramImproved** — Template assignment broken
7. **API validation guards** — Silent dead code (lower urgency, no data corruption)

### Risks

- **getTenantPrisma false positives:** TypeScript may report `tenantId` as missing in `.create()` calls when using `tenantPrisma`. These are NOT bugs — the Prisma extension injects `tenantId` at runtime. Do not add `tenantId` to create calls as a fix; it would be redundant and potentially conflict with the extension logic.
- **parseInt in non-ID contexts:** The fix must be scoped to ID fields only. Legitimate `parseInt` calls for numeric user input (mileage, quantities, prices) must not be removed.
- **Set<number>/Map<number> replacements:** When changing collection types from `Set<number>` to `Set<string>`, verify all operations (`.has()`, `.add()`, `.delete()`) still work correctly — they will, since the collection type follows the element type.
- **API validation guard replacement:** Changing `vehicleBrandId <= 0` to a string guard must preserve the intent — reject empty/missing IDs — without over-restricting valid UUIDs. Recommended: `!vehicleBrandId || typeof vehicleBrandId !== 'string' || vehicleBrandId.trim() === ''`.
- **FormAssignProgram.tsx `id.toString()`:** These are safe to remove (UUIDs are already strings) but if left in they cause no harm — removing them is cosmetic cleanup only.

### Ready for Proposal

Yes. The exploration is complete. The audit findings have been spot-checked across 4 key files and all confirmed accurate. The change is well-scoped: fix parseInt anti-patterns and number type annotations in ~10 files, across 17 critical locations. No schema changes, no new dependencies, no architectural changes required. Ready for `/sdd:ff uuid-id-fixes` to produce proposal, spec, design, and tasks.
