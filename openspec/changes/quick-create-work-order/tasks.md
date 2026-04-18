# Tasks: Quick Create Work Order

## Phase 1: Type Contracts

- [ ] 1.1 In `src/components/layout/SidebarItems/SidebarItems.types.ts`: add `action?: string` and `onAction?: () => void` to the item type inside `SidebarItemsProps`
- [ ] 1.2 In `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`: extend `SidebarItem` type with `action?: string`; add "Nueva OT" entry under Mantenimiento with `action: 'nueva-ot'`, no `href`, roles `[OWNER, MANAGER, COORDINATOR]`

## Phase 2: Extend WorkOrderCreateWizard

- [ ] 2.1 In `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx`: add `defaultDate?: string` and `defaultVehicleId?: string` to `WorkOrderCreateWizardProps`
- [ ] 2.2 In the same file: add `useEffect` that runs once on mount — calls `form.setValue('scheduledDate', defaultDate)` if `defaultDate` is set, and `form.setValue('vehicleId', defaultVehicleId)` + `setSelectedVehicle` if `defaultVehicleId` is set (after vehicles are loaded)
- [ ] 2.3 In the same file: add `startTime` (string, optional, HH:MM pattern), `endTime` (string, optional, HH:MM pattern), and `vehicleLocation` (string, optional) to the Zod schema and form fields; render them in the form after `scheduledDate` — two `<Input type="time">` side-by-side and a `<Textarea>` for location
- [ ] 2.4 In the same file: include `startTime`, `endTime`, `vehicleLocation` in the POST payload sent to `/api/maintenance/work-orders`

## Phase 3: API — POST work-orders

- [ ] 3.1 In `src/app/api/maintenance/work-orders/route.ts`: combine `scheduledDate + startTime` → `startDate` (full DateTime); combine `scheduledDate + endTime` → `endDate` (full DateTime); map `vehicleLocation` → `notes`; if only date provided (no time), keep existing behavior (`startDate` = midnight UTC)

## Phase 4: API — Schedule (Calendar data)

- [ ] 4.1 In `src/app/api/maintenance/schedule/route.ts`: add `endDate` and `notes` to the Prisma `select` block and the response mapping
- [ ] 4.2 In `src/lib/hooks/useMaintenanceAlerts.ts` (or wherever `ScheduleResponse` is typed): add `endDate?: string | null` and `notes?: string | null` to `scheduledWorkOrders` item type

## Phase 5: Calendar Right-Click

- [ ] 5.1 In `src/components/layout/MaintenanceCalendar/MaintenanceCalendar.tsx`: add state `contextMenu: { x: number; y: number; date: string } | null` initialized to `null`; add state `wizardOpen: boolean` and `wizardDate: string`
- [ ] 5.2 In the same file: add `handleContextMenu(e: React.MouseEvent, day: number)` — calls `e.preventDefault()`, sets `contextMenu` with `clientX`, `clientY`, ISO date string (`${year}-${month+1}-${day}` zero-padded)
- [ ] 5.3 In the same file: add `useEffect` with `mousedown` listener on `document` that calls `setContextMenu(null)` when clicked outside; also add `keydown` listener for Escape
- [ ] 5.4 In the same file: attach `onContextMenu={(e) => handleContextMenu(e, day)}` to day cell `<div>` elements (only when `day !== null`)
- [ ] 5.5 In the same file: render context menu — a fixed-position `<div>` at `{ left: contextMenu.x, top: contextMenu.y }` with `z-50` and shadcn card styling, containing one button "Nueva OT en este día"; clicking it calls `setContextMenu(null)`, `setWizardDate(contextMenu.date)`, `setWizardOpen(true)`
- [ ] 5.6 In the same file: add imports for `Dialog, DialogContent, DialogHeader, DialogTitle` and `WorkOrderCreateWizard`; render `<Dialog open={wizardOpen} onOpenChange={setWizardOpen}><DialogContent>...<WorkOrderCreateWizard defaultDate={wizardDate} onSuccess={() => setWizardOpen(false)} /></DialogContent></Dialog>`
- [ ] 5.7 In the same file: in each day cell, for each scheduled WO that has `startDate` with a time component (not midnight), render a time range badge `"09:00 - 11:00"` below the license plate; if `notes` is set, render a single truncated line (max 1 line, `truncate`) below the time badge

## Phase 6: Sidebar Wiring

- [ ] 6.1 In `src/components/layout/SidebarItems/SidebarItems.tsx`: in the render branch where `!href && !subItems`, check `item.action` — if set, render a `<button>` that calls `props.onAction?.()` instead of the current `<div onClick={toggleSubMenu}>`
- [ ] 6.2 In `src/components/layout/SidebarRoutes/SidebarRoutes.tsx`: add `wizardOpen` state; pass `onAction={() => setWizardOpen(true)}` to `SidebarItems` only for items where `item.action === 'nueva-ot'`; render `<Dialog>...<WorkOrderCreateWizard onSuccess={() => setWizardOpen(false)} /></Dialog>` at the bottom of the return

## Phase 7: Verification

- [ ] 7.1 Run `pnpm type-check` — fix any type errors
- [ ] 7.2 Manual: right-click a valid day in the dashboard calendar → context menu appears → click "Nueva OT en este día" → wizard dialog opens with correct date pre-filled
- [ ] 7.3 Manual: fill hora desde "09:00", hora hasta "11:00", location "Taller norte" → submit → WO created → calendar cell for that day shows "09:00 - 11:00" and "Taller norte" (truncated)
- [ ] 7.4 Manual: right-click an empty padding cell (before day 1) → context menu MUST NOT appear
- [ ] 7.5 Manual: press Escape or click outside context menu → menu closes, dialog does NOT open
- [ ] 7.6 Manual: Navbar "Nuevo Mantenimiento" still opens wizard (no regression)
- [ ] 7.7 Manual: Sidebar "Nueva OT" item appears for MANAGER/OWNER → click → opens wizard dialog
- [ ] 7.8 Manual: complete WO creation from calendar right-click → verify redirect to new WO detail page
