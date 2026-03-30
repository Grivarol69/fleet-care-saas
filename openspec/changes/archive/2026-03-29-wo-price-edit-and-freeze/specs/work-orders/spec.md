# Delta for Work Orders

## ADDED Requirements

### Requirement: WorkOrderItem Price Freeze by State

The backend MUST reject edits to `unitPrice` and `quantity` on a `WorkOrderItem` when the parent WO status is `APPROVED`, `IN_PROGRESS`, `PENDING_INVOICE`, or `COMPLETED`, unless the requesting user satisfies `canOverrideWorkOrderFreeze()`.

The frontend MUST render `unitPrice` and `quantity` fields as read-only in `UnifiedWorkOrderForm` when WO status is in the frozen set, unless `canOverrideWorkOrderFreeze()` is true for the current user.

The item-level `description` field follows the same freeze rule as `unitPrice`/`quantity`.

#### Scenario: MANAGER edits price on PENDING_APPROVAL WO (allowed)

- GIVEN a WO is in state `PENDING_APPROVAL`
- AND the user is MANAGER
- WHEN the user edits `unitPrice` or `quantity` on a `WorkOrderItem` and submits
- THEN the backend MUST accept the change and persist the new values
- AND the frontend MUST render the fields as editable

#### Scenario: MANAGER edits price on APPROVED WO (blocked)

- GIVEN a WO is in state `APPROVED`
- AND the user is MANAGER
- WHEN the user calls `PATCH /api/maintenance/work-orders/[id]/items/[itemId]` with `unitPrice` or `quantity`
- THEN the backend MUST return HTTP 403
- AND the frontend MUST render those fields as disabled inputs

#### Scenario: Frontend freeze applies to IN_PROGRESS, PENDING_INVOICE, COMPLETED

- GIVEN a WO is in state `IN_PROGRESS`
- AND the user is TECHNICIAN
- WHEN `UnifiedWorkOrderForm` renders
- THEN `unitPrice`, `quantity`, and item `description` inputs MUST be `disabled`

---

### Requirement: Inline Post-Approval WO Description Editing

The WO detail view MUST expose an inline editable field for `WorkOrder.description` to all users with WO view access when WO status is `APPROVED` or any later non-terminal/terminal state.

The field MUST be labeled consistently as "Notas / Observaciones" across the form and the detail view.

On save the UI MUST call `PATCH /api/maintenance/work-orders/[id]` with `{ description: newValue }`.

The backend `PATCH` handler MUST continue to accept `description` updates regardless of WO state.

`WorkOrder.notes` is out of scope and MUST NOT be surfaced in this change.

#### Scenario: Any role edits WO description post-approval

- GIVEN a WO is in state `APPROVED`
- AND the user has WO view access (any role except DRIVER)
- WHEN the user clicks the inline edit icon next to "Notas / Observaciones"
- THEN the field MUST become an editable input
- AND on confirm the value is persisted via `PATCH`
- AND the field returns to read-only display with updated text

#### Scenario: Description editable in COMPLETED state

- GIVEN a WO is in state `COMPLETED`
- WHEN the user opens the WO detail
- THEN the "Notas / Observaciones" inline edit control MUST be present and functional

#### Scenario: Description NOT affected by item freeze

- GIVEN a WO is in state `IN_PROGRESS`
- AND `unitPrice` fields are disabled
- WHEN the user edits "Notas / Observaciones"
- THEN the edit MUST succeed regardless of the item freeze state

---

### Requirement: OWNER Bypass of Item Price Freeze

An OWNER MUST be able to edit `unitPrice`, `quantity`, and `description` on any `WorkOrderItem` in any WO state.

The backend `PATCH /items/[itemId]` MUST skip the state-freeze guard when `canOverrideWorkOrderFreeze(user)` returns true.

The frontend MUST render all item fields as editable for OWNER users regardless of WO status.

#### Scenario: OWNER edits price on IN_PROGRESS WO

- GIVEN a WO is in state `IN_PROGRESS`
- AND the user is OWNER
- WHEN the user edits `unitPrice` on a `WorkOrderItem` and submits
- THEN the backend MUST accept the change and return HTTP 200
- AND the frontend MUST render the field as editable (not disabled)

---

### Requirement: OWNER PO Regeneration

When an OWNER triggers PO regeneration for an item group, the system MUST:

1. Cancel (set status `CANCELLED`) all existing POs for that WO that are in `DRAFT` or `PENDING_APPROVAL` state.
2. Create a new PO via the existing `POST /api/maintenance/work-orders/[id]/purchase-orders` endpoint.

The UI MUST present a confirmation dialog listing the POs that will be cancelled before proceeding.

The `POST /purchase-orders` endpoint MUST skip its existing "item already has PO" guard when `canOverrideWorkOrderFreeze(user)` is true.

`WorkOrderItem.billingPrice` is out of scope and MUST NOT be modified.

#### Scenario: OWNER regenerates PO for item with existing DRAFT PO

- GIVEN a WO is in state `APPROVED`
- AND an item group has an existing PO in state `DRAFT`
- AND the user is OWNER
- WHEN the user clicks "Regenerar OC" and confirms the cancellation dialog
- THEN the existing PO MUST be set to status `CANCELLED`
- AND a new PO MUST be created with the updated item prices
- AND the UI MUST reflect the new PO number on the item

#### Scenario: OWNER regeneration blocked for POs in non-cancellable states

- GIVEN an existing PO for the item is in state `APPROVED` or `SENT`
- WHEN the OWNER opens the "Regenerar OC" confirmation dialog
- THEN the dialog MUST display a warning listing POs that cannot be auto-cancelled
- AND the user MUST still be able to proceed (create new PO alongside the existing one)

#### Scenario: Non-OWNER cannot access Regenerar OC

- GIVEN a WO is in state `APPROVED`
- AND the user is MANAGER
- WHEN the user views the "Compras & Costos" tab
- THEN the "Regenerar OC" button MUST NOT be visible

---

## MODIFIED Requirements

### Requirement: Tab "Compras & Costos" — OWNER Actions

(Previously: No per-item OWNER actions existed in this tab.)

The "Compras & Costos" tab MUST show a "Regenerar OC" action per item group, visible exclusively to users where `canOverrideWorkOrderFreeze()` is true.

#### Scenario: OWNER sees Regenerar OC per item

- GIVEN the user is OWNER
- AND the WO has at least one item with a linked PO
- WHEN the user opens the "Compras & Costos" tab
- THEN each item group with a PO MUST display a "Regenerar OC" button
- AND items without a PO MUST show the standard "Generar OC" action
