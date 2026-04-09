# Feature Spec: Package Cloning

## Overview
This feature allows an admin or a user managing a `MaintenanceTemplate` to clone an existing `MaintenancePackage` within that template. This copies the package's attributes and its associated `PackageItem`s, requiring the user to only provide a new name and a new trigger kilometer distance (`triggerKm`).

## Actors
- **Admin / Template Manager**: A user with permissions to edit the specified `MaintenanceTemplate`.

## Preconditions
- A `MaintenanceTemplate` exists.
- The `MaintenanceTemplate` has at least one `MaintenancePackage` populated with one or more `PackageItem`s.
- The user has appropriate access rights to modify the given template (tenant matching or global admin).

## Trigger
The user clicks a "Clone" button or icon located on the `MaintenancePackage` item within the template's detail view UI.

## Main Success Scenario
1.  **User Initiates Clone**: The user clicks the "Clone" button on the UI representation of a `MaintenancePackage`.
2.  **System Prompts for Details**: The system opens a modal (`ClonePackageModal`) requesting two pieces of information:
    *   **Name**: Pre-filled with "Copia de [Original Package Name]" (e.g., "Copia de Mantenimiento 10.000 km"). The user can edit this text.
    *   **Trigger KMs**: An empty numeric field for the user to specify at what kilometer distance this new package should be triggered (e.g., 30000).
3.  **User Submits Form**: The user enters a new, unique name (e.g., "Mantenimiento 30.000 km") and the desired target kilometer mark, then clicks "Clonar Paquete".
4.  **System Validates Input**:
    *   The `triggerKm` is a valid positive integer.
    *   The provided `name` evaluates to be unique within the context of the current `MaintenanceTemplate` (to pass the `@@unique([templateId, name])` PRISMA constraint).
5.  **System Processes Request**:
    *   A new `MaintenancePackage` is generated, inheriting specific attributes from the source package (`estimatedCost`, `estimatedTime`, `priority`, `packageType`, `status`, `isPattern`).
    *   The new `name` and `triggerKm` supplied via the modal form are applied to this new package.
    *   All `PackageItem`s that belonged to the source package are duplicated and linked to the new package, preserving their `mantItemId`, `priority`, `estimatedTime`, `technicalNotes`, `isOptional`, and `order`. The new `triggerKm` overrides the item's previous distance marker.
6.  **System Confirms Creation**: The system closes the modal, triggers a success toast notification ("Paquete clonado exitosamente"), and refreshes the template view to explicitly display the newly created package with its items listed.

## Alternative Scenarios

### 4a. Name Conflict Validation Failure
1.  The user inputs a name that already exists for another package active within the same `MaintenanceTemplate`.
2.  The backend API returns a `409 Conflict` (or equivalent validation error) rejecting the request.
3.  The UI displays an inline error message within the modal indicating: "Ya existe un paquete con ese nombre en este plan. Elija un nombre diferente."
4.  The user is permitted to correct the initial input and attempt submission again.

### 4b. Invalid Trigger KM Failure
1.  The user submits a negative number for the `triggerKm` field.
2.  The UI (via Zod validation) prevents submission and highlights the offending input with an error message: "El kilometraje debe ser mayor o igual a 0."
3.  The user corrects the data and resubmits.

## Success Criteria
- [ ] The `POST /api/maintenance/mant-package/clone` endpoint is functional, secure, and transactional.
- [ ] Users can interact with a user-friendly modal to execute the cloning action.
- [ ] A cloned package appears correctly in the dashboard list, exhibiting the new name, the new trigger KM, and precisely the same internal item arrangement as the selected source package.
