# Tasks: maintenance-schedule-integration

## Phase 1: API + Hook (Foundation)

- [x] 1.1 Create `src/app/api/maintenance/schedule/route.ts` — GET handler with `requireCurrentUser()` + `tenantPrisma`, queries WOs (`startDate != null`, status IN `[PENDING, APPROVED]`, include `vehicle.licensePlate`) + alerts (`workOrderId = null`, status IN `[PENDING, ACKNOWLEDGED]`), returns `{ scheduledWorkOrders, pendingAlerts }` or 401
- [x] 1.2 Add `useMaintenanceSchedule()` at the end of `src/lib/hooks/useMaintenanceAlerts.ts` — `useQuery` with queryKey `['maintenance-schedule']`, `axios.get<ScheduleResponse>('/api/maintenance/schedule')`, `staleTime: 60_000`
- [x] 1.3 Export `ScheduleResponse` interface from same file (or co-locate inline)

## Phase 2: WorkOrderCreateWizard — scheduledDate

- [x] 2.1 In `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx` formSchema add `scheduledDate: z.string().optional()`
- [x] 2.2 Add `<DatePicker>` (shadcn) for "Fecha programada" in Step 2 UI — optional, no blocking validation
- [x] 2.3 Include `scheduledDate: values.scheduledDate || undefined` in the POST payload to `/api/maintenance/work-orders`

## Phase 3: MaintenanceCalendar Refactor

- [x] 3.1 Read `src/components/layout/MaintenanceCalendar/MaintenanceCalendar.tsx` to map current `useMaintenanceAlerts` usage and `alertsByDate` grouping logic
- [x] 3.2 Replace `useMaintenanceAlerts` import with `useMaintenanceSchedule`; update loading/error states
- [x] 3.3 Rebuild `alertsByDate` grouping: Layer 1 — iterate `scheduledWorkOrders`, key by `new Date(startDate).getDate()`, push `{ plate, type: 'scheduled' }`; Layer 2 — iterate `pendingAlerts`, compute `daysToMaintenance = kmToMaintenance / 100`, push `{ plate, type: 'estimated' }` or `type: 'overdue'` if km ≤ 0
- [x] 3.4 Cell rendering: solid blue for `scheduled`, outline/dashed blue for `estimated`, solid red for `overdue`; max 2 items visible + "+N más" badge if overflow
- [x] 3.5 Add legend row below calendar grid: "Programado" (solid blue dot) | "Estimado" (outline dot) | "Vencido" (solid red dot)

## Phase 4: Wiring — Mount Calendar in Alerts Page

- [x] 4.1 In `src/app/dashboard/maintenance/alerts/page.tsx` import `MaintenanceCalendar` from `@/components/layout/MaintenanceCalendar` and render it below `<AlertsKPICards />`

## Phase 5: Verification

- [x] 5.1 Run `pnpm type-check` — zero errors in changed files
- [ ] 5.2 Manual: `GET /api/maintenance/schedule` returns 200 with correct shape (use browser DevTools)
- [ ] 5.3 Manual: `GET /api/maintenance/schedule` without session returns 401
- [ ] 5.4 Manual: create OT via wizard with scheduledDate → verify `WorkOrder.startDate` set in Prisma Studio
- [ ] 5.5 Manual: calendar visible at `/dashboard/maintenance/alerts`, WOs appear on correct date (solid), alerts appear on estimated date (outline)
- [ ] 5.6 Manual: navigate months (prev/next) works without errors
