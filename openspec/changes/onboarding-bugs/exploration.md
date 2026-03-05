# Exploration: Onboarding Bugs

## Current State

The onboarding flow is a multi-step wizard at `/onboarding` that:
1. Shows OrganizationList if user has no org (Clerk)
2. Step 1: Profile form (country/currency) — `OnboardingForm.tsx`
3. Step 2: KB precarga (copy global data) — `OnboardingKBStep.tsx` → `OnboardingKBForm.tsx`
4. Redirects to `/dashboard` on completion

The flow spans 7 files:
- `src/app/onboarding/page.tsx` (server component, orchestrator)
- `src/app/onboarding/components/OnboardingForm.tsx` (client, step 1)
- `src/app/onboarding/components/OnboardingKBStep.tsx` (client, step 2 wrapper)
- `src/components/onboarding/OnboardingKBForm.tsx` (client, step 2 form)
- `src/actions/onboarding.ts` (server actions: completeOnboarding, updateTenantProfile)
- `src/actions/copy-kb-to-tenant.ts` (server action: KB copy transaction)
- `src/actions/get-kb-counts.ts` (server action: fetch global KB counts)

---

## Bugs Found: 11 Total (4 CRITICAL, 4 WARNING, 3 SUGGESTION)

---

### BUG-1 [CRITICAL]: `redirect()` called in Client Component

**File:** `src/app/onboarding/components/OnboardingKBStep.tsx:5,11`
**What:** `redirect` from `next/navigation` is imported and called inside a `'use client'` component. `redirect()` is a **server-side** function that works by throwing a special error caught by React Server Components. In a client component, it either throws an uncaught error or does nothing.
**Impact:** After completing onboarding (both skip and copy paths), the user is NOT redirected to `/dashboard`. They stay stuck on the onboarding page.
**Fix:** Replace `redirect('/dashboard')` with `useRouter().push('/dashboard')` from `next/navigation`, or use `window.location.href = '/dashboard'`.

```typescript
// CURRENT (broken)
import { redirect } from 'next/navigation';
const handleSuccess = async () => {
    const result = await completeOnboarding();
    if (result.success) {
      redirect('/dashboard'); // ← throws uncaught error in client
    }
};

// FIX
import { useRouter } from 'next/navigation';
export function OnboardingKBStep({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const handleSuccess = async () => {
    const result = await completeOnboarding();
    if (result.success) {
      router.push('/dashboard');
    }
  };
  ...
}
```

---

### BUG-2 [CRITICAL]: Silent failure on completeOnboarding error — user stuck forever

**File:** `src/app/onboarding/components/OnboardingKBStep.tsx:8-13`
**What:** If `completeOnboarding()` returns `{ success: false }`, nothing happens. No error is shown, no retry is offered. The onboarding status stays at `PROFILE_COMPLETED` and the user sees step 2 forever.
**Impact:** User is permanently stuck if the server action fails (e.g., DB timeout, tenant not found). No visual feedback.
**Fix:** Add error state and display it in the UI, plus offer a retry button.

---

### BUG-3 [CRITICAL]: Shadcn Checkbox incompatible with react-hook-form `register()`

**File:** `src/components/onboarding/OnboardingKBForm.tsx:157-159, 173-175`
**What:** The `Checkbox` components use `{...register('vehicleMetadata')}` and `{...register('maintenanceItems')}`. However, Shadcn/Radix `Checkbox` does NOT emit native HTML `onChange` events — it uses `onCheckedChange`. The `register()` spread from react-hook-form expects a native input, so the form values for these checkboxes never update when clicked.
**Impact:** `vehicleMetadata` and `maintenanceItems` are ALWAYS their default values (`true`), regardless of what the user clicks. If the user unchecks them, the form still sends `true`. Conversely, the visual state of the checkboxes might work (Radix manages internal state) but the form data is disconnected.
**Fix:** Use `Controller` from react-hook-form with `onCheckedChange`, or use `setValue`/`watch` pattern like the `lineIds` already do.

```typescript
// FIX using Controller
<Controller
  name="vehicleMetadata"
  control={control}
  render={({ field }) => (
    <Checkbox
      id="vehicleMetadata"
      checked={field.value}
      onCheckedChange={field.onChange}
    />
  )}
/>
```

---

### BUG-4 [CRITICAL]: Template copy silently fails when vehicleMetadata is unchecked

**File:** `src/actions/copy-kb-to-tenant.ts:208-235`
**What:** When `options.lineIds` has entries but `options.vehicleMetadata` is `false`, the `lineMap` and `brandMap` are never populated (they're only filled in the `vehicleMetadata` block at line 66-144). This causes ALL templates to be skipped at lines 225-235 because `lineMap.get(tpl.vehicleLineId)` returns `undefined` and the `continue` statement fires.
**Similarly:** When `options.maintenanceItems` is `false`, the `itemMap` is never populated, causing all package items to be skipped at line 292-296.
**Impact:** If a user selects template lines but unchecks "Marcas, Lineas y Tipos", zero templates are copied — silently. No error is shown. The user thinks they got templates but their tenant has none.
**Fix:** Either (a) enforce dependency: automatically enable vehicleMetadata + maintenanceItems when lineIds are selected, or (b) copy the required brands/lines/items as part of template copy, or (c) show validation error in UI.

---

### BUG-5 [WARNING]: JIT role mapping only handles admin → OWNER, all others → DRIVER

**File:** `src/lib/auth.ts:135-136`
**What:** The JIT fallback in `getCurrentUserInternal()` uses a simplistic mapping:
```typescript
const dbRole = clerkRole.replace('org:', '') === 'admin' ? 'OWNER' : 'DRIVER';
```
This means if the Clerk webhook is delayed and a MANAGER, TECHNICIAN, or PURCHASER logs in first, they're created as DRIVER.
**Impact:** Wrong role assignment until webhook fires and updates. User might see wrong sidebar items, might not have access to their expected features. The webhook `organizationMembership.created` uses `upsert` so it will eventually fix the role, but the window of incorrect access is a bad UX.
**Fix:** Replicate the full `mapClerkRoleToDbRole` logic from the webhook:
```typescript
const roleMapping: Record<string, string> = {
  admin: 'OWNER', manager: 'MANAGER', technician: 'TECHNICIAN',
  purchaser: 'PURCHASER', driver: 'DRIVER',
};
const role = clerkRole.replace('org:', '');
const dbRole = roleMapping[role] ?? 'DRIVER';
```

---

### BUG-6 [WARNING]: `handleSkip` calls async `onSuccess` without await — errors swallowed

**File:** `src/components/onboarding/OnboardingKBForm.tsx:106-108`
**What:** `handleSkip` calls `onSuccess()` synchronously but `onSuccess` (which is `handleSuccess` in `OnboardingKBStep`) is an `async` function. Any errors thrown inside are unhandled promise rejections.
**Impact:** If `completeOnboarding()` fails during skip, no error is shown and the promise rejection goes to the console only. Combined with BUG-2, the user is stuck.
**Fix:** Make `handleSkip` async and handle errors, or restructure `onSuccess` to return a result.

---

### BUG-7 [WARNING]: `completeOnboarding` has no status guard — can skip step 1 entirely

**File:** `src/actions/onboarding.ts:15-18`
**What:** `completeOnboarding()` sets `onboardingStatus: 'COMPLETED'` without checking the current status. Any authenticated user can call this server action to jump directly to COMPLETED, skipping the profile step entirely. This leaves `country: ''` and `currency: ''` (or default 'CO'/'COP' from schema).
**Impact:** Tenant configuration could be incomplete (no country/currency set) which affects invoicing, currency formatting, and Siigo integration.
**Fix:** Add a status guard:
```typescript
const tenant = await prisma.tenant.findUnique({ where: { id: dbUser.tenantId } });
if (tenant?.onboardingStatus !== 'PROFILE_COMPLETED') {
  return { success: false, error: 'Must complete profile first' };
}
```

---

### BUG-8 [WARNING]: JIT Tenant creation sets empty country/currency, overriding schema defaults

**File:** `src/lib/auth.ts:123-132`
**What:** The JIT tenant creation explicitly sets `country: ''` and `currency: ''`. The Prisma schema defaults are `country: "CO"` and `currency: "COP"`. By providing explicit empty strings, the schema defaults are bypassed.
**Impact:** If tenant is JIT-created before the onboarding profile form, it starts with empty country/currency which may cause runtime errors in components that expect valid ISO country codes.
**Fix:** Either don't set country/currency in JIT creation (let schema defaults apply), or set reasonable defaults like `country: 'CO', currency: 'COP'`.

---

### BUG-9 [SUGGESTION]: `useEffect` for `onSuccess` may fire multiple times

**File:** `src/components/onboarding/OnboardingKBForm.tsx:91-95`
**What:** The `onSuccess` function is created inline in `OnboardingKBStep` without `useCallback`, so its reference identity changes every render. The `useEffect` depends on `[submitState, onSuccess]`. After `submitState.success` becomes true, every subsequent render triggers the effect again because `onSuccess` is a new reference.
**Impact:** `completeOnboarding()` could be called multiple times. Combined with BUG-1 (redirect doesn't work in client), this creates repeated server action calls.
**Fix:** Wrap `handleSuccess` in `useCallback` in `OnboardingKBStep`, or use a `hasCompleted` ref to guard against double execution.

---

### BUG-10 [SUGGESTION]: `getKBCounts` server action has no authentication

**File:** `src/actions/get-kb-counts.ts`
**What:** The server action reads global KB data without calling `getCurrentUser()`. Any unauthenticated request can invoke it.
**Impact:** Low — it only reads public global data (counts of brands, lines, types, etc.). No tenant data is exposed. But it violates the project's auth-first pattern.
**Fix:** Add `getCurrentUser()` check at the start.

---

### BUG-11 [SUGGESTION]: Organization.created webhook doesn't set onboarding defaults

**File:** `src/app/api/webhooks/clerk/route.ts:131-148`
**What:** When a new organization is created via webhook, the tenant is created without explicit `onboardingStatus`, `country`, or `currency`. Schema defaults apply (`PENDING`, `CO`, `COP`). This is fine but inconsistent with the JIT path in auth.ts which sets `country: ''`, `currency: ''`.
**Impact:** Depending on whether the webhook or JIT fires first, the tenant starts with different default values. This inconsistency could cause subtle bugs.
**Fix:** Align both paths — either both use schema defaults (don't set country/currency) or both use explicit values.

---

## Affected Areas

- `src/app/onboarding/components/OnboardingKBStep.tsx` — BUG-1, BUG-2, BUG-9
- `src/components/onboarding/OnboardingKBForm.tsx` — BUG-3, BUG-6, BUG-9
- `src/actions/copy-kb-to-tenant.ts` — BUG-4
- `src/lib/auth.ts` — BUG-5, BUG-8
- `src/actions/onboarding.ts` — BUG-7
- `src/actions/get-kb-counts.ts` — BUG-10
- `src/app/api/webhooks/clerk/route.ts` — BUG-11

## Recommendation

Fix in priority order:
1. **BUG-1 + BUG-2** (redirect + silent failure) — these make the entire KB step unusable
2. **BUG-3** (checkbox form binding) — KB options are ignored by the form
3. **BUG-4** (template copy dependency) — templates silently fail to copy
4. **BUG-5** (JIT role mapping) — wrong roles for non-admin users
5. **BUG-7** (status guard) — security concern
6. **BUG-6, BUG-8** (async handling, JIT defaults) — reliability
7. **BUG-9, BUG-10, BUG-11** (suggestions) — cleanup

Estimated effort: **Medium** (1-2 days for all fixes, most are surgical)

## Risks

- BUG-3 fix requires careful testing — switching from `register()` to `Controller` changes form state management
- BUG-4 fix has two approaches (enforce dependency vs. auto-copy) — needs product decision
- BUG-5 fix needs to stay in sync with the webhook's `mapClerkRoleToDbRole` logic

## Ready for Proposal

Yes — the orchestrator should present these 11 bugs to the user and ask for approval to proceed with a proposal + task breakdown.
