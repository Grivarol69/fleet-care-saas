# Exploration: Work Order UX Redesign

## Current State

### Architecture

- Detail page: `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`
- 5 active tabs: GeneralInfo, InternalWork (Taller Propio), ServicesExt, Parts, Expenses
- 2 commented-out tabs: PurchaseOrders, History (components exist but disabled)

### Core Problems Identified

1. **Broken item routing between tabs**: Both `ServicesTab` and `InternalWorkTab` fetch `?type=SERVICE,ACTION` and split by `itemSource`. This filter logic is fragile — a PENDING item with no itemSource appears in BOTH tabs. An external service added by the user initially has `closureType=PENDING` and no `itemSource`, so it appears in "Taller Propio" AND "Servicios Externos" simultaneously.

2. **Parts tab is an island**: `PartsTab` fetches `?type=PART` separately. A technician must go to a completely different tab to see what parts a service task needs. There's no connection between a WorkOrderItem (service) and its associated parts on screen.

3. **InternalWorkTab is doing 3 jobs**: Items table + Subtasks section (separate card) + Tickets listing (separate card). These are 3 different concepts crammed into one tab with no clear flow between them.

4. **Subtasks are disconnected from items visually**: Subtask accordion is a separate Card below the items table. A technician must scroll and mentally correlate them.

5. **Ticket generation is destructive and opaque**: "Crear Ticket Interno" sends ALL pending items to a ticket with hardcoded 1 hour per task. No per-task hour entry at creation time.

6. **GeneralInfoTab has no sticky context**: Status transitions (Iniciar / Completar / Cerrar) are buried inside a tab, not visible from the header while working in other tabs.

7. **ExpensesTab is manual and disconnected**: No auto-calculation from actual labor + parts consumed. `actualCost` in GeneralInfo is hand-typed.

8. **No "Mi Taller" view for technicians**: TECHNICIAN role sees the same management view as MANAGER. No mobile-optimized, task-focused execution view.

### Data Model (key relations)

```
WorkOrder
  └── WorkOrderItem (mantItemType: ACTION|SERVICE|PART)
        ├── itemSource: EXTERNAL | INTERNAL_STOCK | INTERNAL_PURCHASE | null
        ├── closureType: PENDING | INTERNAL_TICKET | PURCHASE_ORDER | INVOICE | DIRECT
        ├── WorkOrderSubTask[] (linked to TemparioItem via temparioItemId)
        └── TicketLaborEntry[] / TicketPartEntry[] (via InternalWorkTicket)

InternalWorkTicket
  ├── TicketLaborEntry[] (hours, hourlyRate, workOrderItemId)
  └── TicketPartEntry[] (quantity, unitCost, inventoryItemId)

WorkOrderExpense (separate model, free-form, not linked to items)
```

### Files Affected by Redesign

- `src/app/dashboard/maintenance/work-orders/[id]/page.tsx` — main shell
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/GeneralInfoTab.tsx`
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/InternalWorkTab.tsx`
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ServicesTab.tsx`
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PartsTab.tsx`
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ExpensesTab.tsx`
- `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx`
- `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts` — new "Mi Taller" route
- New page: `src/app/dashboard/maintenance/taller/page.tsx` (technician shop view)

---

## Approaches

### Approach A: Line-Item Accordion (Full Fleetio Model)

Collapse all tabs into one scrollable "Trabajo" view. Each WorkOrderItem is an accordion row showing inline: labor entries, parts, subtasks, notes. Type badge (Interno/Externo) determines what fields appear inside.

- **Pros**: Zero tab-switching during execution. Technician sees everything in context. Industry-proven.
- **Cons**: Very large refactor. Requires rethinking how parts and subtasks are nested under items in the UI. Accordion with editable inline content is complex.
- **Effort**: High (3–4 weeks if incremental)

### Approach B: 3-Tab Consolidation (Recommended)

Keep tabs but consolidate from 5 → 3, and fix the conceptual split:

**Tab 1 — "Trabajo"** (replaces InternalWork + Services + Parts):

- Unified item list split by origin (internal vs external) using a visual toggle or section headers
- Each item expandable with subtasks + inline hour/part input
- "Agregar Item" with type selector (internal/external/part)

**Tab 2 — "Compras & Costos"** (replaces Expenses + Purchase Orders):

- Generated OCs linked to this WO
- WorkOrderExpenses (transport, tools, etc.)
- Auto-calculated cost summary card

**Tab 3 — "Actividad"** (enables the commented History tab):

- Status change log
- Comments
- Documents/photos

Plus: sticky header with status badge and primary action button (always visible).

- **Pros**: Big UX win with moderate effort. Preserves existing API structure. Enables gradual migration.
- **Cons**: Still tabs (not as immersive as full accordion). Two-step to get to costs.
- **Effort**: Medium (1.5–2 weeks)

### Approach C: Minimal Fixes Only

Fix the filter bug (items appearing in wrong tab), fix broken buttons, add sticky status, move status actions to header. Keep current 5-tab structure.

- **Pros**: Fastest. Zero architectural risk.
- **Cons**: Doesn't address the root UX problems. Items still isolated from their context.
- **Effort**: Low (2–3 days)

---

## Recommendation

**Approach B (3-Tab Consolidation) + Mi Taller sidebar entry.**

This is the right balance of ambition and deliverability. It solves the core UX failures (fragmented items, wrong tab routing, disconnected subtasks) without a full rewrite. The "Mi Taller" sidebar view for TECHNICIANs is the differentiating feature that no local competitor has — a purpose-built shop execution view.

Implementation order:

1. Fix header (sticky status + action button) — immediate win, 1 day
2. Build unified "Trabajo" tab — core redesign, 4–5 days
3. Build "Compras & Costos" tab — 2–3 days
4. Enable "Actividad" tab (History was already stubbed) — 1–2 days
5. New "Mi Taller" page for TECHNICIAN role — 3–4 days

---

## Risks

- **Filter logic fix is critical before visual redesign**: The current split between internal/external by itemSource is fragile. Must define clear business rules: what makes an item "internal" vs "external" at creation time.
- **InternalWorkTicket creation flow**: Current flow bundles all pending items into one ticket with 1hr each. New flow must allow per-item hour entry before ticket generation. API change needed.
- **No new DB migrations needed**: All data exists; this is purely UI restructuring + minor API additions.
- **AddItemDialog type parameter**: Currently forces `type="SERVICE"` in both InternalWorkTab and ServicesTab. New unified tab needs a type selector at creation.
- **TECHNICIAN permissions**: "Mi Taller" page must respect role guards — TECHNICIAN can only see WOs where they are the assigned technician.

---

## Ready for Proposal

Yes. Recommend proceeding with Approach B + Mi Taller sidebar view.
