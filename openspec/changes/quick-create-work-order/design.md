# Design: Quick Create Work Order

## Technical Approach

**`WorkOrderCreateWizard` already exists and already is a dialog in Navbar.** The Navbar pattern (local `open` state + `Dialog` + `WorkOrderCreateWizard`) is the correct pattern. We extend it to:

1. Add `defaultDate?` + `defaultVehicleId?` props to `WorkOrderCreateWizard`
2. Add right-click context menu to `MaintenanceCalendar` — opens a local Dialog with wizard, date pre-filled
3. Sidebar: add one action item type to sidebar data (currently nav-only; needs minor type extension)
4. Alerts: `CreateWorkOrderModal` stays as-is — it has extra fields (provider, alertIds) not in wizard scope today

## Architecture Decisions

### Decision: Extend wizard, don't create new component

**Choice**: Add `defaultDate?` / `defaultVehicleId?` props to `WorkOrderCreateWizard`  
**Alternatives**: New `QuickCreateWorkOrderDialog` component  
**Rationale**: Wizard already handles vehicle picker, zod validation, POST, toast, redirect. Duplication adds drift risk. One component, one source of truth.

### Decision: Local dialog state per trigger (no global context)

**Choice**: Each trigger point (`Navbar`, `MaintenanceCalendar`, Sidebar item) owns its `open` state and renders its own `<Dialog><WorkOrderCreateWizard /></Dialog>`  
**Alternatives**: React Context / Zustand for shared dialog state  
**Rationale**: Navbar already uses local state; this is the established pattern. Multiple simultaneous dialogs are impossible in practice. Context adds complexity with no real benefit here.

### Decision: CSS-positioned div for calendar context menu (not Radix DropdownMenu)

**Choice**: `onContextMenu` → store `{ x, y, date }` in state → render absolute-positioned div with one action button  
**Alternatives**: Radix `DropdownMenu` with custom trigger  
**Rationale**: Radix DropdownMenu needs a DOM trigger element; positioning by cursor coords requires a portal + manual positioning anyway. A simple positioned div is simpler and matches the single-option case. Add `useEffect` + `mousedown` listener to close on outside click.

### Decision: Sidebar action item via `onClick` prop addition

**Choice**: Extend `SidebarItem` type with optional `onClick?: () => void`. Sidebar renders a button (no `href`) when `onClick` is present. State for the dialog lives in `Sidebar.tsx`.  
**Alternatives**: Route to `/dashboard/maintenance/work-orders/new`  
**Rationale**: Consistent UX with Navbar. Avoids full-page navigation for a quick action.

## Data Flow

```
Calendar right-click on day N
  → onContextMenu(e, day) → e.preventDefault()
  → setContextMenu({ x: e.clientX, y: e.clientY, date: "2026-05-10" })
  → <ContextMenuDiv> renders at (x,y)
  → user clicks "Nueva OT en este día"
  → setContextMenu(null), setWizardOpen(true), setWizardDate("2026-05-10")
  → <Dialog open><WorkOrderCreateWizard defaultDate="2026-05-10" /></Dialog>
  → wizard: form.setValue('scheduledDate', defaultDate) on mount
  → submit → POST /api/maintenance/work-orders → redirect /work-orders/{id}
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx` | Modify | Add `defaultDate?`, `defaultVehicleId?` props; pre-fill form on mount |
| `src/components/layout/MaintenanceCalendar/MaintenanceCalendar.tsx` | Modify | Add `onContextMenu` on day cells, context menu div, Dialog + wizard |
| `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts` | Modify | Add "Nueva OT" action item (no href, with onClick marker) |
| `src/components/layout/SidebarItems/SidebarItems.tsx` | Modify | Render button when item has no `href` (call `onAction` prop) |
| `src/components/layout/SidebarRoutes/SidebarRoutes.tsx` | Modify | Add `wizardOpen` state, pass `onAction` to `SidebarItems` for "nueva-ot" item |
| `src/components/layout/Sidebar/Sidebar.tsx` | Check | Verify it wraps `SidebarRoutes` — no changes expected |

## Interfaces / Contracts

```ts
// WorkOrderCreateWizard — new props
interface WorkOrderCreateWizardProps {
  onSuccess?: () => void;
  defaultDate?: string;      // ISO date "YYYY-MM-DD"
  defaultVehicleId?: string; // pre-selects vehicle in combobox
}

// Calendar context menu state
type CalendarContextMenu = {
  x: number;
  y: number;
  date: string; // "YYYY-MM-DD"
} | null;

// SidebarItem type extension
type SidebarItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  action?: 'nueva-ot'; // new: identifies action items
  subItems?: ...;
  roles?: UserRole[];
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type-check | Props contract on wizard | `pnpm type-check` |
| Manual | Right-click day → menu → dialog with date pre-filled | Browser |
| Manual | Navbar "Nuevo Mantenimiento" still works | Browser |
| Manual | Sidebar "Nueva OT" triggers wizard | Browser |
| Manual | Submit → WO created → redirect | Browser |

## Migration / Rollout

No schema changes. No data migration. No feature flags. Deploy is a straight code push.

## Open Questions

- None blocking.
