# Technical Design: Package Cloning UI & Seed Data

## Architecture
This feature focuses on accelerating the creation of `MaintenancePackage` records by duplicating an existing package along with all its related `PackageItem` records while allowing the user to modify the `triggerKm` and `name`.

### Endpoints
*   `POST /api/maintenance/mant-package/clone`
    *   **Input**: `sourcePackageId` (string), `newTriggerKm` (number), `newName` (string).
    *   **Output**: The newly created `MaintenancePackage` object.

### Components
*   `ClonePackageModal.tsx`
    *   A generic Dialog component triggered by a "Clone" action on the `MaintenancePackage` list item.
    *   Contains a simple form (Name, Trigger KM).
    *   Utilizes a React Query mutation to call the backend endpoint.

### Database Updates (Seed)
*   `prisma/seed-multitenancy.ts` (or dedicated KB script)
    *   Will be updated to create an initial KB (Knowledge Base) of templates (`isGlobal = true`).
    *   Will generate the Base 10K, SUV 10K, and EV 10K matrices, linking standard items to master parts.

## Data Model (No Schema Changes)
We rely entirely on existing Prisma models:
*   `MaintenancePackage`
*   `PackageItem`
*   `MaintenanceTemplate`
*   `MantItem`
*   `MasterPart`

## Logic & Algorithms
### Package Cloning Algorithm
1.  **Extraction**: Retrieve the source `MaintenancePackage` using `sourcePackageId`, including its `packageItems`.
2.  **Validation**: Verify the user has access to the tenant (if not global). Ensure `newName` does not conflict with an existing package name within the same `templateId` to prevent unique constraint errors (`@@unique([templateId, name])`).
3.  **Creation (Transaction)**:
    *   Create a new `MaintenancePackage` using the same `templateId`, copying relevant static fields (`estimatedCost`, `estimatedTime`, `priority`, `packageType`, `status`, `isPattern`).
    *   Apply `newName` and `newTriggerKm`.
    *   Iterate through the source `packageItems`. For each item, create a new `PackageItem` linked to the newly created `packageId`, copying the `mantItemId`, `priority`, `estimatedTime`, `technicalNotes`, `isOptional`, and `order`. The `triggerKm` for all these new items will be set to `newTriggerKm`.

## Security & Permissions
*   The cloning endpoint must verify the active user's session and tenant authorization before performing any database manipulations.
*   We must ensure users cannot clone packages across different templates they do not own or have access to.

## Error Handling
*   If the source package is not found, return a `404 Not Found`.
*   If the exact name already exists in the template, return a `409 Conflict` urging the user to pick a different name (e.g., "Servicio 20K" instead of "Servicio 10K").
*   Failing transactions will roll back automatically using Prisma's `$transaction` block.
