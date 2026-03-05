# Proposal: Package Cloning UI & Initial Seed Data

## Intent

The purpose of this change is twofold:
1. **Reduce Friction in Maintenance Template Creation:** Operators often need to create repetitive maintenance packages (e.g., 10,000 km, 20,000 km, 30,000 km, etc.) that share identical or highly similar service items. Creating each package from scratch is tedious. A cloning feature at the `MaintenancePackage` level will drastically accelerate this process.
2. **Provide High-Value Initial Data (Seed):** To improve the onboarding experience and the "wow factor" during demonstrations, we need a robust initial Knowledge Base (KB) seed. This seed must include realistic, manufacturer-aligned maintenance plans up to 100,000 km for the most common fleet vehicles (Diesel Pickups, SUVs, and EVs), properly linking `MaintenanceItems` to their corresponding `MasterPart`s.

## Scope

### In Scope
- Create a backend API endpoint (`POST /api/maintenance/mant-package/clone`) to handle the duplication of a `MaintenancePackage` and all its `PackageItem` records within a specific `MaintenanceTemplate`.
- Implement a "Clone Package" UI flow within the template details page, allowing users to define a new `name` and `triggerKm` for the cloned package.
- Update the application's seed script (`prisma/seed-multitenancy.ts` or similar) to inject the structured maintenance templates (Base 10K, SUV 10K, EV 10K), packages up to 100,000 km, and their associated Master Parts based on our prior research.

### Out of Scope
- Modifying the core structure of `MaintenanceTemplate` or `MaintenancePackageItem`.
- Implementing automated OCR extraction for PDFs in this specific PR (that belongs to the `kb-population-vision` change).
- Cloning entire Work Orders (this is strictly for abstract templates).

## Approach

1. **Seed Data (Backend):** We will augment the existing Prisma seed script to include the structured data defined in our research artifacts (`seed-data-structured.md`). This involves creating `MaintenanceTemplate`, `MaintenancePackage`, `MantItem`, and `MasterPart` records systematically.
2. **Cloning Logic (Backend):** A new Next.js API route will be built using Prisma's `$transaction` to ensure atomic cloning. It will extract all properties of the source package, create a new record, and map over its items to duplicate them, assigning the newly provided `triggerKm`.
3. **Cloning UI (Frontend):** We will leverage `shadcn/ui` components (Dialog/Modal) to create a `ClonePackageModal`. This modal will be accessible from each package card/row in the template view. It will rely on React Query / Server Actions to mutate the data and refresh the UI state smoothly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/seed-multitenancy.ts` (or equivalent sync script) | Modified | Injection of the new 100k km vehicle maintenance data. |
| `src/app/api/maintenance/mant-package/clone/route.ts` | New | API endpoint for the cloning transaction. |
| `src/components/maintenance/templates/` | Modified / New | Addition of the cloning modal and integration into the existing package list UI. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Naming overlap when cloning | Medium | Pre-fill the modal with a suggested name (e.g., "Copia de [Original]") and ensure the backend validates the `@@unique([templateId, name])` constraint, returning a clear error if violated. |
| Seed script failure on existing DBs | Low | Ensure the seed logic uses `upsert` or checks for existing records before inserting to avoid duplicate key errors. |

## Rollback Plan

- **API/UI:** Revert the commits introducing the new `route.ts` and UI components. The database schema itself is not changing.
- **Seed Data:** If the seed data proves problematic, we can run a scoped deletion script targeting the specific `isGlobal=true` templates created during the seed process, or reset the local DB using `npx prisma migrate reset` as we are still in development.

## Success Criteria

- [ ] Users can click a "Clone" button on a maintenance package.
- [ ] The modal successfully accepts a new name and a new `triggerKm`.
- [ ] Upon submission, a new package appears in the list containing identical items to the source, but reflecting the new `triggerKm`.
- [ ] The database seed script runs successfully without errors.
- [ ] A fresh database deployment contains realistic maintenance plans up to 100,000 km for Pickups, SUVs, and EVs, complete with Master Parts.
