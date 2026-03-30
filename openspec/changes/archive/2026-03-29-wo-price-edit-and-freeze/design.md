# Technical Design: wo-price-edit-and-freeze

**Date:** 2026-03-29
**Change:** `wo-price-edit-and-freeze`
**Status:** Design complete

---

## Overview

Three coordinated features that add price-freeze semantics to the WO lifecycle:

1. **Feature 1 — PENDING_APPROVAL price editing**: Allow `unitPrice`, `quantity`, and item `description` edits while WO is `PENDING_APPROVAL`. Block them for all non-OWNER roles once the WO moves to `APPROVED` or beyond.
2. **Feature 2 — Post-approval inline notes**: Expose `WorkOrder.description` as an inline editable field in the detail view for all states `>= APPROVED`.
3. **Feature 3 — OWNER override**: OWNER bypasses the freeze on items and can cancel+regenerate POs.

No DB schema changes. No new tables. No migrations.

---

## Architecture Map

```
src/lib/permissions.ts                          ← add canOverrideWorkOrderFreeze()
src/app/api/maintenance/work-orders/
  [id]/items/[itemId]/route.ts                  ← add WO-status freeze guard in PATCH
  [id]/purchase-orders/route.ts                 ← add OWNER bypass + cancel-old-PO logic
  [id]/route.ts                                 ← no backend change (PATCH already open for description)
src/components/maintenance/work-orders/
  UnifiedWorkOrderForm.tsx                      ← accept currentUser prop; freeze price/qty/description fields
src/app/dashboard/maintenance/work-orders/
  [id]/page.tsx                                 ← pass currentUser to UnifiedWorkOrderForm
  components/WorkOrderDetail/
    WorkOrderHeader.tsx                         ← add inline editable description section
    ComprasTab.tsx                              ← add OWNER-only "Regenerar OC" action per item group
```

---

## Decision 1 — canOverrideWorkOrderFreeze placement and signature

**Location:** `src/lib/permissions.ts`, in the `WORK ORDER LIFECYCLE PERMISSIONS` section.

**Signature:**

```ts
export function canOverrideWorkOrderFreeze(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user);
}
```

**Rationale:** Follows the exact same pattern as all other composed helpers in this file (`canApproveWorkOrder`, `canCloseWorkOrder`, etc.) — pure function over `User | null`, no additional params. Both `isSuperAdmin` and `isOwner` are already defined above it. The function is importable by both API routes (server) and `'use client'` components (client bundle), which is the existing pattern for helpers like `canViewCosts`.

**Frozen states set** (defined as a constant in the implementation file that needs it, not in permissions.ts — permissions.ts stays role-only):

```ts
const FROZEN_WO_STATUSES = new Set([
  'APPROVED',
  'IN_PROGRESS',
  'PENDING_INVOICE',
  'COMPLETED',
]);
```

This constant is duplicated in two places: `[itemId]/route.ts` (backend) and `UnifiedWorkOrderForm.tsx` (frontend). That is intentional — coupling them via a shared module would require moving constants to a shared file for what is currently a small, stable set.

---

## Decision 2 — Backend freeze guard in PATCH /items/[itemId]

**File:** `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts`

**Current state:** No WO-status guard. Any `canExecuteWorkOrders` user can PATCH `unitPrice`/`quantity` in any WO state.

**Change:** After the existing item ownership check (line ~73), add a WO-status lookup and a conditional guard:

```
// 1. Fetch parent WO status (already have workOrder.id from existingItem)
// 2. If WO status is in FROZEN_WO_STATUSES AND (unitPrice or quantity is being updated):
//    AND NOT canOverrideWorkOrderFreeze(user) → return 403
```

**Implementation detail:** The `existingItem` query already includes `workOrder: { select: { tenantId: true, id: true } }`. We need to add `status: true` to that select — a zero-overhead addition. No extra DB round-trip.

The guard covers `unitPrice`, `quantity`, and also `description` (the item-level description field, per spec). The Zod schema `updateItemSchema` does not currently expose `description` — it must be added as `z.string().optional()` alongside the freeze check.

**Error shape:** HTTP 403 with `{ error: 'No se pueden modificar precios en una OT aprobada o posterior' }`.

---

## Decision 3 — PUT /api/maintenance/work-orders/[id] freeze scope

**File:** `src/app/api/maintenance/work-orders/[id]/route.ts`

**Current state (line 856):**

```ts
if (
  existingWO.status !== 'PENDING' &&
  existingWO.status !== 'IN_PROGRESS' &&
  existingWO.status !== 'PENDING_APPROVAL'
) {
  return NextResponse.json(
    { error: 'No editar ítems de OTs cerradas/en revisión financiera' },
    { status: 400 }
  );
}
```

The `PUT` handler (full-item sync via `UnifiedWorkOrderForm`) already blocks when status is `APPROVED`, `PENDING_INVOICE`, or `COMPLETED`. It allows `PENDING`, `IN_PROGRESS`, and `PENDING_APPROVAL`. This is the correct behavior for Feature 1 — no backend change needed here.

However, when status is `IN_PROGRESS` and user is OWNER, the OWNER should be able to use the full PUT form too. **Add an OWNER bypass to this guard:**

```ts
if (!canOverrideWorkOrderFreeze(user)) {
  if (
    existingWO.status !== 'PENDING' &&
    existingWO.status !== 'IN_PROGRESS' &&
    existingWO.status !== 'PENDING_APPROVAL'
  ) {
    return NextResponse.json({ error: '...' }, { status: 400 });
  }
}
// OWNER: no status restriction on PUT
```

This makes the OWNER bypass consistent across both `PUT` (full-sync) and `PATCH /items/[itemId]` (single-item update).

---

## Decision 4 — UnifiedWorkOrderForm freeze logic

**File:** `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx`

**Current signature:**

```ts
export function UnifiedWorkOrderForm({ initialData }: { initialData?: any });
```

**New signature:**

```ts
export function UnifiedWorkOrderForm({
  initialData,
  currentUser,
}: {
  initialData?: any;
  currentUser?: { id: string; role: string; isSuperAdmin: boolean } | null;
});
```

The `currentUser` type matches the `CurrentUser` type already defined in `[id]/page.tsx`. No new type import needed — use the same inline shape.

**Freeze logic:**

```ts
const FROZEN_WO_STATUSES = new Set([
  'APPROVED',
  'IN_PROGRESS',
  'PENDING_INVOICE',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]);

const isFrozen =
  !!initialData?.status &&
  FROZEN_WO_STATUSES.has(initialData.status) &&
  !canOverrideWorkOrderFreeze(currentUser as any);
```

`canOverrideWorkOrderFreeze` is imported from `@/lib/permissions`. Since `currentUser` from `fetch('/api/auth/me')` uses a local type `{ id, role, isSuperAdmin }` (not the Prisma `User` type), we cast via `as any` — this is consistent with how `canViewCosts(currentUser as any)` is already used in `ComprasTab.tsx`.

**Fields to disable when `isFrozen`:**

- `unitPrice` (every item in `services` and `parts` arrays)
- `quantity` (every item)
- `description` at item level (the item description field inside each service/part row)

**Submit button behavior:** When `isFrozen`, the "Sincronizar Cambios" button is disabled. The form remains visible in read-only mode so users can review items. Non-price fields (`closureType`, `itemSource`, `providerId`) are NOT frozen — the spec only freezes `unitPrice`, `quantity`, and item `description`. However, the `PUT` backend already blocks all changes for non-OWNER when status is `APPROVED`+, so even if non-price fields are editable in the UI, the submit would be blocked by the backend for those states too.

**PENDING_APPROVAL behavior:** `PENDING_APPROVAL` is NOT in `FROZEN_WO_STATUSES`. The form is fully editable for all roles in this state. The submit button label can remain "Sincronizar Cambios" — no label change needed.

---

## Decision 5 — Post-approval inline description editing

**Location:** `WorkOrderHeader` component OR a dedicated card in the detail page.

**Decision: Place in `WorkOrderHeader`** — it already receives `workOrder` (which has `description`) and `currentUser` (for any future role-gating). The header is the most prominent area, avoids a new tab, and the `description` field is logically "WO-level metadata" — the same area where vehicle, technician, status, and priority are displayed.

**Implementation approach:** Inline edit pattern (pencil icon → editable textarea → save/cancel buttons), implemented directly in `WorkOrderHeader.tsx` as local component state. No new component file needed.

**Trigger condition:** Show the inline edit control when `workOrder.status` is in:

```ts
const EDITABLE_DESCRIPTION_STATUSES = new Set([
  'APPROVED',
  'IN_PROGRESS',
  'PENDING_INVOICE',
  'COMPLETED',
]);
```

For `PENDING` and `PENDING_APPROVAL`, the `description` field is already editable via `UnifiedWorkOrderForm` (section 1 — "Notas del Técnico"). Having two edit surfaces for the same field in PENDING states would be confusing. The inline edit is only activated post-approval.

**Field label:** The spec mandates consistent labeling as "Notas / Observaciones". Change the label in `UnifiedWorkOrderForm` section 1 from "Notas del Técnico" (current) to "Notas / Observaciones" at the same time.

**API call on save:** `PATCH /api/maintenance/work-orders/[id]` with `{ description: newValue }`. The existing PATCH handler already accepts `description` unconditionally — no backend change needed.

**Error handling:** On save failure, display a toast and revert the field to the previous value.

**Access:** All non-DRIVER roles. No role guard on the inline edit control itself — the backend PATCH does not restrict description updates, which aligns with the spec requirement that any user with WO view access can edit it.

---

## Decision 6 — OWNER PO regeneration: endpoint strategy

**Decision: Modify the existing `POST /api/maintenance/work-orders/[id]/purchase-orders`** rather than creating a new endpoint.

**Rationale:** The existing endpoint already handles the grouping-by-provider logic and the PO creation transaction. Adding an OWNER bypass and a pre-creation cancel step is a small, localized change. A new `regenerate-docs` endpoint would duplicate all the same creation logic.

**Changes to `purchase-orders/route.ts`:**

1. **Import `canOverrideWorkOrderFreeze`** from `@/lib/permissions`.

2. **Replace the "already has PO" guard** (lines 72–78):

   ```ts
   // Current (blocks for all users):
   for (const item of items) {
     if (item.purchaseOrderItems && item.purchaseOrderItems.length > 0) {
       return NextResponse.json(
         { error: `El ítem ${item.id} ya tiene OC activa` },
         { status: 400 }
       );
     }
   }

   // New (OWNER bypass + cancel-old-PO):
   const isOverride = canOverrideWorkOrderFreeze(user);
   if (!isOverride) {
     for (const item of items) {
       if (item.purchaseOrderItems && item.purchaseOrderItems.length > 0) {
         return NextResponse.json(
           { error: `El ítem ${item.id} ya tiene OC activa` },
           { status: 400 }
         );
       }
     }
   } else {
     // OWNER: cancel any open POs for this WO that are in DRAFT or PENDING_APPROVAL
     await tenantPrisma.purchaseOrder.updateMany({
       where: {
         workOrderId,
         status: { in: ['DRAFT', 'PENDING_APPROVAL'] },
       },
       data: { status: 'CANCELLED' },
     });
     // Note: POs in APPROVED or SENT are NOT auto-cancelled — they remain.
     // The UI warning dialog informs the OWNER before triggering this call.
   }
   ```

3. **The cancel operation runs outside the per-provider transaction** — it's a bulk update on the parent WO's POs, not tied to individual item groups. This avoids nested transaction complexity.

4. **PO status in the OWNER regeneration flow:** The new PO created via the manual endpoint uses `status: 'DRAFT'` (existing behavior). This is intentional — the OWNER regeneration does not auto-approve the new PO.

**WO-state guard on this endpoint:** None added. The existing endpoint has no WO-state guard (it only checks `canExecuteWorkOrders`). OWNER can call it in any WO state, which is correct.

---

## Decision 7 — ComprasTab "Regenerar OC" UI

**File:** `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab.tsx`

**Current state:** The "Ítems Pendientes de Compra" section shows EXTERNAL items without a PO and a "Generar Órdenes de Compra" button. Items already linked to a PO are only shown in the PO table (expanded row).

**New OWNER behavior:** Add a second section or augment the existing one to also show EXTERNAL/INTERNAL_PURCHASE items that already have a PO, but only to OWNER. Each such item row gets a "Regenerar OC" button.

**Implementation:**

1. Import `canOverrideWorkOrderFreeze` from `@/lib/permissions`.
2. Compute `const isOverride = canOverrideWorkOrderFreeze(currentUser as any)`.
3. Define:
   ```ts
   const pendingExternalItems = ...; // existing: no PO
   const poLinkedExternalItems = workOrder.workOrderItems.filter(
     i => (i.itemSource === 'EXTERNAL' || i.itemSource === 'INTERNAL_PURCHASE')
       && i.status !== 'CANCELLED'
       && i.purchaseOrderItems?.length > 0
   );
   ```
4. In the "Ítems Pendientes de Compra" card (existing), when `isOverride` is true, also show `poLinkedExternalItems` in the same table with a visual distinction (e.g., a `Badge` showing the existing PO number).
5. The "Regenerar OC" button per item is a separate action button that:
   - Opens a confirmation `AlertDialog` listing POs that will be cancelled (DRAFT/PENDING_APPROVAL) and warning about any POs in APPROVED/SENT that won't be cancelled.
   - On confirm, calls the existing `POST /api/maintenance/work-orders/[id]/purchase-orders` with `{ itemIds: [item.id] }`.

**Dialog content structure:**

```
Title: "Regenerar Orden de Compra"
Body:
  "Se cancelarán las siguientes OC en estado Borrador o En Aprobación:"
  <list of cancellable PO numbers>
  [If any APPROVED/SENT POs exist]:
  "Advertencia: Las siguientes OC no se cancelarán automáticamente y quedarán activas:"
  <list of non-cancellable PO numbers>
  "Se creará una nueva OC con los precios actuales del ítem."
Footer: [Cancelar] [Confirmar Regeneración]
```

**Where to get the PO list for the dialog:** `workOrder.purchaseOrders` is already fetched in the parent page and passed to `ComprasTab`. Filter by WO POs that include the target item (`po.items.some(i => i.workOrderItemId === targetItemId)`). Since the current `purchaseOrders` select in the GET handler includes `items.workOrderItemId`, this works with existing data — no extra API call.

---

## Decision 8 — Detail page: passing currentUser to UnifiedWorkOrderForm

**File:** `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`

The page already:

- Fetches `currentUser` via `fetch('/api/auth/me')` and stores it in `useState<CurrentUser | null>`.
- Passes `currentUser` to `WorkOrderHeader` and `ComprasTab`.

**Only one change needed:** Pass `currentUser` to `UnifiedWorkOrderForm`:

```tsx
// Before:
<UnifiedWorkOrderForm initialData={workOrder} />

// After:
<UnifiedWorkOrderForm initialData={workOrder} currentUser={currentUser} />
```

No other changes to the page.

---

## Data Flow Summary

### Feature 1 — Price freeze

```
User edits price in UnifiedWorkOrderForm
  → isFrozen check (status + role) → if frozen: input is disabled, submit disabled
  → User is OWNER: isFrozen = false, form fully editable
  → PUT /api/maintenance/work-orders/[id]
      → canOverrideWorkOrderFreeze check
      → If not OWNER and status is APPROVED+: 400
      → If OWNER: allowed in any state

User calls PATCH /items/[itemId] with unitPrice
  → canExecuteWorkOrders check (existing)
  → Load item + WO status
  → If WO status in FROZEN_WO_STATUSES AND NOT canOverrideWorkOrderFreeze: 403
  → Else: update proceeds
```

### Feature 2 — Post-approval notes

```
User opens WO detail (status >= APPROVED)
  → WorkOrderHeader renders "Notas / Observaciones" with pencil icon
  → User clicks pencil → textarea replaces read-only text
  → User saves → PATCH /api/maintenance/work-orders/[id] { description }
  → Backend: no guard, updates unconditionally
  → WO state refreshed via fetchWorkOrder()
```

### Feature 3 — OWNER PO regeneration

```
OWNER opens ComprasTab
  → canOverrideWorkOrderFreeze(currentUser) = true
  → poLinkedExternalItems section is visible
  → OWNER clicks "Regenerar OC" on an item
  → Dialog opens: lists cancellable POs (DRAFT/PENDING_APPROVAL) + warns about APPROVED/SENT
  → OWNER confirms
  → POST /api/maintenance/work-orders/[id]/purchase-orders { itemIds: [itemId] }
  → Backend: OWNER bypass → cancel DRAFT/PENDING_APPROVAL POs for this WO
  → New PO created (status: DRAFT) with current item prices
  → onRefresh() called → UI updates
```

---

## Files to Modify (complete list)

| File                                                                                       | Type     | Change summary                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/permissions.ts`                                                                   | Modified | Add `canOverrideWorkOrderFreeze(user)` function                                                                                                                                                     |
| `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts`                         | Modified | Add `description` to Zod schema; add WO-status freeze guard before update; include `status` in `workOrder` select                                                                                   |
| `src/app/api/maintenance/work-orders/[id]/purchase-orders/route.ts`                        | Modified | Import `canOverrideWorkOrderFreeze`; replace "already has PO" guard with OWNER bypass + bulk PO cancel                                                                                              |
| `src/app/api/maintenance/work-orders/[id]/route.ts`                                        | Modified | Wrap `PUT` status guard with `canOverrideWorkOrderFreeze` bypass                                                                                                                                    |
| `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx`                          | Modified | Add `currentUser` prop; add `isFrozen` logic; disable `unitPrice`, `quantity`, item `description` inputs when frozen; disable submit when frozen                                                    |
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`                                  | Modified | Pass `currentUser` to `UnifiedWorkOrderForm`                                                                                                                                                        |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx` | Modified | Add `description`/`notes` field to `WorkOrderForHeader` type; add inline edit UI for `description` when status is in `EDITABLE_DESCRIPTION_STATUSES`; update field label to "Notas / Observaciones" |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab.tsx`      | Modified | Import `canOverrideWorkOrderFreeze`; add `poLinkedExternalItems` computation; add OWNER-only "Regenerar OC" per-item button; add confirmation `AlertDialog`                                         |

---

## Non-changes (confirmed)

- `WorkOrder.notes` field: NOT surfaced. Out of scope per spec.
- `WorkOrderItem.billingPrice`: NOT touched. Out of scope per spec.
- `WorkOrderApproval` table: NOT modified.
- `InternalWorkTicket` regeneration: NOT in this change. The spec only covers PO regeneration. The workshop ticket manual endpoint (`POST /workshop-tickets`) already creates new tickets without blocking — if needed it can be a follow-up.
- No new API endpoints.
- No Prisma schema changes.
- No migrations.

---

## Risk Register

| Risk                                                                                  | Impact | Mitigation in Design                                                                                                        |
| ------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Two active POs for APPROVED/SENT after OWNER regeneration                             | Med    | UI dialog explicitly warns; APPROVED/SENT POs are NOT auto-cancelled; OWNER proceeds knowingly                              |
| `canOverrideWorkOrderFreeze` called with local `CurrentUser` type (not Prisma `User`) | Low    | Cast via `as any` is consistent with existing `canViewCosts(currentUser as any)` usage across the codebase                  |
| `WorkOrderHeader` type `WorkOrderForHeader` does not include `description`            | Low    | Add `description: string \| null` to the type definition; it's already available in the parent `WorkOrder` type on the page |
| Frontend freeze bypassed via direct API call                                          | Low    | Backend guard is primary control; frontend is UX defense-in-depth                                                           |
| Relabeling "Notas del Técnico" → "Notas / Observaciones" may surprise users           | Low    | Cosmetic change only; same field, same data                                                                                 |

---

## Implementation Order (suggested for tasks)

1. `src/lib/permissions.ts` — add `canOverrideWorkOrderFreeze` (zero risk, pure function, used by all other tasks)
2. `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts` — backend freeze guard (backend-only, testable independently)
3. `src/app/api/maintenance/work-orders/[id]/purchase-orders/route.ts` — OWNER bypass + cancel logic (backend-only)
4. `src/app/api/maintenance/work-orders/[id]/route.ts` — wrap PUT guard with OWNER bypass
5. `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx` — freeze logic (frontend)
6. `src/app/dashboard/maintenance/work-orders/[id]/page.tsx` — pass `currentUser` to form (1-line change)
7. `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx` — inline description edit
8. `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab.tsx` — OWNER regenerate UI
