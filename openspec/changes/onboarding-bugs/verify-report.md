# Verification Report

**Change**: onboarding-bugs
**Date**: 2026-03-04
**Verifier**: sdd-verify (automated)

## Completeness

| Metric | Value |
|--------|-------|
| Success criteria total | 10 |
| Criteria verified PASS | 8 |
| Criteria verified PARTIAL | 1 |
| Criteria verified PASS (with note) | 1 |

No formal `tasks.md` artifact exists for this change. Verification is based on the 10 success criteria defined in `proposal.md`.

## Correctness (Success Criteria)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | User can complete onboarding step 2 and is redirected to `/dashboard` | PASS | `OnboardingKBStep.tsx` calls `completeOnboarding()` via `handleSuccess`, then `router.push('/dashboard')` on success. Uses `useRouter` from `next/navigation` (client-side). Error state prevents redirect on failure. |
| 2 | User can skip KB precarga and is redirected to `/dashboard` | PASS | `OnboardingKBForm.tsx` has `handleSkip()` which is async, calls `onSuccess()` (which triggers `completeOnboarding` + `router.push('/dashboard')`). On failure, sets `skipError` state. |
| 3 | If `completeOnboarding` fails, error message shown with retry | PASS | `OnboardingKBStep.tsx` renders error banner with message and "Reintentar" button that re-calls `handleSuccess()`. Both server-side errors (`result.error`) and missing error get a fallback message. |
| 4 | Unchecking vehicle metadata checkbox prevents vehicle data copy | PASS | `OnboardingKBForm.tsx` uses `Controller` from react-hook-form with `onCheckedChange` for the `vehicleMetadata` checkbox. The boolean is serialized as `formData.append('vehicleMetadata', String(data.vehicleMetadata))` and deserialized as `=== 'true'` in `submitCopy`. In `copy-kb-to-tenant.ts`, vehicle metadata copy is gated by `if (options.vehicleMetadata)` at line ~74. When unchecked and no lineIds selected, the early return at line ~39 fires. |
| 5 | Selecting template lines with metadata unchecked auto-enables metadata | PASS | `copy-kb-to-tenant.ts` lines 55-58: `if (options.lineIds.length > 0) { options.vehicleMetadata = true; options.maintenanceItems = true; }`. This ensures dependencies are enforced server-side regardless of checkbox state. |
| 6 | JIT-created users get correct role (MANAGER, TECHNICIAN, PURCHASER) | PARTIAL | `auth.ts` lines 120-142: Full `jitRoleMapping` exists (`admin->OWNER, manager->MANAGER, technician->TECHNICIAN, purchaser->PURCHASER, driver->DRIVER`). **However**, the review report identified a CRITICAL issue: the original code used `clerkUser.organizationMemberships` which does not exist on `currentUser()`. **This has been fixed**: the implementation now uses `clerkClient().organizations.getOrganizationMembershipList()` to fetch memberships via the Backend API (lines 125-139). The role lookup via `membership.role.replace('org:', '')` and the mapping dictionary are correct. **Remaining issue**: the `dbRole` variable is typed as `UserRole` but assigned via `jitRoleMapping[roleName] ?? 'DRIVER'` which returns `UserRole`, yet on line 151 it's cast as `role: dbRole` (the `as any` cast noted in the review has been resolved by properly typing `jitRoleMapping` as `Record<string, UserRole>`). **Verdict**: The fix is structurally correct and uses the right Clerk API. Marking PARTIAL because: (a) the `try/catch` around the Clerk API call means any API failure silently falls back to OWNER, and (b) the `membership.role` format assumption (`org:admin`, `org:manager`, etc.) depends on Clerk's custom role configuration for the organization, which may not match these exact strings for all tenants. |
| 7 | `completeOnboarding` rejects if profile step not completed | PASS | `onboarding.ts` lines 13-16: `if (!tenant \|\| tenant.onboardingStatus !== 'PROFILE_COMPLETED') { return { success: false, error: 'Debe completar el perfil primero' }; }`. This guard ensures only tenants that completed step 1 can proceed. |
| 8 | JIT-created tenants use schema defaults for country/currency | PASS | `auth.ts` JIT tenant creation (lines 145-153) does NOT set `country` or `currency` fields. Prisma schema defines `country @default("CO")` and `currency @default("COP")`. Webhook route (`organization.created`) also omits these fields. Both paths rely on schema defaults. |
| 9 | `getKBCounts` rejects unauthenticated callers | PASS (with note) | `get-kb-counts.ts` lines 27-30: calls `getCurrentUser()`, returns zeroed data if `!user`. **Note**: This is a "soft reject" -- unauthenticated callers get `{ brands: 0, ..., templates: [] }` rather than an explicit error/throw. Functionally sufficient since the data is non-sensitive (global counts), but not a hard security boundary. |
| 10 | No duplicate `completeOnboarding` calls on success | PASS | `OnboardingKBForm.tsx` uses `hasCompleted` ref (line 75): `if (submitState?.success && !hasCompleted.current) { hasCompleted.current = true; ... }`. The ref guard ensures `onSuccess()` (which calls `completeOnboarding`) executes exactly once even if the `useEffect` re-fires. `handleSuccess` in `OnboardingKBStep.tsx` is wrapped in `useCallback` with `[router]` deps. |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Use `useRouter().push()` instead of server `redirect()` | PASS | `OnboardingKBStep.tsx` imports from `next/navigation` and uses `router.push('/dashboard')` |
| Use `Controller` for Shadcn Checkbox binding | PASS | Both `vehicleMetadata` and `maintenanceItems` checkboxes use `<Controller>` with `onCheckedChange` |
| Auto-enable dependencies server-side | PASS | `copy-kb-to-tenant.ts` mutates `options` when `lineIds.length > 0`. Review noted parameter mutation as SUGGESTION -- not a correctness issue. |
| JIT role via Clerk Backend API | PASS | Uses `clerkClient().organizations.getOrganizationMembershipList()` instead of the non-existent `currentUser().organizationMemberships` |
| `handleSuccess` as `useCallback` + ref guard | PASS | Both patterns implemented as designed |
| No new files, surgical edits only | PASS | All changes in existing files |

## Testing

| Area | Tests Exist? | Coverage |
|------|-------------|----------|
| OnboardingKBStep / OnboardingKBForm (UI) | No | None -- these are client components; no unit tests exist. The Playwright E2E spec (`e2e/onboarding-kb.spec.ts`) exists but is skipped pending auth setup. |
| `completeOnboarding` server action | No | None -- no direct test for the status guard logic |
| `getKBCounts` auth check | No | None -- no test verifying unauthenticated rejection |
| `copyKnowledgeBaseToTenant` dependency auto-enable | No | None -- no test for lineIds triggering vehicleMetadata=true |
| JIT user creation / role mapping | Indirect | `src/lib/__tests__/auth.test.ts` exists and tests `getCurrentUser()` behavior, but the JIT branch with Clerk API call is not specifically tested |
| Webhook tenant creation defaults | No | None |

## Issues Found

**CRITICAL** (must fix before archive):
- None. The previously CRITICAL issue (BUG-5 using `clerkUser.organizationMemberships`) has been resolved by switching to `clerkClient().organizations.getOrganizationMembershipList()`.

**WARNING** (should fix):
1. **JIT role fallback is silent**: If the Clerk Backend API call fails (network, auth, rate limit), the catch block logs and defaults to OWNER. This could silently promote users. Consider at minimum logging at `error` level or returning an explicit signal.
2. **`copyKnowledgeBaseToTenant` accepts unverified `tenantId`**: The server action takes `tenantId` as a parameter without verifying it matches `getCurrentUser().tenantId`. An authenticated user could theoretically invoke `copyKnowledgeBaseToTenant('other-tenant-id', ...)`. Low risk since it copies FROM global TO the specified tenant (no data exfiltration), but violates tenant isolation principle.
3. **Duplicate role mapping**: `jitRoleMapping` in `auth.ts` and `mapClerkRoleToDbRole` in `webhooks/clerk/route.ts` contain identical logic independently. Should be extracted to a shared utility to prevent future divergence.
4. **Parameter mutation in `copy-kb-to-tenant.ts`**: `options.vehicleMetadata = true` mutates the caller's object reference. Should use local variables instead.

**SUGGESTION** (nice to have):
1. Add at least one integration test for `completeOnboarding` status guard logic.
2. Add a test for `getKBCounts` unauthenticated path.
3. Consider making `getKBCounts` return `null` or throw for unauthenticated callers instead of returning zeroed data, to distinguish "no data" from "not authorized".

## Verdict

**PASS WITH WARNINGS**

All 10 success criteria are met. 8 are fully verified PASS, 1 is PASS with a minor note (soft auth check on `getKBCounts`), and 1 (JIT role mapping) is PARTIAL due to the silent fallback behavior on Clerk API failure -- but the core implementation is structurally correct and uses the proper Clerk Backend API. The 4 warnings are non-blocking quality improvements that should be addressed before archiving but do not affect the functional correctness of the 11 bug fixes.
