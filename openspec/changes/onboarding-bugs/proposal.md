# Proposal: Onboarding Bugs — Fix 11 Issues

## Intent

The onboarding wizard (`/onboarding`) has 11 bugs that make the KB precarga step (step 2) **non-functional** and the JIT auth path **unreliable**. Four are critical: the redirect never fires after completion, errors are silently swallowed, Shadcn checkboxes don't bind to react-hook-form, and template copies silently fail when dependencies are unmet. These bugs block any new tenant from completing onboarding correctly.

## Scope

### In Scope
- **BUG-1** [CRITICAL]: Replace server-side `redirect()` with `useRouter().push()` in client component
- **BUG-2** [CRITICAL]: Add error state + UI feedback when `completeOnboarding` fails
- **BUG-3** [CRITICAL]: Replace `register()` with `Controller` for Shadcn Checkbox binding
- **BUG-4** [CRITICAL]: Auto-enable vehicleMetadata + maintenanceItems when lineIds are selected (enforce dependency)
- **BUG-5** [WARNING]: Replicate full role mapping in JIT auth fallback (admin/manager/technician/purchaser/driver)
- **BUG-6** [WARNING]: Make `handleSkip` async, propagate errors to UI
- **BUG-7** [WARNING]: Add status guard in `completeOnboarding` — require `PROFILE_COMPLETED`
- **BUG-8** [WARNING]: Remove explicit empty country/currency in JIT tenant creation — let schema defaults apply
- **BUG-9** [SUGGESTION]: Wrap `handleSuccess` in `useCallback`, add `hasCompleted` ref guard
- **BUG-10** [SUGGESTION]: Add `getCurrentUser()` auth check to `getKBCounts`
- **BUG-11** [SUGGESTION]: Align webhook tenant creation with JIT path — both omit country/currency to use schema defaults

### Out of Scope
- Adding new onboarding steps or features
- Changing the KB copy transaction logic (beyond enforcing dependencies)
- Onboarding E2E test automation (existing Playwright specs are skipped pending auth setup)
- UI/UX redesign of the wizard

## Approach

All 11 fixes are **surgical edits** to existing files. No new files, no schema changes, no migrations. The fixes group naturally by file:

1. **`OnboardingKBStep.tsx`** — Rewrite to use `useRouter`, `useCallback`, error state, and completion guard (BUG-1, 2, 9)
2. **`OnboardingKBForm.tsx`** — Switch checkboxes to `Controller`, make `handleSkip` async, propagate `onSuccess` result (BUG-3, 6)
3. **`copy-kb-to-tenant.ts`** — Auto-enable `vehicleMetadata` and `maintenanceItems` when `lineIds.length > 0` at the start of the function (BUG-4)
4. **`auth.ts`** — Full role mapping in JIT, remove explicit empty country/currency (BUG-5, 8)
5. **`onboarding.ts`** — Add `PROFILE_COMPLETED` status guard (BUG-7)
6. **`get-kb-counts.ts`** — Add `getCurrentUser()` check (BUG-10)
7. **`webhooks/clerk/route.ts`** — Omit country/currency from tenant create to use schema defaults (BUG-11)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/onboarding/components/OnboardingKBStep.tsx` | Modified | Rewrite: useRouter, useCallback, error UI, completion guard |
| `src/components/onboarding/OnboardingKBForm.tsx` | Modified | Controller for checkboxes, async handleSkip, onSuccess signature change |
| `src/actions/copy-kb-to-tenant.ts` | Modified | Auto-enable dependencies at function entry |
| `src/lib/auth.ts` | Modified | Full JIT role mapping, remove empty country/currency |
| `src/actions/onboarding.ts` | Modified | Status guard before completing |
| `src/actions/get-kb-counts.ts` | Modified | Add auth check |
| `src/app/api/webhooks/clerk/route.ts` | Modified | Align tenant creation defaults |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Checkbox Controller change breaks form submission | Low | The `lineIds` field already uses `setValue`/`watch` pattern successfully — same approach |
| `onSuccess` signature change in OnboardingKBForm breaks contract | Low | Only one consumer (`OnboardingKBStep`) — update both in same commit |
| Status guard blocks legitimate users | Low | Only blocks if `onboardingStatus !== PROFILE_COMPLETED` — this is the expected happy path |
| JIT role mapping diverges from webhook mapping | Low | Extract shared mapping or use same inline Record pattern — keep in sync |

## Rollback Plan

All changes are in 7 files with no schema/migration changes. Rollback via `git revert <commit>`. No data migration involved — the fixes only change runtime behavior.

## Dependencies

- None. All fixes are independent of the siigo-integration or any other in-progress change.

## Success Criteria

- [ ] User can complete onboarding step 2 (KB precarga) and is redirected to `/dashboard`
- [ ] User can skip KB precarga and is redirected to `/dashboard`
- [ ] If `completeOnboarding` fails, an error message is shown with retry option
- [ ] Unchecking vehicle metadata checkbox actually prevents vehicle data from being copied
- [ ] Selecting template lines with vehicle metadata unchecked auto-enables vehicle metadata
- [ ] JIT-created users get correct role (MANAGER, TECHNICIAN, PURCHASER — not just OWNER/DRIVER)
- [ ] `completeOnboarding` rejects if profile step was not completed
- [ ] JIT-created tenants use schema defaults for country/currency (CO/COP)
- [ ] `getKBCounts` rejects unauthenticated callers
- [ ] No duplicate `completeOnboarding` calls on success
