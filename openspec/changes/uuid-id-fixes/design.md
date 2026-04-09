# Design: UUID ID Fixes — Remove parseInt Anti-Patterns

## Technical Approach

Surgical, file-by-file patch across 11 files. No new dependencies, no schema changes, no architectural
refactoring. Each fix falls into one of four mechanical categories:

1. **Remove `parseInt(uuid)`** — replace `parseInt(someId)` with `someId` directly where the argument
   is an entity ID field (UUID string). This is the primary runtime fix.
2. **Fix `number` type annotations** — change `id: number`, `vehicleId: number`, etc. to `string`
   in interfaces, state declarations, props, and function signatures.
3. **Fix collection types** — change `Set<number>` → `Set<string>` and `Map<number, T>` →
   `Map<string, T>` where the key is an entity ID.
4. **Replace dead numeric guards** — change `id <= 0` (dead with UUID strings) to
   `!id || id.trim() === ''` (correctly rejects empty/missing values).

Implementation is organized in 3 phases by risk level:
- **Phase 1** (lowest risk): API route fixes — server-side, no UI impact
- **Phase 2** (low risk): Pure type-annotation changes in UI — no behavioral change
- **Phase 3** (medium risk): Logic fixes in UI — behavior changes (parseInt removal, collection types)

## Architecture Decisions

### Decision: Direct String Pass-Through for IDs

**Choice**: Pass UUID strings directly from form/state to API payloads without any transformation.

**Alternatives considered**:
- Keep `parseInt()` and convert API to accept numbers (wrong direction — schema is already UUID)
- Add a runtime UUID validation step (unnecessary overhead)

**Rationale**: UUIDs are already strings at the source (Prisma returns strings, HTML inputs emit
strings, Shadcn Select `onValueChange` emits strings). The `parseInt()` calls were added when IDs
were integers and were never removed after the schema migration. The correct fix is removal, not
adaptation.

### Decision: String Guards in API Routes

**Choice**: Replace `id <= 0` with `!id || id.trim() === ''` for UUID ID validation.

**Alternatives considered**:
- UUID regex validation (`/^[0-9a-f]{8}-...$/i`) — stronger but over-engineered for this purpose
- Keep `id <= 0` and add a separate truthiness check — redundant; the `!id` falsy check already
  covers empty string, null, and undefined

**Rationale**: The intent of the original guard was "reject missing/invalid IDs." With UUID strings,
`!id` handles null/undefined/empty-string; `.trim() === ''` handles whitespace-only strings.
This is sufficient — Prisma will reject malformed UUID strings at the DB layer anyway.

### Decision: Change Record Index Type in useAlertsGroupedByVehicle

**Choice**: Change `Record<number, {...}>` accumulator to `Record<string, {...}>` in the
`useAlertsGroupedByVehicle` hook's reduce call (line 213 of `useMaintenanceAlerts.ts`).

**Alternatives considered**:
- Leave it as `Record<number, {...}>` (TypeScript would coerce string keys anyway at runtime)

**Rationale**: The `vehicleId` key is a UUID string. TypeScript's `Record<number, T>` with
string keys would cause a type error in strict mode. Aligning the type annotation prevents TS
errors and documents intent correctly.

### Decision: Do Not Touch FormAssignProgram.tsx line 327

**Choice**: Leave `parseInt(e.target.value) || 0` on line 327 of `FormAssignProgram.tsx` unchanged.

**Alternatives considered**: Removing it.

**Rationale**: Line 327 parses a `type="number"` HTML input for a **kilometer value** (not an ID).
`parseInt` is correct here — it converts the user's text input to an integer mileage value.
The `id.toString()` calls on lines 245 and 288 are cosmetic redundancies (UUIDs are already
strings) but cause no harm; including them in scope adds risk for zero gain. The proposal listed
them as "low risk but noisy" — they are excluded from this design.

### Decision: Keep VehicleAlertRow Props Alignment Out of This Change

**Choice**: Fix only the 5 files listed in scope. Do not cascade into `VehicleAlertRow.tsx` or
other sub-components of the alerts module unless they directly use `number` for IDs.

**Rationale**: The scope is clearly bounded to the 11 files identified in exploration. Sub-components
that receive `MaintenanceAlert` objects already work at runtime because they use the alert object
properties (which come from the API as strings). Only the interface definition and the selection
state (which compares IDs) need fixing.

## Data Flow

The core issue is in the form → API boundary:

```
User selects item in Shadcn Select
        │
        │  onValueChange(value: string)   ← value is UUID string here
        ▼
parseInt(value) ──→ NaN             ← BUG: UUID → NaN
        │
        ▼
axios.post(payload: { someId: NaN }) ← NaN sent to API
        │
        ▼
Prisma receives NaN as filter / create value
        │
        ▼
Query returns 0 results / DB rejects / 422 error
```

After the fix:

```
User selects item in Shadcn Select
        │
        │  onValueChange(value: string)
        ▼
value used directly                 ← FIXED: UUID passed as-is
        │
        ▼
axios.post(payload: { someId: "abc-uuid" })
        │
        ▼
Prisma receives valid UUID string → query succeeds
```

For the API route guard issue:

```
vehicleBrandId = "abc-def-uuid"

OLD: vehicleBrandId <= 0
     → "abc-def-uuid" <= 0
     → false (JS coercion: NaN <= 0 = false)
     → guard NEVER fires, dead code

NEW: !vehicleBrandId || vehicleBrandId.trim() === ''
     → false (non-empty string is truthy)
     → guard fires correctly on empty/null input
```

## File Changes

| File | Action | Phase | Description |
|------|--------|-------|-------------|
| `src/app/api/maintenance/vehicle-parts/route.ts` | Modify | 1 | Remove `parseInt()` on lines 26-28 for `mantItemId`, `vehicleBrandId`, `vehicleLineId` |
| `src/app/api/maintenance/mant-template/route.ts` | Modify | 1 | Replace `vehicleBrandId <= 0` (line 95) and `vehicleLineId <= 0` (line 102) with string guards |
| `src/app/api/maintenance/mant-items/route.ts` | Modify | 1 | Replace `categoryId <= 0` (line 87) with string guard |
| `src/lib/hooks/useMaintenanceAlerts.ts` | Modify | 2 | Change `id: number`, `programItemId: number`, `vehicleId: number`, `workOrder.id: number` in `MaintenanceAlert` interface; `AlertFilters.vehicleId: number` → `string`; `useVehicleAlerts(vehicleId: number)` → `string`; `useUpdateAlertStatus.alertId: number` → `string`; `useAcknowledgeAlert.alertId: number` → `string`; `useSnoozeAlert.alertId: number` → `string`; `useCancelAlert.alertId: number` → `string`; `Record<number, {...}>` → `Record<string, {...}>` in `useAlertsGroupedByVehicle`; `useAlertsGroupedByPackage(vehicleId?: number)` → `string` |
| `src/app/dashboard/maintenance/alerts/page.tsx` | Modify | 2 | `selectedAlertIds: number[]` → `string[]` (line 23) |
| `src/app/dashboard/maintenance/alerts/components/AlertsTable.tsx` | Modify | 2 | `selectedAlertIds: number[]` → `string[]`; `onSelectionChange: (ids: number[]) => void` → `string[]`; `handleToggleAlert(alertId: number)` → `string` (Props interface + function signature) |
| `src/app/dashboard/maintenance/alerts/components/ImprovedAlertsTable.tsx` | Modify | 2 | Same as AlertsTable: Props `selectedAlertIds: number[]` → `string[]`; `onSelectionChange` → `string[]`; `handleToggleAlert(alertId: number)` → `string` |
| `src/app/dashboard/invoices/new/page.tsx` | Modify | 2+3 | Phase 2: `workOrderItemId?: number` → `string` in `InvoiceItem` (line 57) and `PendingPO.items[].workOrderItemId` (line 99). Phase 3: Remove `parseInt(supplierId)` (line 539) and `parseInt(workOrderId)` (line 541) |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx` | Modify | 3 | Remove `parseInt(values.mantItemId)` (line 317) and `parseInt(values.providerId)` (line 322) |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PartsTab.tsx` | Modify | 3 | `workOrderItemId: number` → `string` in `PartItem` type (line 47); `Set<number>` → `Set<string>` (line 107); `Map<number, ItemOrigin>` → `Map<string, ItemOrigin>` (line 108); `Map<number, ItemOrigin>` in `initialOrigins` (line 130); `toggleItemSelection(itemId: number)` → `string` (line 204); `setItemOrigin(itemId: number, ...)` → `string` (line 225); Remove `parseInt(selectedProviderId)` (line 294) |
| `src/app/dashboard/inventory/purchases/new/page.tsx` | Modify | 3 | Remove `parseInt(supplierId)` (line 174) |
| `src/app/dashboard/maintenance/vehicle-programs/components/FormAssignProgram/FormAssignProgramImproved.tsx` | Modify | 3 | Remove `parseInt(value)` → use `value` directly in `onValueChange` (line 402); remove `.toString()` on `field.value` in `value` prop (line 403 → `value={field.value ?? ''}`) |

## Interfaces / Contracts

### useMaintenanceAlerts.ts — Updated Interfaces

```typescript
// BEFORE
export interface MaintenanceAlert {
  id: number;
  programItemId: number;
  vehicleId: number;
  workOrder: { id: number; title: string; status: string } | null;
  // ...
}
interface AlertFilters {
  vehicleId?: number;
  // ...
}
export function useVehicleAlerts(vehicleId: number) { ... }
export function useUpdateAlertStatus() {
  return useMutation({
    mutationFn: async (params: { alertId: number; ... }) => { ... }
  });
}

// AFTER
export interface MaintenanceAlert {
  id: string;
  programItemId: string;
  vehicleId: string;
  workOrder: { id: string; title: string; status: string } | null;
  // ...
}
interface AlertFilters {
  vehicleId?: string;
  // ...
}
export function useVehicleAlerts(vehicleId: string) { ... }
export function useUpdateAlertStatus() {
  return useMutation({
    mutationFn: async (params: { alertId: string; ... }) => { ... }
  });
}
```

Note: `useAcknowledgeAlert`, `useSnoozeAlert`, `useCancelAlert` all receive `alertId: string` after fix.
The `useAlertsGroupedByVehicle` reduce accumulator changes from `Record<number, {...}>` to `Record<string, {...}>`.

### AlertsTable.tsx / ImprovedAlertsTable.tsx — Updated Props

```typescript
// BEFORE
interface Props {
  vehicles: VehicleGroup[];
  selectedAlertIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onCreateWorkOrder: () => void;
}
const handleToggleAlert = (alertId: number) => { ... };

// AFTER
interface Props {
  vehicles: VehicleGroup[];
  selectedAlertIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onCreateWorkOrder: () => void;
}
const handleToggleAlert = (alertId: string) => { ... };
```

### PartsTab.tsx — Updated Types

```typescript
// BEFORE
type PartItem = {
  workOrderItemId: number;
  // ...
};
const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
const [itemOrigins, setItemOrigins] = useState<Map<number, ItemOrigin>>(new Map());
const toggleItemSelection = (itemId: number) => { ... };
const setItemOrigin = (itemId: number, origin: ItemOrigin) => { ... };

// AFTER
type PartItem = {
  workOrderItemId: string;
  // ...
};
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
const [itemOrigins, setItemOrigins] = useState<Map<string, ItemOrigin>>(new Map());
const toggleItemSelection = (itemId: string) => { ... };
const setItemOrigin = (itemId: string, origin: ItemOrigin) => { ... };
```

### API Route Guards — Updated Validation

```typescript
// vehicle-parts/route.ts — BEFORE
if (mantItemId) where.mantItemId = parseInt(mantItemId);
if (vehicleBrandId) where.vehicleBrandId = parseInt(vehicleBrandId);
if (vehicleLineId) where.vehicleLineId = parseInt(vehicleLineId);

// AFTER
if (mantItemId) where.mantItemId = mantItemId;
if (vehicleBrandId) where.vehicleBrandId = vehicleBrandId;
if (vehicleLineId) where.vehicleLineId = vehicleLineId;

// mant-template/route.ts — BEFORE
if (!vehicleBrandId || vehicleBrandId <= 0) { ... reject ... }
if (!vehicleLineId || vehicleLineId <= 0) { ... reject ... }

// AFTER
if (!vehicleBrandId || vehicleBrandId.trim() === '') { ... reject ... }
if (!vehicleLineId || vehicleLineId.trim() === '') { ... reject ... }

// mant-items/route.ts — BEFORE
if (!categoryId || categoryId <= 0) { ... reject ... }

// AFTER
if (!categoryId || categoryId.trim() === '') { ... reject ... }
```

### CreateWorkOrderModal.tsx — Updated Payload

```typescript
// BEFORE
technicianId: technicianId && technicianId !== 'NONE' ? parseInt(technicianId) : null,
providerId: providerId && providerId !== 'NONE' ? parseInt(providerId) : null,

// AFTER
technicianId: technicianId && technicianId !== 'NONE' ? technicianId : null,
providerId: providerId && providerId !== 'NONE' ? providerId : null,
```

Note: `CreateWorkOrderModal` also receives `selectedAlertIds: string[]` from the updated `page.tsx`.

### FormAssignProgramImproved.tsx — Updated Select Handler

```typescript
// BEFORE
onValueChange={value => field.onChange(parseInt(value))}
value={field.value ? field.value.toString() : ''}

// AFTER
onValueChange={value => field.onChange(value)}
value={field.value ?? ''}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| TypeScript | All 11 files compile without new errors | `pnpm type-check` — run before and after each phase |
| Manual — Phase 1 | KB search returns results | Open `/dashboard/maintenance/vehicle-parts`, filter by brand/line/item → results appear |
| Manual — Phase 1 | Template creation validates correctly | Attempt to POST a template without brand → error message shown; with brand → created |
| Manual — Phase 1 | MantItem creation validates categoryId | Attempt to POST item without category → validation error |
| Manual — Phase 2 | Alerts page loads and type-checks | `pnpm type-check` passes; alert list renders |
| Manual — Phase 3 | Alert selection works | Select alerts in ImprovedAlertsTable → selection counter updates |
| Manual — Phase 3 | CreateWorkOrderModal submits | Select alerts → open modal → fill → submit → WO created (check network tab: no NaN in payload) |
| Manual — Phase 3 | WO AddItemDialog adds item | Open WO detail → Add Item → select mantItem + provider → submit → item appears |
| Manual — Phase 3 | PartsTab PO generation | Select parts in PartsTab → choose provider → Generate OC → PO created (check network: valid providerId) |
| Manual — Phase 3 | Invoice creation from WO | Navigate to `/dashboard/invoices/new?workOrderId=<uuid>` → fill → submit → invoice created |
| Manual — Phase 3 | Inventory purchase creation | Navigate to `/dashboard/inventory/purchases/new` → fill → submit → no NaN in payload |
| Manual — Phase 3 | Template assignment via Improved form | Select template from dropdown → field.value stays selected (not cleared to NaN) |

## Migration / Rollout

No migration required. All changes are pure TypeScript/JavaScript code fixes:
- No database schema changes
- No data migrations
- No external service changes
- No new environment variables

Rollback plan: Each file is independently patchable. If any phase introduces a regression,
revert only that file with `git checkout HEAD -- <file>`. No cross-file dependency between
phases — Phase 1 can be deployed without Phase 2 or 3.

## Open Questions

- [ ] **CreateWorkOrderModal `selectedAlertIds` comparison (line 61)**: The modal currently does
  `selectedAlertIds.includes(a.id)` where `a.id` is from `MaintenanceAlert`. After fixing the
  interface to `string`, this will work correctly. However, the current `page.tsx` (line 155-156)
  maps vehicleId with `String(v.vehicleId)` before passing to `ImprovedAlertsTable`. Once the
  hook interface is fixed to `string`, this `String()` cast becomes redundant and can be removed —
  but it is harmless if left in. Flag for cleanup in tasks.

- [ ] **`tech.id.toString()` in CreateWorkOrderModal (line 266)**: The Select renders technician
  options with `value={tech.id.toString()}`. Since `tech.id` will be a `string` (UUID) after the
  hook fix, this `.toString()` is redundant but harmless. Same for `provider.id.toString()` on
  line 291. These are warning-level cleanup items, not critical bugs. Include in tasks as optional.
