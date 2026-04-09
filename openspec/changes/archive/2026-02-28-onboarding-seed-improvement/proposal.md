# Proposal: Onboarding & Seed Improvement

## Intent
The user experience during the creation of a new organization (tenant) and its initial setup is currently suboptimal. The problems to solve are three-fold:
1. **Redundant Seed Logic**: `seed-tenant.ts` is manually creating generic Brands, Types, and Categories for each new tenant. Since our multitenant architecture now supports `isGlobal: true` (Knowledge Base), we should extract these hardcoded definitions, rely on the global Knowledge Base for constants, and repurpose the Tenant Seed to provide actual *Tenant Demo Data* (e.g., a dummy Vehicle, a dummy Driver, a dummy Work Order) to prevent the "empty state" syndrome upon first login.
2. **Ugly UUIDs in UI Tables**: The recent migration from sequential `Int` to `String (UUID)` resulted in massive 36-character identifiers cluttering every `DataTable` across the system. These UUIDs are not human-readable and consume ±50% of the row width. We must hide them from the UI and switch search filters to rely on human-readable fields (`description`, `name`, `licensePlate`, etc.).
3. **Redundant Organization Naming**: The onboarding process currently forces the user to type their Organization Name in the native Clerk `<OrganizationList>` component, and then immediately asks them to type it again in our custom Onboarding Wizard. We need to streamline this by automatically pre-filling and hiding the Name field from our custom step, treating Clerk's input as the single source of truth.

## Scope
### In Scope
- Refactor `src/actions/seed-tenant.ts` to stop duplicating global brands/categories, and instead rely on the global items seeded by `prisma/seed.ts`.
- Remove the `id` column from all `DataTable` definitions in `src/app/dashboard/**/*.tsx`.
- Adjust incremental search inputs in UI tables to filter by prominent strings (like `name` or `description`) instead of `id`.
- Update `src/app/onboarding/page.tsx` to automatically absorb the Orgnanization Name defined in Clerk and hide the text input from the user.

### Out of Scope
- Migrating the Global Knowledge Base entities into tenant-owned records (we will adhere to the RLS Read-Only Global standard established in the previous architecture phase).
- Overhauling the entire UI of all dashboard pages beyond the DataTables.

## Proposed Resolution
1. **Seed Extractor**: Audit `prisma/seed.ts` to ensure it contains all maintenance items, templates, packages, brands, lines, and types. Clean `seed-tenant.ts` from these entities.
2. **UUID Hiding**: Execute a targeted replacement across all `columns` arrays in the `DataTable` components to remove the `accessorKey: 'id'` object.
3. **Clerk UX Sync**: In `onboarding/page.tsx`, obtain the Organization Name securely through `dbUser?.tenant?.name` or the Clerk Session and omit the `<Input id="orgName">` prompt, sending it transparently via a hidden input to the `updateTenantProfile` action.
