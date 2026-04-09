# Proposal: Serialized Asset Tracking

## Intent

Companies need to track individual physical units (tires, fire extinguishers, safety equipment) that arrive via bulk purchases. The current `Tire` model is domain-specific and cannot generalize. This change replaces it with a generic `SerializedItem` system that handles any type of serialized asset — with full purchase traceability, lifecycle events, vehicle assignments, and batch/lot recall capability.

## Scope

### In Scope

- Replace `Tire`, `TireEvent`, `VehicleTire`, `TireAlert` with generic equivalents
- New Prisma models: `SerializedItem`, `SerializedItemEvent`, `VehicleItemAssignment`, `SerializedItemAlert`
- Post-purchase serialization flow: enter N serial numbers from an `InvoiceItem`
- Vehicle assignment UI with optional position field (e.g., FL/FR/RL for tires)
- Lifecycle event recording per serial (ALTA, REVISION, ROTACION, BAJA + extensible types)
- Batch/lot number field on `SerializedItem` for recall queries
- Generalize `src/lib/services/tire-alert.ts` → `serialized-item-alert.ts`
- Update permissions: `canViewTires` → `canViewSerializedAssets`
- Drop the 3 existing tire-specific Prisma migrations and replace with clean migration
- Update sidebar, API routes, dashboard pages

### Out of Scope

- Changes to the Invoice/InvoiceItem purchase flow itself
- `MasterPart.specifications` UI exposure (already in schema — deferred to a separate UI task)
- Barcode/QR scanning integration
- Reporting/analytics dashboard for asset lifecycle

## Approach

1. **Schema migration**: Create new generic models. Use `type: String` discriminator + `specs: Json?` for type-specific attributes. Link `SerializedItem.invoiceItemId → InvoiceItem` for purchase traceability.
2. **Drop tire-specific migrations**: Remove the 3 uncommitted tire migrations and write one clean `add_serialized_assets` migration.
3. **API layer**: Rename/rewrite `src/app/api/tires/` → `src/app/api/serialized-assets/` with endpoints for CRUD, event recording, vehicle assignment, and batch lookup.
4. **UI layer**: Rename `src/app/dashboard/tires/` to `src/app/dashboard/assets/`. Adapt the existing axle diagram component to accept generic `position` labels.
5. **Constants and services**: Replace `tire-constants.ts` with `serialized-asset-constants.ts`. Generalize the alert service.

## Affected Areas

| Area                                                        | Impact        | Description                                                     |
| ----------------------------------------------------------- | ------------- | --------------------------------------------------------------- |
| `prisma/schema.prisma`                                      | Modified      | Remove Tire/TireEvent/VehicleTire/TireAlert; add 4 new models   |
| `prisma/migrations/`                                        | Removed + New | Drop 3 tire migrations; add 1 clean serialized-assets migration |
| `src/app/api/tires/`                                        | Removed       | Replaced by `src/app/api/serialized-assets/`                    |
| `src/app/api/vehicles/[id]/`                                | Modified      | Update vehicle assignment endpoints                             |
| `src/app/dashboard/tires/`                                  | Removed       | Replaced by `src/app/dashboard/assets/`                         |
| `src/lib/tire-constants.ts`                                 | Removed       | Replaced by `src/lib/serialized-asset-constants.ts`             |
| `src/lib/services/tire-alert.ts`                            | Modified      | Generalized to handle any asset type                            |
| `src/lib/permissions.ts`                                    | Modified      | `canViewTires` → `canViewSerializedAssets`                      |
| `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts` | Modified      | Route update                                                    |
| `prisma/seed.ts` + `seed-multitenancy.ts`                   | Modified      | Remove tire seeds, add serialized asset demo data               |

## Risks

| Risk                                                        | Likelihood | Mitigation                                                                                |
| ----------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| Data loss if any tenant has live Tire records               | Med        | Audit before migration; write data-migration script if needed                             |
| `eventType: String` lacks compile-time validation           | Low        | Define allowed types as `const` in `serialized-asset-constants.ts`; validate in API layer |
| UI regression on axle diagram component                     | Low        | Component accepts `position: string` — backward compatible                                |
| Breaking the 3 uncommitted tire migrations causes CI issues | Low        | Migrations are not yet deployed; safe to drop and replace                                 |

## Rollback Plan

The 3 tire migrations are not yet deployed to production. To roll back:

1. Restore `prisma/schema.prisma` from git history (pre-tire-tracking branch state)
2. Delete the `add_serialized_assets` migration
3. Restore `src/app/api/tires/` and `src/app/dashboard/tires/` from git

If already deployed: write a down-migration that drops the new tables and restores the old ones from a pre-migration DB snapshot.

## Dependencies

- `InvoiceItem` model must exist (already present via `inventory-stock` change)
- No external service dependencies

## Success Criteria

- [ ] `SerializedItem`, `SerializedItemEvent`, `VehicleItemAssignment`, `SerializedItemAlert` exist in schema; old tire models removed
- [ ] Post-purchase: creating an InvoiceItem with quantity=N lets user enter N serial numbers
- [ ] Each `SerializedItem` carries `invoiceItemId` and optional `batchNumber`
- [ ] A serialized item can be assigned to a vehicle with optional `position`
- [ ] Lifecycle events can be recorded per item; event types are not hard-coded enums
- [ ] Alert service runs without referencing removed Tire models
- [ ] `pnpm type-check` passes with zero errors
- [ ] `pnpm build` succeeds
