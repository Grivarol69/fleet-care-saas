# Verification Report: wo-price-edit-and-freeze

**Date:** 2026-03-29
**Verifier:** sdd-verify
**Change:** `wo-price-edit-and-freeze`

---

## Completeness

| Metric           | Value |
| ---------------- | ----- |
| Tasks total      | 23    |
| Tasks complete   | 17    |
| Tasks incomplete | 6     |

### Incomplete tasks (Phase 4 manual verification scenarios)

- [ ] 4.1 MANAGER + PENDING_APPROVAL WO → PATCH unitPrice → backend returns 200
- [ ] 4.2 MANAGER + APPROVED WO → PATCH unitPrice → backend returns 403
- [ ] 4.3 OWNER + IN_PROGRESS WO → PATCH unitPrice → backend returns 200
- [ ] 4.4 OWNER + APPROVED WO with DRAFT PO → Regenerar OC → old PO CANCELLED, new PO DRAFT
- [ ] 4.5 APPROVED WO → non-DRIVER user clicks inline pencil → PATCH succeeds
- [ ] 4.6 MANAGER views ComprasTab on APPROVED WO → "Regenerar OC" NOT visible

---

## Build & Tests Execution

**Build (type-check):** ✅ Passed — `tsc --noEmit` 0 errors

**Tests:** ❌ 59 failed / ✅ 163 passed / ⚠️ 56 skipped

> **IMPORTANT — Pre-existing failures (not caused by this change):**
> All 59 failures are `PrismaClientKnownRequestError P2022: The column 'axleConfig' does not exist in the current database`.
> Root cause: test DB missing migration from `serialized-assets` change (column added in schema but `db:test:push` not re-run).
> This change does NOT touch the Vehicle model and is not responsible.

```
Test Files  7 failed | 10 passed | 6 skipped (23)
      Tests  59 failed | 163 passed | 56 skipped (278)
```

**Coverage:** ➖ Not configured

---

## Spec Compliance Matrix

| Requirement                                 | Scenario                                                  | Test   | Result      |
| ------------------------------------------- | --------------------------------------------------------- | ------ | ----------- |
| WorkOrderItem Price Freeze by State         | MANAGER edits price on PENDING_APPROVAL WO (allowed)      | (none) | ❌ UNTESTED |
| WorkOrderItem Price Freeze by State         | MANAGER edits price on APPROVED WO (blocked → 403)        | (none) | ❌ UNTESTED |
| WorkOrderItem Price Freeze by State         | Frontend freeze: IN_PROGRESS → inputs disabled            | (none) | ❌ UNTESTED |
| Inline Post-Approval WO Description Editing | Any role edits WO description post-approval               | (none) | ❌ UNTESTED |
| Inline Post-Approval WO Description Editing | Description editable in COMPLETED state                   | (none) | ❌ UNTESTED |
| Inline Post-Approval WO Description Editing | Description NOT affected by item freeze                   | (none) | ❌ UNTESTED |
| OWNER Bypass of Item Price Freeze           | OWNER edits price on IN_PROGRESS WO (allowed → 200)       | (none) | ❌ UNTESTED |
| OWNER PO Regeneration                       | OWNER regenerates PO for item with existing DRAFT PO      | (none) | ❌ UNTESTED |
| OWNER PO Regeneration                       | OWNER regeneration blocked for APPROVED/SENT POs (dialog) | (none) | ❌ UNTESTED |
| OWNER PO Regeneration                       | Non-OWNER cannot access Regenerar OC                      | (none) | ❌ UNTESTED |
| Tab Compras & Costos — OWNER Actions        | OWNER sees Regenerar OC per item                          | (none) | ❌ UNTESTED |

**Compliance summary:** 0/11 scenarios have automated test coverage.

> **Note:** All scenarios lack automated tests. This is expected — the change introduces new backend guards and frontend components that are not yet covered by the existing vitest suite. The scenarios are verifiable manually (Phase 4 tasks) or via e2e tests.

---

## Correctness (Static — Structural Evidence)

| Requirement                                                      | Status         | Notes                                                                                          |
| ---------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `canOverrideWorkOrderFreeze()` in permissions.ts                 | ✅ Implemented | Line 367 — `isSuperAdmin(user) \|\| isOwner(user)` in WORK ORDER LIFECYCLE PERMISSIONS section |
| Freeze guard in PATCH /items/[itemId]                            | ✅ Implemented | Lines 89-102: `FROZEN_WO_STATUSES` set, `isModifyingPrice` check, 403 response                 |
| `description` in Zod schema [itemId]                             | ✅ Implemented | Line 20: `description: z.string().optional()`                                                  |
| `status: true` in workOrder select [itemId]                      | ✅ Implemented | Line 71: `status: true` added to select                                                        |
| PUT guard bypass in [id]/route.ts                                | ✅ Implemented | Wrapped with `if (!canOverrideWorkOrderFreeze(user))`                                          |
| OWNER bypass in purchase-orders/route.ts                         | ✅ Implemented | `isOverride` computed, else branch cancels DRAFT/PENDING_APPROVAL POs                          |
| `currentUser` prop in UnifiedWorkOrderForm                       | ✅ Implemented | Prop added + `isFrozen` computed with `canOverrideWorkOrderFreeze(currentUser as any)`         |
| Fields disabled when isFrozen                                    | ✅ Implemented | `description`, `quantity`, `unitPrice` in both renderServiceRow and renderPartRow              |
| Submit disabled when isFrozen                                    | ✅ Implemented | `disabled={isLoading \|\| isFrozen}`                                                           |
| Relabeled "Notas / Observaciones"                                | ✅ Implemented | Section 4 card title updated                                                                   |
| `currentUser` passed to form in page.tsx                         | ✅ Implemented | 1-line change                                                                                  |
| `description: string \| null` in WorkOrderForHeader type         | ✅ Implemented | Type extended                                                                                  |
| Inline description edit widget in WorkOrderHeader                | ✅ Implemented | Pencil→textarea→save/cancel, calls `PATCH { description }`, toast on error                     |
| `canEditDescription` shown only in EDITABLE_DESCRIPTION_STATUSES | ✅ Implemented | Set includes APPROVED, IN_PROGRESS, PENDING_INVOICE, COMPLETED                                 |
| `poLinkedExternalItems` derived in ComprasTab                    | ✅ Implemented | Correct filter: EXTERNAL/INTERNAL_PURCHASE + purchaseOrderItems.length > 0                     |
| OWNER "Regenerar OC" card visible only when isOverride           | ✅ Implemented | `{isOverride && poLinkedExternalItems.length > 0 && ...}`                                      |
| AlertDialog with cancellable/non-cancellable PO lists            | ✅ Implemented | Shows `cancellablePOs` (DRAFT/PENDING_APPROVAL) and `nonCancellablePOs` (APPROVED/SENT)        |

---

## Coherence (Design)

| Decision                                                                       | Followed?            | Notes                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision 1 — `canOverrideWorkOrderFreeze` in permissions.ts WORK ORDER section | ✅ Yes               | Pure function, same pattern as canApproveWorkOrder                                                                                                                                                          |
| Decision 2 — Backend freeze guard in PATCH /items/[itemId]                     | ✅ Yes               | After ownership check, before updateData preparation                                                                                                                                                        |
| Decision 3 — PUT /[id] guard with OWNER bypass                                 | ✅ Yes               | Wrapped correctly                                                                                                                                                                                           |
| Decision 4 — UnifiedWorkOrderForm isFrozen logic                               | ✅ Yes               | FROZEN_WO_STATUSES includes REJECTED/CANCELLED per design                                                                                                                                                   |
| Decision 5 — Inline description in WorkOrderHeader                             | ✅ Yes               | Placed in WorkOrderHeader as local state, EDITABLE_DESCRIPTION_STATUSES correct                                                                                                                             |
| Decision 6 — OWNER PO regen via existing POST endpoint                         | ✅ Yes               | No new endpoint created; bulk cancel outside per-provider transaction                                                                                                                                       |
| Decision 7 — ComprasTab "Regenerar OC" section                                 | ⚠️ Partial deviation | Backend cancels ALL DRAFT/PENDING_APPROVAL POs for the WO (not filtered to the specific item). Dialog shows WO-level POs, not item-level. This is safe but slightly wider scope than described in decision. |
| Design: no schema changes, no migrations                                       | ✅ Yes               | Confirmed                                                                                                                                                                                                   |
| Design: no new API endpoints                                                   | ✅ Yes               | Confirmed                                                                                                                                                                                                   |

---

## Issues Found

### CRITICAL (must fix before archive)

None — implementation is structurally correct and type-checks pass.

### WARNING (should fix)

1. **No automated tests for new behavior** — All 11 spec scenarios are UNTESTED. The freeze guard (403), OWNER bypass (200), and PO cancellation logic have no vitest coverage. Risk: regression goes undetected.
2. **Pre-existing test suite broken** — 59 tests fail due to `axleConfig` column missing in test DB (`serialized-assets` migration not applied to test DB). Recommend running `npm run db:test:push` to restore test suite health before adding new tests.
3. **ComprasTab AlertDialog scope** — The dialog lists POs at WO level (all DRAFT/PENDING_APPROVAL), not filtered to the specific item being regenerated. This is wider than the design specifies but consistent with backend behavior (which also cancels at WO level). Low user impact, but worth noting.

### SUGGESTION (nice to have)

1. Add vitest integration tests for scenarios 4.1–4.3 (freeze guard 403/200) to `[id]/__tests__/route.test.ts` — these are testable with the existing test infrastructure.
2. Consider adding a visual indicator (e.g., a lock icon) in UnifiedWorkOrderForm when `isFrozen=true` so users understand why inputs are disabled.

---

## Verdict

**PASS WITH WARNINGS**

Implementation is complete (Phases 1-3), type-checks pass (0 TS errors), and all structural evidence matches the spec and design. The 59 test failures are pre-existing (`axleConfig`) and unrelated. The main gap is absence of automated test coverage for the new freeze/OWNER-bypass behavior. Phase 4 manual verification (4.1–4.6) is still pending.
