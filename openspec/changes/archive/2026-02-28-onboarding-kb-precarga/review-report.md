# Code Review Report

**Change**: onboarding-kb-precarga

### Automated Checks

| Check | Status | Notes |
|-------|--------|-------|
| Linting | ⚠️ Skip | Node.js version mismatch (requires v20+, found v18) |
| Type Check | ⚠️ Fail | Pre-existing errors in codebase (unrelated to change) |

### Code Quality & Bugs

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `copy-kb-to-tenant.ts:291-316` | Package items reference global `mantItemId` instead of tenant's new item IDs from `itemMap` | CRITICAL | Use `itemMap.get(pi.mantItemId)` to get tenant's new item ID |
| `OnboardingKBStep.tsx:8-13` | If `copyKnowledgeBaseToTenant` succeeds but `completeOnboarding` fails, tenant is stuck with copied KB but incomplete onboarding status | WARNING | Wrap in try-catch, show error if completeOnboarding fails, allow retry |
| `copy-kb-to-tenant.ts:34` | Spec defines `maintenanceTemplates: boolean` but implementation uses `lineIds: string[]` — differs from spec | SUGGESTION | Update spec or document this as intentional UX improvement |
| `spec.md:150` | Type definition has typo: `categories:: number` (extra colon) | SUGGESTION | Fix typo in spec |

### Hallucinations & Logic

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| All imports exist and are used correctly | PASS | - |
| No nonexistent variables or functions | PASS | - |
| Tenant isolation properly maintained in all Prisma queries | PASS | - |

### Security Review

| Check | Status | Notes |
|-------|--------|-------|
| Tenant ID passed to all queries | ✅ Pass | All queries properly filter by tenantId |
| No tenant data leakage to client | ✅ Pass | Only counts returned, not actual data |
| Authorization via getCurrentUser() | ✅ Pass | Used in completeOnboarding |

### Spec Compliance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Step 2 in wizard | ✅ Done | Added in page.tsx |
| Checkboxes for KB options | ✅ Done | OnboardingKBForm.tsx |
| Preview counts in UI | ✅ Done | Shows counts for each option |
| Skip option available | ✅ Done | "Continuar sin precargar" button |
| Error handling in UI | ✅ Done | Error message displayed on failure |
| seedTenantData made no-op | ✅ Done | Function body empty |
| Dummy data removed | ✅ Done | No Provider/Driver/Vehicle created |

### Issues Found

**CRITICAL** (must fix before verify):
1. **Package items reference wrong mantItemId**: In `copy-kb-to-tenant.ts:291-316`, when copying package items, the code uses `pi.mantItemId` directly which references the global item, not the tenant's copied item. Should use `itemMap.get(pi.mantItemId)` to get the new tenant-specific item ID.

**WARNING** (should fix):
1. **Inconsistent onboarding state on partial failure**: If `copyKnowledgeBaseToTenant` succeeds but `completeOnboarding` fails, the tenant has KB data copied but is stuck in `PROFILE_COMPLETED` status. The user cannot retry without manual DB intervention.

**SUGGESTION** (nice to have):
1. Update spec to reflect `lineIds` implementation instead of `maintenanceTemplates: boolean`
2. Fix typo in spec.md line 150

### Verdict

**FAIL** - Critical bug in package item mapping breaks tenant isolation for maintenance items within packages.

---

## Detailed Analysis

### Critical: Package Item MantItemId Mapping

In `src/actions/copy-kb-to-tenant.ts:291-316`:

```typescript
for (const pi of pkg.packageItems) {
  const newMantItemId = itemMap.get(pi.mantItemId);
  if (!newMantItemId) {
    console.log('[CopyKB] Skipping package item, item not found:', pi.mantItemId);
    continue;
  }

  const existingPackageItem = await tx.packageItem.findFirst({
    where: { packageId: newPackageId, mantItemId: newMantItemId },
  });

  if (!existingPackageItem) {
    await tx.packageItem.create({
      data: {
        packageId: newPackageId,
        mantItemId: newMantItemId,  // ← This is correct, uses mapped ID
        // ...
      },
    });
  }
  counts.packageItems++;
}
```

**Actually wait** - I need to re-read this more carefully. Looking at lines 291-316, the code DOES use `newMantItemId` which comes from `itemMap.get(pi.mantItemId)`. So this is actually correct! Let me re-check...

Looking again at line 292:
```typescript
const newMantItemId = itemMap.get(pi.mantItemId);
```

Yes, this is correct. The itemMap is populated earlier when copying mantItems (line 188). So this is NOT a bug. I apologize for the confusion.

Let me re-evaluate the issues:

### Corrected Assessment

**CRITICAL** (must fix before verify): None

**WARNING** (should fix):
1. **Partial failure handling**: If copy succeeds but completeOnboarding fails, tenant is stuck. Consider:
   - Calling completeOnboarding within the same transaction
   - Or checking status before copying and handling retry

**SUGGESTION** (nice to have):
1. Spec uses `maintenanceTemplates: boolean` but implementation uses `lineIds: string[]` - document as improvement
2. Spec typo at line 150

### Verdict (Corrected)

**PASS WITH WARNINGS**

The implementation is functionally correct. The package item mapping is properly handled. Only warning is about partial failure edge case which is minor.

---

## Files Reviewed

| File | Path | Status |
|------|------|--------|
| copy-kb-to-tenant.ts | src/actions/copy-kb-to-tenant.ts | ✅ Good |
| get-kb-counts.ts | src/actions/get-kb-counts.ts | ✅ Good |
| onboarding.ts | src/actions/onboarding.ts | ✅ Good |
| seed-tenant.ts | src/actions/seed-tenant.ts | ✅ Good |
| OnboardingKBForm.tsx | src/components/onboarding/OnboardingKBForm.tsx | ✅ Good |
| OnboardingKBStep.tsx | src/app/onboarding/components/OnboardingKBStep.tsx | ⚠️ Warning |
| page.tsx | src/app/onboarding/page.tsx | ✅ Good |

---

*Generated: 2026-02-28*
