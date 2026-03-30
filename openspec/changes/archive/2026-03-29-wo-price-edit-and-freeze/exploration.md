# Exploration: wo-price-edit-and-freeze

**Date:** 2026-03-29
**Change:** Three related behaviors around price editing and field freezing in the Work Order detail view.

---

## Current State

### WO Lifecycle (FSM)

States: `PENDING → PENDING_APPROVAL → APPROVED → IN_PROGRESS → PENDING_INVOICE → COMPLETED`
Also: `REJECTED`, `CANCELLED` (terminal).

### Edit surface today

- **`PUT /api/maintenance/work-orders/[id]`** (unified form): full item sync — allowed only when status is `PENDING`, `IN_PROGRESS`, or `PENDING_APPROVAL`. This is the `UnifiedWorkOrderForm` component.
- **`PATCH /api/maintenance/work-orders/[id]/items/[itemId]`**: partial update on a single `WorkOrderItem`; allows `unitPrice`, `quantity`, `itemSource`, `closureType`, `status`, `supplier`, `providerId`. **No WO-status guard** — any `canExecuteWorkOrders` user can call it in any WO state.
- **`PATCH /api/maintenance/work-orders/[id]`**: updates `description`, `notes`, `priority`, `costCenterId`, `technicianId`, `providerId`, `actualCost`, `completionMileage`, and handles state transitions. Also **no explicit freeze** on `description`/`notes` by state.

### WorkOrder model (Prisma)

- `description String?` — general notes/observations field (labeled "Notas del Técnico" in UI)
- `notes String? @db.Text` — context-level notes (incidents, delays)
- Both are already passed through in the PATCH body and applied unconditionally.

### WorkOrderItem model (Prisma)

- `unitPrice Decimal`, `quantity Int`, `totalCost Decimal` — pricing fields
- `description String` — item-level description/notes

### Current UI (WO detail page)

- Tab "Ítems (Unificado)": renders `UnifiedWorkOrderForm` — always visible, does not check WO status before allowing edit.
- `UnifiedWorkOrderForm` calls `PUT` on "Sincronizar Cambios" — the API rejects edits when status is `APPROVED`, `PENDING_INVOICE`, or `COMPLETED`.
- There is NO inline row-level price editing in the detail view (only full form submission via PUT).
- No inline notes editing UI either — description/notes appear as read-only in `WorkOrderHeader`.

### Permissions today (relevant functions)

- `isOwner(user)` — `role === 'OWNER'`
- `canApproveWorkOrder(user)` — SUPER_ADMIN, OWNER, MANAGER, COORDINATOR
- `canExecuteWorkOrders(user)` — SUPER_ADMIN, OWNER, MANAGER, COORDINATOR, TECHNICIAN

### PO & Ticket regeneration

- POs auto-created on `APPROVED` transition (in route.ts PATCH handler).
- Manual PO creation: `POST /api/maintenance/work-orders/[id]/purchase-orders` — already available, already checks `canExecuteWorkOrders`. But it **blocks** if an item already has a PO (`item.purchaseOrderItems.length > 0`).
- Internal Work Ticket: `POST /api/maintenance/work-orders/[id]/workshop-tickets` — creates new TKT, no duplicate guard beyond the approval flow's `existingTicket` check.
- The manual PO endpoint sets status `DRAFT` (vs `PENDING_APPROVAL` set by auto-flow on APPROVED).

---

## Affected Areas

- `src/app/api/maintenance/work-orders/[id]/route.ts` — Add state guard on PATCH for `description`/`notes` after approval; no-op or allow depending on state.
- `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts` — Add WO-state gate: block `unitPrice`/`quantity` edits when WO status >= APPROVED (unless OWNER override).
- `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx` — Conditionally freeze price/qty inputs when WO status is APPROVED or beyond. Needs `currentUser` prop to check OWNER override.
- `src/app/dashboard/maintenance/work-orders/[id]/page.tsx` — Pass `currentUser` into `UnifiedWorkOrderForm`; add inline notes editing UI for post-approval states.
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx` — Possibly add inline edit for `description`/`notes` at header level, or defer to a dedicated card.
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab.tsx` — Add OWNER-only "Regenerate PO" action for items that already have POs.
- `src/app/api/maintenance/work-orders/[id]/purchase-orders/route.ts` — Remove or relax the "already has PO" guard for OWNER role.
- `src/lib/permissions.ts` — Possibly add `canEditWorkOrderPrices(user, woStatus)` helper or `canOverrideWorkOrderFreeze(user)`.

---

## Approaches

### Feature 1: PENDING_APPROVAL price editing

**Option A — Gate in `UnifiedWorkOrderForm` only (frontend)**

- Add a `frozenStatuses` list; disable price/qty inputs when `initialData.status` is not `PENDING` or `PENDING_APPROVAL`.
- Pass `currentUser` to the form; if `isOwner`, never freeze.
- The existing `PUT` endpoint already allows `PENDING_APPROVAL` edits.
- Pros: Minimal backend changes; fast to implement.
- Cons: No server-side enforcement — a direct API call bypasses the gate. For a SaaS with multiple roles this is a real risk.
- Effort: Low

**Option B — Enforce in both frontend AND backend (recommended)**

- Frontend: disable inputs in `UnifiedWorkOrderForm` based on status + role.
- Backend: add a status check in the `PUT` handler that rejects full-item-sync when status is >= APPROVED (already partially done) but explicitly allows it for PENDING_APPROVAL. For item-level PATCH (`[itemId]/route.ts`), add status guard: if WO status is APPROVED or beyond AND user is not OWNER, reject `unitPrice`/`quantity` changes.
- Pros: Defense in depth; consistent with multi-tenant security model.
- Cons: Slightly more code.
- Effort: Low-Medium

### Feature 2: Post-approval notes editing

**Option A — Inline edit in WorkOrderHeader or separate card**

- Add a small "Edit notes" pencil icon next to the notes/description area in the header or in a dedicated section.
- On save, call `PATCH /api/maintenance/work-orders/[id]` with `{ description: newValue }`.
- The PATCH handler already accepts `description` and `notes` unconditionally — no backend change needed for the edit itself. However, we need to decide: should the backend reject `description` edits when WO is COMPLETED? (The request says "any state >= APPROVED" allows notes editing.)
- Current PATCH handler: no guard on `description`/`notes` → already open for all states. So backend is already permissive — only frontend needs the UI.
- Pros: Backend already supports it; low risk.
- Cons: Need to decide if COMPLETED/CANCELLED should also allow edits (spec says "any state >= APPROVED" so COMPLETED is included).
- Effort: Low

**Option B — Notes tab or panel**

- Add a dedicated "Notas" section/tab visible to all roles.
- Effort: Medium

Recommendation: Option A (inline pencil edit in existing detail view).

### Feature 3: OWNER override (all fields + PO/Ticket regeneration)

**Option A — Role check in existing endpoints**

- In `[itemId]/route.ts` PATCH: if `isOwner(user)`, skip the WO-status freeze guard.
- In `purchase-orders/route.ts` POST: if `isOwner(user)`, skip the "already has PO" guard (or delete+recreate).
- In `workshop-tickets/route.ts` POST: if `isOwner(user)`, allow duplicate ticket creation (currently blocked by the `existingTicket` check in the APPROVED transition — but the manual `/workshop-tickets` endpoint has no such block; it just creates a new one).
- Add "Regenerar OC" button in `ComprasTab` visible only to OWNER, per item.
- Pros: Surgical changes; no new endpoints needed.
- Cons: Slightly complex PO regeneration logic (delete old PO items or create parallel PO?).
- Effort: Medium

**Option B — New OWNER-scoped endpoint for force-regeneration**

- `POST /api/maintenance/work-orders/[id]/regenerate-docs` — OWNER-only; regenerates POs and/or tickets.
- Pros: Clean separation; easier to audit.
- Cons: More endpoints to maintain.
- Effort: Medium-High

---

## Recommendation

**Use Option B for Feature 1** (both frontend + backend enforcement) and **Option A for Features 2 and 3**.

Concretely:

1. **Feature 1 (PENDING_APPROVAL price editing)**:
   - Backend: Add guard in `PUT` route (already allows PENDING_APPROVAL) — confirm it stays.
   - Backend: Add state guard in `PATCH /items/[itemId]`: reject `unitPrice`/`quantity` if `wo.status` is `APPROVED`, `IN_PROGRESS`, `PENDING_INVOICE`, `COMPLETED` AND `!isOwner(user)`.
   - Frontend: `UnifiedWorkOrderForm` receives `currentUser`; freezes price/qty fields when `status` is in `['APPROVED', 'IN_PROGRESS', 'PENDING_INVOICE', 'COMPLETED', 'REJECTED', 'CANCELLED']` unless `isOwner`.
   - Frontend: For `PENDING_APPROVAL` state specifically, the form should remain editable (fields enabled) but the submit label could change to "Guardar Cambios de Precios".

2. **Feature 2 (Post-approval notes)**:
   - Add inline editable `description`/`notes` card/section in the WO detail page, visible and editable for all roles with view access when `status >= APPROVED`.
   - Backend PATCH already accepts these fields — no change needed (optionally add a guard to prevent description edits in COMPLETED/CANCELLED if policy requires, but the spec says allow).

3. **Feature 3 (OWNER override)**:
   - `isOwner` bypass in `PATCH /items/[itemId]` — skip freeze guard.
   - `isOwner` bypass in `POST /purchase-orders` — skip "already has PO" check; the regeneration creates a new PO (the old one remains but is superseded).
   - `ComprasTab`: Add "Regenerar OC" button per item (OWNER-only), calling the existing `POST /purchase-orders` endpoint.
   - Workshop-ticket endpoint already allows creating new tickets without blocking (the auto-flow on APPROVED transition checks for existing ticket, but the manual endpoint does not). OWNER-only "Nuevo Ticket" button in `ComprasTab` or `WorkOrderHeader`.

---

## Risks

- **Data integrity on PO regeneration**: If an existing PO is in `APPROVED` or `SENT` state and OWNER regenerates, the system ends up with two active POs for the same item. Need to decide: soft-cancel old PO items before creating new ones, or just warn the user. Not addressed by the spec — should be clarified.
- **UnifiedWorkOrderForm freeze UX**: The form is a full-page editor. Freezing only price/qty while leaving other fields editable (description, closureType) creates an inconsistent partial-edit experience. Consider splitting: freeze the entire form for APPROVED+ states unless OWNER.
- **PUT endpoint status guard inconsistency**: `PUT /api/maintenance/work-orders/[id]` blocks edits when status is `APPROVED`, `PENDING_INVOICE` — but does NOT block `REJECTED` or `CANCELLED`. This means REJECTED WOs can currently be re-edited and re-synced, which may be unintended. Should be audited alongside this change.
- **`description` naming conflict**: The `WorkOrder.description` field is labeled "Notas del Técnico" in `UnifiedWorkOrderForm` (section 4). But Feature 2 says "allow editing the general `description` (notes) field" post-approval. This is the same field. Need to clarify whether the WO-level `notes` field (distinct from `description`) is also in scope or just `description`.
- **Concurrency**: If two OWNER users edit prices simultaneously on a PENDING_APPROVAL WO, the PUT handler does a full item delete+recreate — last-write-wins. Not new risk but worth noting.
- **`billingPrice` field**: `WorkOrderItem.billingPrice` is present in the Prisma schema but not currently surfaced in any UI or update endpoint. The spec mentions only `unitPrice`. Confirm `billingPrice` is out of scope.

---

## Ready for Proposal

Yes. The scope is clear and well-bounded. Three distinct features with clear states, roles, and affected files. The main open question before writing the spec is:

1. **PO regeneration behavior**: cancel old PO vs. create parallel PO?
2. **`description` vs `notes` post-approval**: both fields or only `description`?
3. **UnifiedWorkOrderForm full-freeze vs. partial-freeze**: freeze only price/qty, or the entire "Sincronizar" action when status >= APPROVED?
