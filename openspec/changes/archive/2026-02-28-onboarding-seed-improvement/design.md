# Design: Onboarding Seed Improvement & UI Optimization

## Technical Approach

The changes encompass three isolated but impactful UX areas:
1. **Tenant Seeding**: Instead of re-creating global catalogs inside each tenant's database partition, the `seedTenantData` Server Action will provision a rich set of dummy transactional data (a Vehicle, a Driver, a Provider) using realistic details. Crucially, the dummy vehicle will be immediately linked to one of our global Maintenance Templates (e.g., Toyota Hilux, Chevrolet D-Max, Ford Ranger) so the user experiences a fully functional maintenance program attached out of the box.
2. **UI DataTables Cleanup**: A global replacement across `src/app/dashboard` will strip the raw `id` columns from all `columns: ColumnDef<T>[]` definitions in the React views. The global filtering behavior of `@tanstack/react-table` will be updated to target the most relevant domain-specific text column (e.g., `licensePlate` for vehicles, `name` for people, `description` for items) rather than querying against the hidden UUID.
3. **Onboarding Context Propagation**: The Onboarding wizard in `src/app/onboarding/page.tsx` will leverage the JIT (Just-In-Time) Tenant creation mechanism implemented previously. Since the `tenant` record is now created proactively with the name provided to Clerk, the onboarding UI will read `tenant.name` and visually display it as a confirmed, read-only value (or omit it entirely), removing the redundant input field and simplifying the payload submitted to `updateTenantProfile`.

## Architecture Decisions

### Decision: Purging Global Lookups from seed-tenant.ts

**Choice**: Delete all loops creating `VehicleBrand`, `VehicleType`, and `MantCategory` from `seed-tenant.ts`.
**Alternatives considered**: Keeping them to ensure data exists locally per tenant.
**Rationale**: We previously implemented a Prisma `$extends` callback that implicitly queries `tenantId: null` alongside the User's tenant. Since `prisma/seed.ts` populates a robust, global catalog, running these inserts per-tenant is redundant, wastes database resources, and creates collisions.

### Decision: Eliminating UUID table columns

**Choice**: Remove the `id` accessorKey completely from all DataTables instead of formatting or truncating it.
**Alternatives considered**: Truncating the UUID to the first 8 characters (e.g. `1a2b3c4d...`).
**Rationale**: UUIDs hold zero semantic value for fleet operators. Their presence visually litters the table and consumes vital horizontal screen real estate that is better used for operational metrics or descriptions.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/actions/seed-tenant.ts` | Modify | Wipe global loops. Add queries to fetch a global Brand/Line and a global **Maintenance Template**, then insert 1 `Vehicle`, link it via `VehicleMantProgram`, 1 `Driver`, 1 `Provider`. |
| `src/app/onboarding/page.tsx` | Modify | Read `dbUser.tenant.name`. Remove `<Input id="orgName">` and its state dependency. |
| `src/actions/onboarding.ts` | Modify | Update the `updateTenantProfile` signature to not depend on a manually submitted `orgName`. |
| `src/app/dashboard/**/*.tsx` (Lists) | Modify | Remove `accessorKey: 'id'` from ~20 `ColumnDef` files. Update the `<Input>` search filter target from `id` to the local naming key (e.g., `setFilterValue(..., 'name')`). |

## Interfaces / Contracts

**Action update:**
```typescript
// src/actions/onboarding.ts
export async function updateTenantProfile(
  country: string,
  currency: string
  // orgName parameter removed, as we rely on the DB's existing JIT name.
) { ... }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | `seedTenantData` | Run vitest and confirm `Vehicle`, `Driver` are created in DB. |
| Core | `updateTenantProfile` | Verify that the onboarding status changes to Profile_Completed without requiring the Name parameter. |

## Migration / Rollout

No database migration Required. The schema already supports all operations. This is purely a UI and seeding data optimization.
