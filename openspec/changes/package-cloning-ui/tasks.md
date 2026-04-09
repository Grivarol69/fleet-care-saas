# Tasks: Package Cloning UI & Seed Data

## Phase 1: Backend Infrastructure (API)
- [ ] Create `POST /api/maintenance/mant-package/clone/route.ts` endpoint
- [ ] Implement Zod input validation (`sourcePackageId`, `newTriggerKm`, `newName`)
- [ ] Add tenant authorization checks
- [ ] Implement Prisma `$transaction` logic for cloning the `MaintenancePackage` and duplicating its `PackageItem`s
- [ ] Handle unique name constraint errors gracefully (return clear 409 Conflict message)

## Phase 2: Knowledge Base Seed Data
- [ ] Locate the appropriate sync/seed script (e.g., `prisma/seed-multitenancy.ts` or `kb/import`)
- [ ] Add Standard Heavy-Duty Pickups structure (Templates, 10K/20K/40K/100K Packages, Items mapped to MasterParts)
- [ ] Add Compact SUVs structure (Duster Template, 10K/20K/60K Packages, Items mapped to Belts/Filters)
- [ ] Add EV structure (Dongfeng EV Template, 10K/20K/40K/60K Packages, Items mapped to EV Coolant/Gear Oil)
- [ ] Ensure all KB templates are marked as `isGlobal = true`

## Phase 3: Frontend Interface (UI)
- [ ] Create `ClonePackageModal.tsx` component in `src/components/maintenance/templates/`
- [ ] Add a visual "Clone" or "Copy" button to each package card/row in the template view (`src/app/dashboard/maintenance/mant-template/[id]/page.tsx` or its child component)
- [ ] Hook the modal to the `POST` endpoint using `fetch` or React Query
- [ ] Display appropriate success toasts and validation errors (especially for name conflicts)
- [ ] Invalidate router cache / query cache upon successful cloning to update the package list automatically
