# Delta for Work Orders — Quick Create

## ADDED Requirements

### Requirement: QuickCreateWorkOrderDialog

The system MUST expose a `QuickCreateWorkOrderDialog` component usable from any context.

The dialog MUST accept optional props: `defaultDate`, `defaultVehicleId`, `alertIds[]`.

The dialog MUST include: vehicle picker (required), title (required), description, scheduled date, modality (INTERNAL/EXTERNAL), priority.

On submit the dialog MUST POST to `/api/maintenance/work-orders` and redirect to the new WO detail page.

The dialog MUST NOT require alertIds to be present — vehicle selection alone is sufficient.

#### Scenario: User creates WO from blank dialog

- GIVEN the dialog opens with no pre-fills
- WHEN the user selects a vehicle, enters a title, and clicks "Crear"
- THEN a POST is made to `/api/maintenance/work-orders`
- AND the user is redirected to `/dashboard/maintenance/work-orders/{newId}`

#### Scenario: Calendar pre-fills date

- GIVEN the dialog opens with `defaultDate = "2026-05-10"`
- WHEN the dialog renders
- THEN the scheduled date field MUST show "2026-05-10" pre-filled
- AND the user MAY change the date before submitting

#### Scenario: Alert flow pre-fills vehicle and alertIds

- GIVEN the dialog opens with `defaultVehicleId` and `alertIds`
- WHEN the dialog renders
- THEN the vehicle picker MUST show the pre-filled vehicle (read-only or locked)
- AND the alertIds MUST be sent in the POST payload

#### Scenario: Submit with no vehicle selected

- GIVEN the dialog is open with no vehicle selected
- WHEN the user clicks "Crear"
- THEN MUST NOT submit the form
- AND MUST display a validation error on the vehicle field

#### Scenario: Submit with no title

- GIVEN the dialog is open with a vehicle selected but no title
- WHEN the user clicks "Crear"
- THEN MUST NOT submit the form
- AND MUST display a validation error on the title field

---

### Requirement: Unified Trigger Points

The system MUST expose the `QuickCreateWorkOrderDialog` from four entry points:

1. Navbar "Nuevo Mantenimiento" button
2. Sidebar shortcut
3. Maintenance alerts page (replaces `CreateWorkOrderModal`)
4. Calendar right-click context menu

Each entry point MUST open the same dialog component.

#### Scenario: Navbar triggers dialog

- GIVEN the user is on any dashboard page
- WHEN the user clicks "Nuevo Mantenimiento" in the Navbar
- THEN the `QuickCreateWorkOrderDialog` MUST open with no pre-fills

#### Scenario: Alert entry preserves current behavior

- GIVEN the user selects alerts and clicks "Crear OT" on the alerts page
- WHEN the dialog opens
- THEN `defaultVehicleId` and `alertIds` MUST be passed from the selected alerts
- AND the WO creation flow MUST behave identically to the current `CreateWorkOrderModal`
