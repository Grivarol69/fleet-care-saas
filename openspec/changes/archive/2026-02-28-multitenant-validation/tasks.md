# Tasks: multitenant-validation

## Phase 1: Foundation (Prisma Client Extension)

- [x] 1.1 Create `src/lib/tenant-prisma.ts` that exports `getTenantPrisma(tenantId: string)` using Prisma `$extends`.
- [x] 1.2 Implement the `$allModels.$allOperations` callback in `getTenantPrisma`.
- [x] 1.3 Add logic to skip Prisma models that do NOT have a `tenantId` field (e.g. `MasterPart`).
- [x] 1.4 Add logic to handle `isGlobal: true` models (e.g. `VehicleBrand`, `MantItem`) so queries return Global + Tenant items.
- [x] 1.5 Write unit tests in `src/lib/__tests__/tenant-prisma.test.ts` to verify isolation.

## Phase 2: Refactor Context & API Handlers

- [x] 2.1 Update `src/lib/auth.ts` -> `requireCurrentUser()` to also return the scoped `tenantPrisma` instance alongside the `user` object.
- [x] 2.2 Refactor `src/app/api/maintenance/vehicles/route.ts` to use `tenantPrisma` and remove manual `where: { tenantId }` from GET/POST.
- [x] 2.3 Refactor `src/app/api/maintenance/work-orders/route.ts` to use `tenantPrisma` and remove manual `where: { tenantId }`.
- [x] 2.4 Refactor `src/app/api/maintenance/invoices/route.ts` to use `tenantPrisma` and remove manual `where: { tenantId }`.
- [x] 2.5 Audit all remaining `src/app/api/**/*.ts` files and replace global `prisma` with the scoped client where a tenant context exists.

## Phase 3: Server Actions & Onboarding Integration

- [x] 3.1 Refactor `src/actions/*.ts` (e.g., specific vehicle/WO actions) to use `tenantPrisma`.
- [x] 3.2 Audit `src/actions/onboarding.ts` to ensure it uses the raw global `prisma` client since the tenant is actively being configured / transition from PENDING -> COMPLETED.
- [x] 3.3 Verify Webhooks (`src/app/api/webhooks/clerk/route.ts`) continue to use the global base `prisma` since they operate outside of a specific user request context.

## Phase 4: Testing & Verification

- [x] 4.1 Run `vitest` unit tests to ensure no regressions in auth or db logic.
- [x] 4.2 Run e2e tests (`playwright`) or integration tests for the full Work Order creation flow to guarantee the scoped client resolves foreign keys correctly.
- [x] 4.3 Run the `sdd-verify` unit tests suite to ensure the tenant state completes without Prisma RLS blocking the writes.

## Phase 5: Review Findings (Onboarding)

- [x] 5.1 (CRITICAL) Fix `getCurrentUserInternal` in `src/lib/auth.ts`: check if Tenant exists and create it JIT before creating the JIT User to avoid Foreign Key violations.
- [x] 5.2 (SUGGESTION) Fix database timeout in `src/lib/auth.ts`: Throw a specific error instead of returning `null` on a Neon DB cold start timeout.
- [x] 5.3 (WARNING) Fix UI hardcode in `src/app/onboarding/page.tsx`: Make the "Moneda" (Currency) field dynamic or show "Moneda autodetectada" instead of a hardcoded "COP" value.
- [x] 5.4 (SUGGESTION) Improve error handling in `src/actions/onboarding.ts`: return an object `{ success: false, error: string }` instead of throwing a generic JS Error.
