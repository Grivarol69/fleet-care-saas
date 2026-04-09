# Tasks: UUID ID Fixes — Remove parseInt Anti-Patterns

**Change**: uuid-id-fixes
**Total files affected**: 12
**Total tasks**: 23

---

## Phase 1: API Route Fixes (Server-Side, Lowest Risk)

These 3 files are server-side only. Fixing them first verifies the backend is correct before touching UI.

- [ ] 1.1 **`src/app/api/maintenance/vehicle-parts/route.ts`** — Remove `parseInt()` from GET query filter assignments.
  - Find the block (~line 26-28) where `mantItemId`, `vehicleBrandId`, and `vehicleLineId` are assigned to the `where` object.
  - Replace:
    ```ts
    if (mantItemId) where.mantItemId = parseInt(mantItemId);
    if (vehicleBrandId) where.vehicleBrandId = parseInt(vehicleBrandId);
    if (vehicleLineId) where.vehicleLineId = parseInt(vehicleLineId);
    ```
  - With:
    ```ts
    if (mantItemId) where.mantItemId = mantItemId;
    if (vehicleBrandId) where.vehicleBrandId = vehicleBrandId;
    if (vehicleLineId) where.vehicleLineId = vehicleLineId;
    ```
  - Verify: no other `parseInt` calls remain in this file.

- [ ] 1.2 **`src/app/api/maintenance/mant-template/route.ts`** — Replace dead numeric guards with string guards for `vehicleBrandId` and `vehicleLineId`.
  - Find the validation block (~lines 95-107) containing `vehicleBrandId <= 0` and `vehicleLineId <= 0`.
  - Replace:
    ```ts
    if (!vehicleBrandId || vehicleBrandId <= 0) { ... }
    if (!vehicleLineId || vehicleLineId <= 0) { ... }
    ```
  - With:
    ```ts
    if (!vehicleBrandId || vehicleBrandId.trim() === '') { ... }
    if (!vehicleLineId || vehicleLineId.trim() === '') { ... }
    ```
  - Keep the same error response body and HTTP status code — only replace the condition expression.

- [ ] 1.3 **`src/app/api/maintenance/mant-items/route.ts`** — Replace dead numeric guard with string guard for `categoryId`.
  - Find the validation check (~line 87) containing `categoryId <= 0`.
  - Replace:
    ```ts
    if (!categoryId || categoryId <= 0) { ... }
    ```
  - With:
    ```ts
    if (!categoryId || categoryId.trim() === '') { ... }
    ```
  - Keep the same error response body and HTTP status code — only replace the condition expression.

---

## Phase 2: Type-Only Annotation Changes (No Runtime Behavior Change)

These changes are purely TypeScript type fixes. They enable Phase 3 fixes to type-check correctly and prevent regressions in prop passing.

- [ ] 2.1 **`src/lib/hooks/useMaintenanceAlerts.ts`** — Fix all `number` ID types to `string` in interfaces and hook signatures.
  - In `MaintenanceAlert` interface: change `id: number` → `string`, `programItemId: number` → `string`, `vehicleId: number` → `string`, `workOrder: { id: number; ... }` → `{ id: string; ... }`.
  - In `AlertFilters` interface: change `vehicleId?: number` → `string`.
  - In `useVehicleAlerts(vehicleId: number)` signature: change parameter to `string`.
  - In `useUpdateAlertStatus` mutation params: change `alertId: number` → `string`.
  - In `useAcknowledgeAlert` mutation params: change `alertId: number` → `string`.
  - In `useSnoozeAlert` mutation params: change `alertId: number` → `string`.
  - In `useCancelAlert` mutation params: change `alertId: number` → `string`.
  - In `useAlertsGroupedByVehicle` reduce accumulator (~line 213): change `Record<number, {...}>` → `Record<string, {...}>`.
  - In `useAlertsGroupedByPackage(vehicleId?: number)` signature: change parameter to `string | undefined`.

- [ ] 2.2 **`src/app/dashboard/maintenance/alerts/page.tsx`** — Change `selectedAlertIds` state type from `number[]` to `string[]`.
  - Find `useState<number[]>` (or type annotation) for `selectedAlertIds` (~line 23).
  - Change to `useState<string[]>`.
  - No logic changes — the state holds the same values; only the declared type changes.

- [ ] 2.3 **`src/app/dashboard/maintenance/alerts/components/AlertsTable.tsx`** — Fix Props interface and `handleToggleAlert` signature to use `string`.
  - In the Props interface: change `selectedAlertIds: number[]` → `string[]` and `onSelectionChange: (ids: number[]) => void` → `(ids: string[]) => void`.
  - In the internal `handleToggleAlert` function: change parameter type `alertId: number` → `string`.
  - No logic changes — string equality (`===`) works the same as numeric equality for Set/array operations.

- [ ] 2.4 **`src/app/dashboard/maintenance/alerts/components/ImprovedAlertsTable.tsx`** — Apply the same Props and handler type fixes as AlertsTable (task 2.3).
  - In the Props interface: change `selectedAlertIds: number[]` → `string[]` and `onSelectionChange: (ids: number[]) => void` → `(ids: string[]) => void`.
  - In the internal `handleToggleAlert` function: change parameter type `alertId: number` → `string`.

- [ ] 2.5 **`src/app/dashboard/invoices/new/page.tsx`** — Fix `workOrderItemId` type in the two interfaces that declare it as `number`.
  - In the `InvoiceItem` interface (~line 57): change `workOrderItemId?: number` → `string`.
  - In the `PendingPO` interface or its nested items type (~line 99): change `workOrderItemId: number` (or `workOrderItemId?: number`) → `string`.
  - No logic changes in this task — the parseInt removals are in Phase 3.

- [ ] 2.6 **`src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PartsTab.tsx`** — Fix collection and function signature types.
  - In the `PartItem` type (~line 47): change `workOrderItemId: number` → `string`.
  - In the `selectedItems` state (~line 107): change `useState<Set<number>>` → `useState<Set<string>>`.
  - In the `itemOrigins` state (~line 108): change `useState<Map<number, ItemOrigin>>` → `useState<Map<string, ItemOrigin>>`.
  - In the `initialOrigins` local variable (~line 130): change the `Map<number, ItemOrigin>` type annotation → `Map<string, ItemOrigin>`.
  - In the `toggleItemSelection` function (~line 204): change parameter `itemId: number` → `string`.
  - In the `setItemOrigin` function (~line 225): change parameter `itemId: number` → `string`.
  - Do NOT change the `parseInt(selectedProviderId)` call yet — that is Phase 3 (task 3.3).

---

## Phase 3: Behavioral Logic Fixes (Remove parseInt Calls)

These are the actual runtime bug fixes. Each removes a `parseInt()` applied to a UUID ID field.

- [ ] 3.1 **`src/app/dashboard/maintenance/vehicle-programs/components/FormAssignProgram/FormAssignProgramImproved.tsx`** — Remove `parseInt` from the templateId Select handler.
  - Find the `<Select>` for templateId (~line 402): `onValueChange={value => field.onChange(parseInt(value))}`.
  - Replace with: `onValueChange={value => field.onChange(value)}`.
  - Also fix the `value` prop on the same Select (~line 403): replace `value={field.value ? field.value.toString() : ''}` with `value={field.value ?? ''}`.
  - IMPORTANT: Do NOT change `parseInt(e.target.value) || 0` if present on a kilometer/mileage input field — that `parseInt` is correct for numeric input parsing.

- [ ] 3.2 **`src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx`** — Remove `parseInt` from the submit payload for `mantItemId` and `providerId`.
  - Find the submit handler (~line 317): `parseInt(values.mantItemId)` — replace with `values.mantItemId`.
  - Find (~line 322): `parseInt(values.providerId)` — replace with `values.providerId`.
  - Verify no other `parseInt` calls on ID fields remain in this file.

- [ ] 3.3 **`src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PartsTab.tsx`** — Remove `parseInt` from `selectedProviderId` in PO generation.
  - Find the PO generation handler (~line 294): `parseInt(selectedProviderId)` — replace with `selectedProviderId`.
  - Verify the type changes from Phase 2 (task 2.6) are already in place before running type-check.

- [ ] 3.4 **`src/app/dashboard/invoices/new/page.tsx`** — Remove `parseInt` from `supplierId` and `workOrderId` in the form submit payload.
  - Find the submit handler (~line 539): `parseInt(supplierId)` — replace with `supplierId`.
  - Find (~line 541): `parseInt(workOrderId)` — replace with `workOrderId`.
  - Verify the `workOrderItemId` interface types from Phase 2 (task 2.5) are already in place.

- [ ] 3.5 **`src/app/dashboard/inventory/purchases/new/page.tsx`** — Remove `parseInt` from `supplierId` in the submit payload.
  - Find the submit handler (~line 174): `parseInt(supplierId)` — replace with `supplierId`.
  - Verify no other `parseInt` calls on ID fields remain in this file.

- [ ] 3.6 **`src/app/dashboard/maintenance/alerts/components/CreateWorkOrderModal.tsx`** — Remove `parseInt` from `technicianId` and `providerId` in the WO creation payload.
  - Find the payload construction: `parseInt(technicianId)` — replace with `technicianId` (keep the `technicianId && technicianId !== 'NONE' ? ... : null` conditional guard).
  - Find: `parseInt(providerId)` — replace with `providerId` (keep the `providerId && providerId !== 'NONE' ? ... : null` conditional guard).
  - Also update this component's Props interface: change `selectedAlertIds: number[]` → `string[]` to match the updated page.tsx state type.

---

## Phase 4: Verification

- [ ] 4.1 **Type-check — Phase 1 files** — Run `pnpm type-check` after completing Phase 1 tasks (1.1, 1.2, 1.3). Expect zero new TypeScript errors in the 3 API route files. Pre-existing `tenantId` TS2322 errors from `getTenantPrisma` are noise — do NOT attempt to fix those.

- [ ] 4.2 **Type-check — Phase 2+3 files** — Run `pnpm type-check` after completing all Phase 2 and Phase 3 tasks. Expect zero new errors in the 9 UI files changed. If errors appear in files NOT in scope (e.g., a consumer of `AlertsTable` not in the task list), fix only the type annotation in that consumer file — do not add `parseInt` back.

- [ ] 4.3 **Smoke test: Knowledge Base filter** — Open `/dashboard/maintenance/vehicle-parts`. Select a brand, line, and maintenance item from the filter dropdowns. Verify that matching records are returned (the list is no longer empty). Check the Network tab to confirm the request URL includes UUID query params (not `NaN`).

- [ ] 4.4 **Smoke test: Template assignment** — Open `/dashboard/maintenance/vehicle-programs`. Assign a maintenance template to a vehicle using FormAssignProgramImproved. After selecting a template from the dropdown, verify the field stays selected (value does not clear to empty or NaN). Submit the form and confirm the vehicle program is created.

- [ ] 4.5 **Smoke test: Work order AddItemDialog** — Open an existing Work Order detail view. Click "Add Item". Select a maintenance item and a provider from the respective dropdowns. Submit the dialog. Verify the item appears in the work order items list. Check the Network tab: the POST payload must contain `mantItemId` and `providerId` as UUID strings, not `NaN`.

- [ ] 4.6 **Smoke test: PartsTab PO generation** — Open a Work Order detail view that has parts items. Navigate to the Parts tab. Select one or more parts items using checkboxes. Choose a provider from the provider selector. Click "Generate Purchase Order". Verify a PO is created. Check the Network tab: `providerId` must be a UUID string.

- [ ] 4.7 **Smoke test: Invoice creation linked to Work Order** — Navigate to `/dashboard/invoices/new?workOrderId=<a-valid-uuid>`. Fill in the required fields. Submit. Verify the invoice is created. Check the Network tab: `supplierId` and `workOrderId` in the payload must be UUID strings, not `NaN`.

- [ ] 4.8 **Smoke test: Inventory purchase creation** — Navigate to `/dashboard/inventory/purchases/new`. Select a supplier from the dropdown. Fill remaining fields. Submit. Check the Network tab: `supplierId` in the payload must be a UUID string, not `NaN`.

- [ ] 4.9 **Smoke test: Alerts module — selection + CreateWorkOrderModal** — Open `/dashboard/maintenance/alerts`. Select one or more alerts using checkboxes. Verify the selection counter or "Create Work Order" button activates. Open the CreateWorkOrderModal (if available). Select a technician and provider. Submit. Verify the WO is created. Check the Network tab: no `NaN` values in the payload.

- [ ] 4.10 **Grep verification** — Run the following command and confirm zero matches:
  ```bash
  grep -r "parseInt" src/ | grep -i "Id" | grep -v "node_modules"
  ```
  Any remaining match that wraps an ID field is a bug. Matches on non-ID numeric inputs (e.g., mileage, quantity, year) are acceptable and expected.

---

## Summary Table

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | 3 | API route fixes — server-side, lowest risk |
| Phase 2 | 6 | Type-only annotation changes — no runtime behavior change |
| Phase 3 | 6 | Behavioral logic — remove parseInt calls from form/submit handlers |
| Phase 4 | 10 | Verification — type-check + manual smoke tests per module |
| **Total** | **25** | |

## Implementation Order Note

Phases MUST be executed in order. Phase 2 type changes enable Phase 3 to type-check correctly (e.g., `toggleItemSelection` signature must change before the `parseInt` removal in PartsTab compiles cleanly). Phase 4 verifies the complete result. Do not start Phase 3 until Phase 2 is complete and `pnpm type-check` passes for Phase 2 files.

## Out of Scope (Do Not Touch)

- `tenantId` TS2322 errors from `getTenantPrisma` — false positives, pre-existing noise
- `parseInt(e.target.value)` on kilometer/mileage HTML inputs — correct usage
- `id.toString()` calls in `FormAssignProgram.tsx` (lines 245, 288) — harmless redundancy, excluded by design decision
- `tech.id.toString()` and `provider.id.toString()` in `CreateWorkOrderModal.tsx` — harmless redundancy, optional cleanup only
- `String(v.vehicleId)` cast in `alerts/page.tsx` — becomes redundant after hook fix but harmless if left
