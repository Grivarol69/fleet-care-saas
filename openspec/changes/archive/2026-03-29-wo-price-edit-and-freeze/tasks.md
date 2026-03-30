# Tasks: WO Price Edit and Freeze

## Phase 1: Foundation

- [x] 1.1 `src/lib/permissions.ts`: add `canOverrideWorkOrderFreeze(user: User | null): boolean` using `isSuperAdmin(user) || isOwner(user)` in the WORK ORDER LIFECYCLE PERMISSIONS section

## Phase 2: Backend Guards

- [x] 2.1 `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts`: add `status: true` to the `workOrder` select in the existing item query (no extra DB round-trip)
- [x] 2.2 Same file: add `description: z.string().optional()` to `updateItemSchema` Zod schema
- [x] 2.3 Same file: after the existing item ownership check, add freeze guard — if `wo.status` is in `FROZEN_WO_STATUSES` (`APPROVED`, `IN_PROGRESS`, `PENDING_INVOICE`, `COMPLETED`) AND the body contains `unitPrice`, `quantity`, or `description` AND `!canOverrideWorkOrderFreeze(user)` → return HTTP 403 `{ error: 'No se pueden modificar precios en una OT aprobada o posterior' }`
- [x] 2.4 `src/app/api/maintenance/work-orders/[id]/route.ts` (PUT handler): wrap the existing status guard at line ~856 with `if (!canOverrideWorkOrderFreeze(user)) { ... }` so OWNER can PUT in any WO state
- [x] 2.5 `src/app/api/maintenance/work-orders/[id]/purchase-orders/route.ts`: import `canOverrideWorkOrderFreeze`; compute `const isOverride = canOverrideWorkOrderFreeze(user)`; replace the "already has PO" for-loop guard with: skip the guard for OWNER, and before creating the new PO run `tenantPrisma.purchaseOrder.updateMany({ where: { workOrderId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } }, data: { status: 'CANCELLED' } })` (outside the per-provider transaction)

## Phase 3: Frontend

- [x] 3.1 `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx`: add `currentUser?: { id: string; role: string; isSuperAdmin: boolean } | null` prop
- [x] 3.2 Same file: define `FROZEN_WO_STATUSES` constant (APPROVED, IN_PROGRESS, PENDING_INVOICE, COMPLETED, REJECTED, CANCELLED); compute `isFrozen` from `initialData.status` + `canOverrideWorkOrderFreeze(currentUser as any)`
- [x] 3.3 Same file: disable `unitPrice`, `quantity`, and item `description` inputs when `isFrozen`; disable the "Sincronizar Cambios" submit button when `isFrozen`
- [x] 3.4 Same file: relabel item description field from "Notas del Técnico" to "Notas / Observaciones" for label consistency
- [x] 3.5 `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`: pass `currentUser={currentUser}` to `<UnifiedWorkOrderForm>` (1-line change)
- [x] 3.6 `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx`: add `description: string | null` to the `WorkOrderForHeader` type
- [x] 3.7 Same file: add `EDITABLE_DESCRIPTION_STATUSES` set (APPROVED, IN_PROGRESS, PENDING_INVOICE, COMPLETED); add inline edit widget (pencil icon → textarea → save/cancel) that calls `PATCH /api/maintenance/work-orders/[id]` with `{ description }` and reverts to read-only on success or shows a toast on failure; show only when status is in `EDITABLE_DESCRIPTION_STATUSES`
- [x] 3.8 `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab.tsx`: import `canOverrideWorkOrderFreeze`; compute `isOverride`; derive `poLinkedExternalItems` (EXTERNAL/INTERNAL_PURCHASE items with existing PO, status != CANCELLED)
- [x] 3.9 Same file: when `isOverride`, render `poLinkedExternalItems` in the "Ítems Pendientes de Compra" card with a Badge showing the linked PO number and a "Regenerar OC" action button per item
- [x] 3.10 Same file: implement "Regenerar OC" `AlertDialog` — lists cancellable POs (DRAFT/PENDING_APPROVAL) and warns about non-cancellable POs (APPROVED/SENT); on confirm calls `POST /api/maintenance/work-orders/[id]/purchase-orders` with `{ itemIds: [item.id] }` then calls `onRefresh()`

## Phase 4: Verification

- [ ] 4.1 Verify spec scenario: MANAGER + PENDING_APPROVAL WO → PATCH `unitPrice` → backend returns 200
- [ ] 4.2 Verify spec scenario: MANAGER + APPROVED WO → PATCH `unitPrice` → backend returns 403
- [ ] 4.3 Verify spec scenario: OWNER + IN_PROGRESS WO → PATCH `unitPrice` → backend returns 200
- [ ] 4.4 Verify spec scenario: OWNER + APPROVED WO with DRAFT PO → "Regenerar OC" → old PO status becomes CANCELLED, new PO created as DRAFT
- [ ] 4.5 Verify spec scenario: APPROVED WO → any non-DRIVER user clicks inline pencil on "Notas / Observaciones" → PATCH succeeds, field reverts to read-only with new value
- [ ] 4.6 Verify spec scenario: MANAGER views ComprasTab on APPROVED WO → "Regenerar OC" button is NOT visible
- [ ] 4.7 Run `pnpm type-check` — zero TS errors ✅
