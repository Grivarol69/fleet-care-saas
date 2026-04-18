# Proposal: Quick Create Work Order

## Intent

Unify the 4 entry points for creating a Work Order (Navbar, Sidebar, Maintenance Alerts, Calendar right-click) under a single `QuickCreateWorkOrderDialog`. Today each access point uses a different flow (page redirect, alert-coupled modal, or nothing). The calendar has no right-click interaction at all.

## Scope

### In Scope
- New `QuickCreateWorkOrderDialog` component — lightweight dialog with vehicle picker, title, description, scheduled date, modality, priority
- Right-click context menu on `MaintenanceCalendar` day cells → opens dialog with date pre-filled
- Navbar "Nuevo Mantenimiento" button triggers dialog (instead of page redirect)
- Sidebar shortcut triggers same dialog
- Alert flow keeps its `vehicleId` + `alertIds` pre-fill via dialog props

### Out of Scope
- Replacing `UnifiedWorkOrderForm` (full detail page stays)
- Inline item/package selection in the quick dialog
- Calendar view modes (week/day) or drag-to-create
- Mobile/touch long-press alternative to right-click

## Approach

1. Extract vehicle-picker + core WO fields into `QuickCreateWorkOrderDialog` (Dialog wrapper around minimal form)
2. Props: `defaultDate?`, `defaultVehicleId?`, `alertIds?` — supports all 4 origins
3. On submit: POST `/api/maintenance/work-orders` → redirect to `/dashboard/maintenance/work-orders/{id}`
4. `MaintenanceCalendar`: add `onContextMenu` on day cells → `preventDefault` + position `DropdownMenu` → "Nueva OT en este día" option
5. Navbar/Sidebar: replace `href="/dashboard/maintenance/work-orders/new"` with dialog trigger (state lifted to layout or via shared store/context)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/maintenance/work-orders/QuickCreateWorkOrderDialog.tsx` | New | Core quick-create dialog |
| `src/components/layout/MaintenanceCalendar/MaintenanceCalendar.tsx` | Modified | Add right-click + context menu |
| `src/components/layout/Navbar/Navbar.tsx` | Modified | Trigger dialog instead of href |
| `src/components/layout/SidebarRoutes/SidebarRoutes.tsx` | Modified | Same trigger |
| `src/app/dashboard/maintenance/alerts/components/CreateWorkOrderModal.tsx` | Modified | Delegate to QuickCreateWorkOrderDialog or align API call |
| `src/app/api/maintenance/work-orders/route.ts` | None | Existing POST reused as-is |

**No Prisma model changes. No new API routes. No role permission changes.**

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Navbar/Sidebar dialog state requires layout-level lifting | Med | Use a lightweight context or Zustand slice; keep scope minimal |
| Alert flow regression (selectedAlertIds) | Low | Dialog accepts optional `alertIds` prop; keep backward-compatible |
| Browser right-click behavior varies (OS menus on some configs) | Low | `preventDefault` + pointer position tracking covers standard cases |

## Rollback Plan

No schema changes. Revert is git-only: `git revert` on the 3–5 modified files. Old Navbar/Sidebar hrefs can be restored in one line each.

## Dependencies

- Existing `/api/maintenance/work-orders` POST endpoint (no changes needed)
- `useTechnicians`, `useProviders`, vehicle list hooks already in codebase

## Success Criteria

- [ ] Right-click any calendar day → context menu appears → "Nueva OT" → dialog opens with date pre-filled
- [ ] Submit from dialog → WO created → redirect to WO detail page
- [ ] Navbar + Sidebar "Nuevo Mantenimiento" open same dialog
- [ ] Alert flow still works (vehicle + alertIds pre-filled)
- [ ] `pnpm type-check` passes
