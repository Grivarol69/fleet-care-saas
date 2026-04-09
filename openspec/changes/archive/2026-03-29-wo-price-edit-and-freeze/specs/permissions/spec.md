# Permissions Specification (New Domain)

## Purpose

Define the permission helpers in `src/lib/permissions.ts` that gate WO field-level freeze overrides and related backend/frontend conditionals.

---

## Requirements

### Requirement: canOverrideWorkOrderFreeze Helper

The system MUST expose a pure function `canOverrideWorkOrderFreeze(user: User): boolean` in `src/lib/permissions.ts`.

The function MUST return `true` if and only if the user's role is `OWNER` or `SUPER_ADMIN`.

The function MUST be importable by both API route handlers and client-side components.

No additional role (MANAGER, COORDINATOR, TECHNICIAN, PURCHASER, DRIVER) MUST return `true`.

#### Scenario: OWNER user passes the override check

- GIVEN a user with role `OWNER`
- WHEN `canOverrideWorkOrderFreeze(user)` is called
- THEN it MUST return `true`

#### Scenario: SUPER_ADMIN user passes the override check

- GIVEN a user with role `SUPER_ADMIN`
- WHEN `canOverrideWorkOrderFreeze(user)` is called
- THEN it MUST return `true`

#### Scenario: MANAGER user fails the override check

- GIVEN a user with role `MANAGER`
- WHEN `canOverrideWorkOrderFreeze(user)` is called
- THEN it MUST return `false`

#### Scenario: TECHNICIAN user fails the override check

- GIVEN a user with role `TECHNICIAN`
- WHEN `canOverrideWorkOrderFreeze(user)` is called
- THEN it MUST return `false`

---

### Requirement: Reuse Across Backend and Frontend

All freeze-gate logic in API routes and UI components MUST use `canOverrideWorkOrderFreeze(user)` — NOT inline `role === 'OWNER'` checks — to ensure a single point of truth.

#### Scenario: Backend guard uses the helper

- GIVEN `PATCH /items/[itemId]` is called with `unitPrice` on a frozen WO
- WHEN the handler evaluates the freeze guard
- THEN it MUST call `canOverrideWorkOrderFreeze(user)` and allow the edit only if it returns `true`

#### Scenario: Frontend freeze condition uses the helper

- GIVEN `UnifiedWorkOrderForm` receives `currentUser`
- WHEN the component determines whether to disable price fields
- THEN the disabled state MUST be derived from `canOverrideWorkOrderFreeze(currentUser)` combined with WO status
