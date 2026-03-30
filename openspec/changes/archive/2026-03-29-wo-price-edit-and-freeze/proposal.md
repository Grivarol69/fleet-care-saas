# Proposal: WO Price Edit and Freeze

**Date:** 2026-03-29
**Change:** `wo-price-edit-and-freeze`

---

## Intent

Work orders currently have no field-level freeze once approved. Any user with execute access can silently edit prices on `WorkOrderItem` via PATCH at any lifecycle state, and there is no way to edit WO-level notes after approval without re-opening the full form. This creates audit and cost integrity risk. We need:

1. Explicit price editability window (only `PENDING_APPROVAL`)
2. A permanent post-approval notes channel (WO `description` field)
3. OWNER override to unblock frozen fields and regenerate POs/tickets when corrections are needed

---

## Scope

### In Scope

- **Feature 1 — PENDING_APPROVAL price editing**: Enable editing `unitPrice`, `quantity`, and item `description` on `WorkOrderItem` (all item types) while WO is `PENDING_APPROVAL`. Enforced in both backend and frontend.
- **Feature 2 — Post-approval notes**: Inline editable WO `description` field in the detail view for all states `>= APPROVED`. No other WO fields editable post-approval for non-OWNER.
- **Feature 3 — OWNER override**: OWNER bypasses the freeze in any state — can edit all `WorkOrderItem` fields, and can cancel+regenerate PurchaseOrders (per item group, per provider) and InternalWorkTickets.
- **Freeze enforcement**: Backend validation in `PATCH /items/[itemId]` guards `unitPrice`/`quantity` changes by WO state. Frontend `UnifiedWorkOrderForm` renders price/qty fields as read-only when status `>= APPROVED` (unless OWNER).

### Out of Scope

- `WorkOrder.notes` field — only `description` is in scope for post-approval editing
- `WorkOrderItem.billingPrice` — not surfaced, not touched
- Multi-level approval workflow (the existing `WorkOrderApproval` table is not modified)
- Partial per-item approvals
- Concurrency / optimistic locking improvements
- Fixing the existing REJECTED/CANCELLED PUT guard inconsistency (tracked separately)

---

## Approach

**Defense in depth** — frontend freeze + backend enforcement:

1. **Backend (`PATCH /items/[itemId]`)**: Add WO-status guard. If `wo.status` is `APPROVED`, `IN_PROGRESS`, `PENDING_INVOICE`, or `COMPLETED`, reject edits to `unitPrice`/`quantity` unless `isOwner(user)`.
2. **Backend (`PATCH /api/maintenance/work-orders/[id]`)**: Already accepts `description` unconditionally — no change needed for Feature 2 itself. Verify no accidental guard blocks it.
3. **Backend (`POST /purchase-orders`)**: If `isOwner(user)`, skip the "item already has PO" block. Cancel (set status `CANCELLED`) all existing open POs for the same item group before creating the new one.
4. **Frontend (`UnifiedWorkOrderForm`)**: Receives `currentUser`; price/qty fields disabled when status `>= APPROVED` unless `isOwner`.
5. **Frontend (WO detail page)**: Add inline editable `description` card/section visible to all roles with view access when status `>= APPROVED`.
6. **Frontend (`ComprasTab`)**: Add OWNER-only "Regenerar OC" per-item action.
7. **Permissions (`src/lib/permissions.ts`)**: Add `canOverrideWorkOrderFreeze(user)` helper (`isOwner`-based) for reuse across backend and frontend.

---

## Affected Areas

| Area                                                                                       | Impact   | Description                                                |
| ------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------- |
| `src/lib/permissions.ts`                                                                   | Modified | Add `canOverrideWorkOrderFreeze(user)`                     |
| `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts`                         | Modified | Add WO-status freeze guard on `unitPrice`/`quantity`       |
| `src/app/api/maintenance/work-orders/[id]/purchase-orders/route.ts`                        | Modified | OWNER bypass + cancel-old-PO logic before creating new one |
| `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx`                          | Modified | Accept `currentUser`; disable price/qty fields when frozen |
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`                                  | Modified | Pass `currentUser` to form; add inline description edit UI |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx` | Modified | Surface inline editable `description` field post-approval  |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab.tsx`      | Modified | OWNER-only "Regenerar OC" action per item                  |

---

## Risks

| Risk                                                                          | Likelihood | Mitigation                                                                                        |
| ----------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| Two active POs after regeneration if cancel logic is skipped                  | Med        | Cancel (CANCELLED) old open POs before creating new in the OWNER flow; add a warning dialog in UI |
| OWNER edits prices on a WO with sent/accepted POs — vendor mismatch           | Med        | UI warning in "Regenerar OC" dialog listing current PO status before confirming                   |
| `description` label confusion ("Notas del Técnico" in form vs. general notes) | Low        | Relabel field consistently as "Notas / Observaciones" across form and detail view                 |
| Frontend freeze bypass via direct PATCH API call                              | Low        | Backend guard is the primary control; frontend freeze is UX only                                  |

---

## Rollback Plan

All changes are additive guards and UI conditionals. To revert:

1. Remove the WO-status check block from `PATCH /items/[itemId]` — restores prior behavior (no freeze).
2. Remove the OWNER bypass + cancel-old-PO block from `POST /purchase-orders` — restores prior "already has PO" block.
3. Revert `UnifiedWorkOrderForm` to not accept `currentUser` / remove the freeze condition.
4. Remove the inline description edit component from the detail page.

No schema migrations required — no DB changes.

---

## Dependencies

- No external dependencies.
- The `WorkOrderApproval` table exists in schema but is not modified by this change.

---

## Success Criteria

- [ ] A MANAGER with a `PENDING_APPROVAL` WO can edit `unitPrice` and `quantity` on any item and save successfully.
- [ ] The same MANAGER cannot edit `unitPrice`/`quantity` on an `APPROVED` WO (API returns 403/400).
- [ ] Any user with WO view access can edit the `description` field of an `APPROVED` WO inline and save successfully.
- [ ] An OWNER can edit `unitPrice` on an `IN_PROGRESS` WO — frontend allows it, backend accepts it.
- [ ] An OWNER can click "Regenerar OC" on an item that already has a PO — old PO is cancelled, new PO is created.
- [ ] No DB migrations required; all existing data continues to work without modification.
