# Forms and UI Specification

## Purpose

Define how form components MUST handle entity IDs when collecting user input and submitting payloads. After the UUID migration, form schemas already use `z.string()` for ID fields, but several components apply `parseInt()` inside `onValueChange` callbacks or `onSubmit` handlers — converting valid UUID strings to `NaN` before sending them. This spec covers correct ID handling at the form and UI component boundary.

## Requirements

### Requirement: Form Payloads MUST Contain String IDs

Form submit handlers MUST pass entity ID fields as strings in the payload sent to the API or server action. No submit handler MUST apply `parseInt()` or numeric coercion to a field that contains a UUID.

#### Scenario: User selects a maintenance template in FormAssignProgram

- GIVEN the user navigates to the vehicle program assignment page
- WHEN the user opens the template `<Select>` and chooses a template
- THEN the `templateId` field in the form state MUST retain the UUID string value (e.g., `"a1b2c3d4-..."`)
- AND the form submit payload MUST include `templateId: "a1b2c3d4-..."` as a string
- AND Prisma MUST receive the correct UUID, not `NaN`

#### Scenario: FormAssignProgramImproved onValueChange with parseInt removed

- GIVEN `<Select onValueChange={value => field.onChange(parseInt(value))}>`
- WHEN the user selects a template whose `id` is a UUID string
- THEN `parseInt(value)` evaluates to `NaN`
- AND the field value becomes `NaN`, breaking the form
- THEREFORE the `parseInt()` call MUST be removed so that `field.onChange(value)` is called directly

#### Scenario: User creates a work order item in AddItemDialog

- GIVEN the user opens AddItemDialog in the Work Order detail view
- WHEN the user selects a maintenance item and optionally a provider, then submits
- THEN the payload sent to `POST /api/maintenance/work-orders/[id]/items` MUST include `mantItemId` as a UUID string
- AND if a provider is selected, the payload MUST include `providerId` as a UUID string
- AND neither field MUST be coerced with `parseInt()` before submission

#### Scenario: User creates an invoice linked to a work order

- GIVEN the user navigates to `/dashboard/invoices/new`
- WHEN the user selects a supplier and links a work order, then submits the form
- THEN the payload sent to `POST /api/invoices` MUST include `supplierId` as a UUID string
- AND the payload MUST include `workOrderId` as a UUID string if a work order was linked
- AND neither value MUST be wrapped in `parseInt()` before submission

#### Scenario: User creates an inventory purchase with a supplier

- GIVEN the user navigates to `/dashboard/inventory/purchases/new`
- WHEN the user selects a supplier from the dropdown and submits the form
- THEN the payload sent to the API MUST include `supplierId` as a UUID string
- AND `parseInt(supplierId)` MUST NOT be applied anywhere in the submit handler

#### Scenario: Technician selects a provider in PartsTab for purchase order generation

- GIVEN the user opens the Parts tab of a Work Order detail
- WHEN the user selects a provider from the provider selector and triggers PO generation
- THEN the payload MUST include `providerId` as a UUID string
- AND the PO MUST be created with the correct provider reference in the database

### Requirement: Select Components MUST Pass ID Values as Strings

`<Select>` components that render entity options MUST pass the entity `id` value as a string to `onValueChange`. Calling `.toString()` on a UUID string is redundant but not a bug. Calling `parseInt()` on a UUID string is always a bug.

#### Scenario: Select renders vehicle options

- GIVEN a `<Select>` renders vehicle options using `vehicle.id` as the `value` attribute
- WHEN the user selects a vehicle
- THEN `onValueChange` receives a `string`
- AND the handler MUST store that string directly in form state or component state without coercion

#### Scenario: Redundant toString on already-string UUID

- GIVEN code calls `vehicle.id.toString()` or `template.id.toString()` where `id` is already a `string`
- WHEN TypeScript sees this
- THEN there is no type error (string.toString() is valid)
- AND the call is redundant and SHOULD be removed for clarity
- AND its removal MUST NOT change runtime behavior

### Requirement: Checkbox Toggle Handlers MUST Accept String IDs

Components that render checkboxes for entity selection MUST define toggle handlers that accept and propagate `string` IDs, not `number`.

#### Scenario: Manager views alerts and toggles checkboxes

- GIVEN the alerts list is rendered with one row per `MaintenanceAlert`
- WHEN the manager clicks the checkbox for an alert with `id: "uuid-string"`
- THEN `handleToggleAlert("uuid-string")` MUST be called with the UUID string
- AND the parent's `selectedAlertIds: string[]` state MUST be updated to include or exclude that UUID string
- AND the checkbox MUST reflect the correct checked/unchecked state on re-render

#### Scenario: All-select checkbox in alerts table

- GIVEN the alerts table renders a header checkbox to select all visible alerts
- WHEN the manager clicks the header checkbox
- THEN all visible alert UUIDs MUST be added to `selectedAlertIds` as strings
- AND each individual checkbox MUST appear checked

### Requirement: CreateWorkOrderModal MUST Submit String IDs for Technician and Provider

The Create Work Order modal (launched from the Alerts module) MUST collect technician and provider selections as UUID strings and submit them directly without parseInt coercion.

#### Scenario: Manager creates WO from alert — technician and provider selected

- GIVEN the manager opens CreateWorkOrderModal with one or more alerts selected
- WHEN the manager selects a technician and a provider from the respective dropdowns and submits
- THEN the payload sent to the work order creation API MUST include `technicianId` as a UUID string
- AND the payload MUST include `providerId` as a UUID string
- AND the work order MUST be created successfully in the database with the correct foreign key references

#### Scenario: Manager creates WO from alert — no provider selected

- GIVEN the manager opens CreateWorkOrderModal
- WHEN the manager selects a technician but leaves provider empty, then submits
- THEN the payload MUST include `technicianId` as a UUID string
- AND `providerId` MUST be absent or `null` in the payload — not `NaN`

### Requirement: workOrderItemId Interface Field MUST Be String

TypeScript interfaces in the invoice new page and work order modules that declare a `workOrderItemId` field MUST type it as `string`, not `number`.

#### Scenario: Invoice line item interface usage

- GIVEN an interface declares `workOrderItemId?: number`
- WHEN the invoice new page reads a work order item's `id` (which is a UUID string) and assigns it to `workOrderItemId`
- THEN TypeScript MUST report a type error (number vs string mismatch)
- THEREFORE the interface MUST be updated to `workOrderItemId?: string`
- AND after the fix, the assignment MUST succeed without type errors

#### Scenario: PartsTab workOrderItemId in Set/Map

- GIVEN `PartsTab` uses `workOrderItemId` as a key in a `Set<number>` or `Map<number, ...>`
- WHEN the actual `workOrderItemId` values are UUID strings
- THEN `.has(workOrderItemId)` returns `false` even for present items (type mismatch at key lookup)
- THEREFORE the collection types MUST be changed to `Set<string>` / `Map<string, ...>`
- AND after the fix, selection state MUST correctly reflect which items are selected
