# Proposal: multitenant-validation

## Intent
The current B2B SaaS application relies on developer discipline to append `where: { tenantId: user.tenantId }` in every Prisma query to ensure data isolation. While currently correct, this pattern introduces a high risk of human error (IDOR vulnerability) as the application scales. The intent is to implement a robust, foolproof "black-box" multitenant isolation layer at the database client level (Prisma Client Extensions) to automatically scope all queries to the authenticated tenant, and to formalize the Onboarding status transitions.

## Scope

### In Scope
- Implement a Prisma Client Extension (Row Level Security equivalent) to intercept all queries and inject `tenantId`.
- Update `src/lib/prisma.ts` to export a tenant-aware Prisma client factory.
- Refactor existing API routes, Server Actions, and `auth.ts` to consume the new tenant-scoped Prisma client.
- Ensure the Onboarding flow (creation, status update from `PENDING` to `COMPLETED`) appropriately bypasses or integrates with this extension.

### Out of Scope
- Migrating from Prisma to raw SQL or another ORM.
- Changes to the Clerk webhook logic, as it currently functions correctly.
- Implementing Postgres Row-Level Security (RLS) directly in Neon DB (we will handle it at the ORM application layer for now).

## Approach
We will utilize Prisma Client Extensions (`$extends`) to create a middleware that intercepts all model operations (`findMany`, `findFirst`, `update`, `delete`, etc.). The extension will automatically merge `{ tenantId }` into the `where` clause of every Prisma command. 
Instead of exporting a singleton `prisma` instance, we will expose a factory function `getTenantPrisma(tenantId: string)` (or similar) that returns the extended client. Global operations (webhooks, super admin) will still have access to an unscoped base client.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/prisma.ts` | Modified | Add Prisma Client Extension factory. |
| `src/app/api/**/*.ts` | Modified | Replace base `prisma` with `tenantPrisma`. |
| `src/actions/**/*.ts` | Modified | Server Actions update to scoped client. |
| `src/lib/auth.ts` | Modified | Update user lookups. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking cross-tenant background jobs or webhooks | Medium | Keep the base `prisma` unscoped client available specifically for `webhooks` and `cron` jobs. |
| Breaking relations without `tenantId` (e.g. MasterPart) | High | The extension must intelligently only inject `tenantId` into models that actually possess the `tenantId` property in the Prisma schema. |

## Rollback Plan
Revert changes in `src/lib/prisma.ts` to export the standard singleton client, and revert all API route PRs/commits that shifted to the scoped client.

## Dependencies
- Prisma version >= 4.16.0 (Extensions are stable in V5+, and project uses v6.19.2)

## Success Criteria
- [ ] Prisma queries automatically fail or return 0 results if they attempt to access another tenant's data, without explicitly writing `where: { tenantId }` in the API route.
- [ ] All unit, e2e, and integration tests pass.
- [ ] Webhooks continue to function normally.

### Phase 5 Addendum (Review Findings)
Following a Code Review of the onboarding transition:
- Fix potential Foreign Key constraints during JIT user creation.
- Improve error handling UI for Neon DB cold start timeouts and Action failures.
- Remove hardcoded UI values ("COP") for currencies when establishing the new organization profile.
