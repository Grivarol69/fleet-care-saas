# tire-tracking-phase3 — Tasks

## Batch 1 (parallel)

- [x] 1A Create `AxleDiagram` component (SVG schematic with colored slots, hover tooltip, click callback)
  - `src/app/dashboard/tires/components/AxleDiagram/AxleDiagram.types.ts`
  - `src/app/dashboard/tires/components/AxleDiagram/AxleDiagram.tsx`
  - `src/app/dashboard/tires/components/AxleDiagram/index.ts`

- [x] 1B Create `GET /api/tires/vehicles-summary` endpoint
  - `src/app/api/tires/vehicles-summary/route.ts`
  - Returns: vehicles with installed tire slots, alert count, minUsefulLifePct

## Batch 2 (after Batch 1)

- [x] 2A Create `TireSlotDialog` — dialog shown when clicking an occupied slot
  - `src/app/dashboard/tires/components/TireSlotDialog/TireSlotDialog.types.ts`
  - `src/app/dashboard/tires/components/TireSlotDialog/TireSlotDialog.tsx`
  - `src/app/dashboard/tires/components/TireSlotDialog/index.ts`

- [x] 2B Create `SelectTireDialog` — dialog to pick IN_STOCK tire for empty slot
  - `src/app/dashboard/tires/components/SelectTireDialog/SelectTireDialog.types.ts`
  - `src/app/dashboard/tires/components/SelectTireDialog/SelectTireDialog.tsx`
  - `src/app/dashboard/tires/components/SelectTireDialog/index.ts`

- [x] 2C Create VehicleDetail (inline in page.tsx) — split view (AxleDiagram left, events panel right)
  - `src/app/dashboard/tires/components/VehicleDetail/VehicleDetail.types.ts`
  - `src/app/dashboard/tires/components/VehicleDetail/VehicleDetail.tsx`
  - `src/app/dashboard/tires/components/VehicleDetail/index.ts`

- [x] 2D Restructure `src/app/dashboard/tires/page.tsx` with Tabs with Tabs ("Vehículos" | "Inventario")
