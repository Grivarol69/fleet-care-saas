# Code Review Report

**Change**: onboarding-bugs
**Date**: 2026-03-04
**Reviewer**: sdd-reviewer (automated)

## Automated Checks

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript (`tsc --noEmit`) | WARNING | 2 errors in `src/lib/auth.ts` (lines 115-116): `organizationMemberships` not in Clerk `User` type, implicit `any` on lambda param. Pre-existing project errors in other files (scripts/, inventory/, internal-tickets/) are unrelated. |
| ESLint | PASS (warnings) | 5 `@typescript-eslint/no-explicit-any` warnings: 2 in `onboarding.ts` (catch blocks), 3 in `auth.ts` (timeout catch, role cast, `requireCurrentUser` return). 0 errors. |

## Code Quality & Bugs

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `src/lib/auth.ts:115` | `clerkUser.organizationMemberships` does not exist on Clerk's `User` type. The Clerk SDK `currentUser()` returns a `User` object that does NOT include `organizationMemberships` — that data is only available via `clerkClient.users.getOrganizationMembershipList()` or the `auth()` helper. The code will return `undefined` at runtime, causing `orgMembership` to be `undefined`, which means `clerkRole` defaults to `'org:admin'` and `orgName` defaults to `'Empresa (Auto-creada)'`. | **CRITICAL** | Use `clerkClient().users.getOrganizationMembershipList({ userId: clerkUser.id })` to fetch memberships, or rely on the `auth()` helper to get the role. Alternatively, accept the fallback behavior and suppress the TS error with a comment explaining why. |
| `src/lib/auth.ts:151` | `role: dbRole as any` — unsafe cast. The `jitRoleMapping` is `Record<string, string>` but Prisma expects `UserRole` enum type. | **WARNING** | Type the mapping as `Record<string, UserRole>` and import `UserRole` from `@prisma/client` (already imported at the top of the webhook file but not in auth.ts). |
| `src/actions/copy-kb-to-tenant.ts` | Server action accepts `tenantId` as a direct parameter without auth check. Any authenticated user could call `copyKnowledgeBaseToTenant('other-tenant-id', ...)` to copy global KB data into another tenant. | **WARNING** | Add `getCurrentUser()` check and verify that `tenantId === user.tenantId` to prevent cross-tenant abuse, or derive tenantId from the session instead of accepting it as a parameter. |
| `src/actions/copy-kb-to-tenant.ts:56` | `options.vehicleMetadata = true` mutates the function parameter object. While functionally correct, it modifies the caller's reference. | **SUGGESTION** | Destructure into local variables: `const vehicleMetadata = options.lineIds.length > 0 ? true : options.vehicleMetadata;` |

## Hallucinations & Logic

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| `clerkUser.organizationMemberships` property does not exist on the `User` type returned by `currentUser()` in `@clerk/nextjs/server`. The JIT role resolution will ALWAYS fall back to `'org:admin'` -> `OWNER`. | **CRITICAL** | The JIT role mapping logic (BUG-5 fix) is effectively dead code at runtime. The full mapping exists but will never be reached because the data source (`organizationMemberships`) is not available. Either fetch memberships via `clerkClient()` API or accept that JIT always creates OWNER (and document this as intentional behavior). |
| Duplicate role mapping: `jitRoleMapping` in `auth.ts:135` and `mapClerkRoleToDbRole` in `webhooks/clerk/route.ts:30` contain identical logic but are defined independently. | **WARNING** | Extract a shared `mapClerkRoleToDbRole` function in a common module (e.g., `src/lib/clerk-utils.ts`) to prevent future divergence. |
| `redirect` import on line 3 of `onboarding.ts` is only used in `updateTenantProfile` (line 80), which is a valid server action. This is correct usage. | N/A | No action needed. |

## Bug-by-Bug Verification

| Bug | Status | Notes |
|-----|--------|-------|
| BUG-1 (redirect in client) | FIXED | `useRouter().push('/dashboard')` correctly used in `OnboardingKBStep.tsx` |
| BUG-2 (silent failure) | FIXED | Error state with retry button implemented. Error message propagated from server action. |
| BUG-3 (Checkbox + register) | FIXED | `Controller` from react-hook-form used with `onCheckedChange`. Correct pattern. |
| BUG-4 (template dependency) | FIXED | `options.lineIds.length > 0` auto-enables `vehicleMetadata` and `maintenanceItems` at line 56. |
| BUG-5 (JIT role mapping) | PARTIALLY FIXED | Full mapping exists but `clerkUser.organizationMemberships` is not available on the Clerk `User` type — see CRITICAL finding above. Role will always default to OWNER. |
| BUG-6 (handleSkip async) | FIXED | `handleSkip` is async, awaits `onSuccess()`, handles error result with `setSkipError`. |
| BUG-7 (status guard) | FIXED | `completeOnboarding` checks `tenant.onboardingStatus !== 'PROFILE_COMPLETED'` before proceeding. |
| BUG-8 (JIT empty country) | FIXED | JIT tenant creation no longer sets `country` or `currency` — schema defaults (`CO`/`COP`) apply. |
| BUG-9 (useEffect double fire) | FIXED | `handleSuccess` wrapped in `useCallback`, `hasCompleted` ref guards against double execution. |
| BUG-10 (getKBCounts auth) | FIXED | `getCurrentUser()` check added. Returns empty data for unauthenticated users. |
| BUG-11 (webhook defaults) | FIXED | Webhook `organization.created` does not set country/currency — schema defaults apply. Aligned with JIT path. |

## CLAUDE.md Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No `class` for services/logic | PASS | All files use exported functions |
| No `enum` (TypeScript) | PASS | Uses Prisma enums only |
| Function components only | PASS | `OnboardingKBStep` and `OnboardingKBForm` are function components with hooks |
| No `React.Component` | PASS | No class components |

## Issues Found

**CRITICAL** (must fix before verify):
1. `clerkUser.organizationMemberships` does not exist on Clerk's `User` type (auth.ts:115). The BUG-5 JIT role mapping is dead code — all JIT users will be created as OWNER. Either fetch memberships via `clerkClient()` or accept and document OWNER-only JIT behavior.

**WARNING** (should fix):
1. `role: dbRole as any` cast in auth.ts:151 — should type as `UserRole` import from `@prisma/client`.
2. `copyKnowledgeBaseToTenant` accepts `tenantId` as parameter without verifying it matches the session user's tenant — potential cross-tenant data injection.
3. Duplicate role mapping logic in auth.ts and webhook route — should be extracted to shared module to prevent divergence.

**SUGGESTION** (nice to have):
1. Avoid mutating `options` parameter in `copy-kb-to-tenant.ts:56` — use local variables instead.
2. The `getKBCounts` auth check returns empty data on failure rather than throwing — this is fine for the UI but means unauthenticated calls silently succeed with zeros. Consider returning an explicit error or `null`.

## Verdict

**PASS WITH WARNINGS**

9 of 11 bugs are correctly fixed. BUG-5 (JIT role mapping) has a critical issue: the Clerk `User` type from `currentUser()` does not expose `organizationMemberships`, making the full role mapping unreachable at runtime. All JIT-created users will default to OWNER role regardless of their Clerk org role. The security warning about `copyKnowledgeBaseToTenant` accepting an unverified `tenantId` parameter should also be addressed before production use.
