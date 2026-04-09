# ID Handling Specification

## Purpose

Define how entity IDs MUST be treated across the entire application after the schema migration from `Int` to `String` (UUID). This spec establishes the foundational contract: all entity IDs are strings and MUST be handled as strings at every layer — TypeScript interfaces, form state, API payloads, and collection types.

## Requirements

### Requirement: UUID IDs as Strings

The system MUST treat all entity ID fields as `string` throughout the UI and API layer. No component, hook, page, or API route MUST coerce an entity ID to a number type.

#### Scenario: API returns entity with UUID ID

- GIVEN a Prisma model has an `id` field of type `String` (UUID)
- WHEN the API route fetches and returns that entity as JSON
- THEN the `id` field MUST be serialized as a JSON string
- AND all consumers of that response MUST store the `id` as a JavaScript `string`

#### Scenario: ID passed between parent and child components

- GIVEN a parent component holds a list of entities fetched from the API
- WHEN the parent passes an entity `id` to a child component as a prop
- THEN the child component prop type MUST declare that `id` as `string`, not `number`
- AND the child MUST NOT apply `parseInt()` or any numeric coercion to that prop

### Requirement: TypeScript Interface ID Field Types

The system MUST declare all entity ID fields in TypeScript interfaces and type aliases as `string`, not `number`.

Affected field names include (but are not limited to): `id`, `alertId`, `vehicleId`, `tenantId`, `programItemId`, `workOrderId`, `supplierId`, `mantItemId`, `providerId`, `workOrderItemId`, `categoryId`, `vehicleBrandId`, `vehicleLineId`, `templateId`.

#### Scenario: Developer reads a TypeScript interface for an entity

- GIVEN a TypeScript interface or type alias for any entity (e.g., `MaintenanceAlert`, `WorkOrderItem`, `InvoiceLineItem`)
- WHEN the developer reads the `id` field declaration
- THEN the type MUST be `string`
- AND `pnpm type-check` MUST NOT report a type error when assigning a UUID string to that field

#### Scenario: Interface with nested entity reference

- GIVEN an interface declares a nested entity object (e.g., `workOrder: { id: number }`)
- WHEN the actual API data contains a UUID string in `workOrder.id`
- THEN the interface MUST be updated to `workOrder: { id: string }`
- AND all usages of the nested `.id` field MUST be compatible with `string`

### Requirement: Collection Key Types for UUID-Keyed Sets and Maps

The system MUST use `string` as the element type for `Set` instances and as the key type for `Map` instances when those collections are keyed by entity IDs.

#### Scenario: Checkbox selection state backed by a Set

- GIVEN a component uses a `Set` to track selected entity IDs (e.g., selected work order items)
- WHEN the entity IDs are UUID strings
- THEN the `Set` MUST be typed `Set<string>`, not `Set<number>`
- AND calling `.has(id)`, `.add(id)`, and `.delete(id)` with a UUID string MUST return the correct result

#### Scenario: Lookup Map keyed by entity ID

- GIVEN a component or hook uses a `Map` for O(1) lookup of entities by ID
- WHEN the entity IDs are UUID strings
- THEN the `Map` MUST be typed `Map<string, T>`, not `Map<number, T>`
- AND `.get(id)` called with a UUID string MUST return the correct entity

### Requirement: Prohibition of parseInt on ID Fields

The system MUST NOT apply `parseInt()` (or `Number()`, or any explicit numeric coercion) to any field that contains or is expected to contain a UUID entity ID.

#### Scenario: parseInt applied to a UUID string

- GIVEN a UUID string such as `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`
- WHEN `parseInt("a1b2c3d4-e5f6-7890-abcd-ef1234567890")` is evaluated
- THEN the result is `NaN`
- AND any downstream system that receives `NaN` as an ID value MUST treat this as a data error — no API endpoint or Prisma query MUST receive `NaN` as an entity ID

#### Scenario: Code review finds parseInt on an ID field

- GIVEN a code reviewer searches for `parseInt` usages in `src/`
- WHEN the argument to `parseInt` is a variable whose name ends in `Id` or is clearly an entity identifier
- THEN that usage MUST be flagged as a bug and removed
- AND the variable MUST be used directly without coercion

### Requirement: State Variables for Selected IDs

The system MUST declare React state variables that hold collections of selected entity IDs as arrays or sets of `string`, not `number`.

#### Scenario: Page-level state for multi-select

- GIVEN a page component manages a `selectedAlertIds` (or similar) state variable
- WHEN the user selects or deselects items via checkboxes
- THEN the state MUST be typed `string[]` or `Set<string>` and MUST contain UUID strings
- AND the toggle function MUST accept a `string` parameter, not `number`
