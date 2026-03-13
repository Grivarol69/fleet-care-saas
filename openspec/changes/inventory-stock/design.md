# Design: Inventory Stock Module

## Technical Approach

Additive puro sobre el schema existente. El pattern del proyecto es:
1. **Server Component** (page.tsx) — fetch inicial de datos, serializa Decimals a `Number()`
2. **Client Component** (PartsList.tsx, etc.) — recibe `initialData`, re-fetcha via `axios` al filtrar

El módulo stock replica este patrón con un componente principal `StockList` que carga la tabla y abre un `Sheet` de detalle. El Sheet contiene el historial de movimientos (fetch lazy al abrir) y los dos dialogs: editar umbrales y ajuste manual.

Los dos endpoints faltantes (`GET/PATCH /api/inventory/items/[id]` y `POST /api/inventory/adjustments`) siguen el mismo patrón `requireCurrentUser → tenantPrisma → response`.

---

## Architecture Decisions

### Decision: `POST /api/inventory/adjustments` vs reusar `POST /api/inventory/movements`

**Choice**: Crear endpoint dedicado `/api/inventory/adjustments`
**Alternatives considered**: Llamar directamente a `/api/inventory/movements` desde la UI de ajuste
**Rationale**: `/api/inventory/movements` requiere `referenceType` y `referenceId` (campos de integración interna), no valida `notes`, y acepta todos los tipos de movimiento. Un endpoint dedicado simplifica la UI, valida notas obligatorias, y restringe a `ADJUSTMENT_IN` / `ADJUSTMENT_OUT` con `referenceType: 'MANUAL_ADJUSTMENT'` autoasignado.

### Decision: Sheet lateral para detalle (no página propia)

**Choice**: Sheet (`@/components/ui/sheet`) al hacer clic en una fila
**Alternatives considered**: Ruta `/dashboard/inventory/stock/[id]` con página propia
**Rationale**: Mismo patrón que `TallerCard` y WorkOrderDetail. El contexto de un ajuste de stock es operativo y rápido — no justifica navegación. El Sheet permite ver historial y actuar sin perder el contexto de la lista.

### Decision: Historial de movimientos: fetch lazy al abrir Sheet

**Choice**: `useEffect` en el Sheet que fetcha `/api/inventory/items/[id]?page=1` al montar
**Alternatives considered**: Incluir movimientos en la respuesta de la lista (costoso)
**Rationale**: La lista puede tener muchos ítems; incluir movimientos en cada row sería excesivo. El fetch lazy es el mismo patrón que `WorkOrderDetail` (cada tab fetcha su data al montarse).

### Decision: Status del InventoryItem — calculado en backend, no en frontend

**Choice**: El backend recalcula `status` en cada update (ACTIVE / LOW_STOCK / OUT_OF_STOCK)
**Alternatives considered**: Calcularlo en el frontend basado en `quantity` y `minStock`
**Rationale**: Ya está implementado en `/api/inventory/movements` (líneas 130-136). El endpoint de ajustes seguirá el mismo patrón. La UI solo muestra el `status` devuelto por la API.

---

## Data Flow

### Carga inicial de la página

```
page.tsx (Server)
  └─ tenantPrisma.inventoryItem.findMany({ include: masterPart })
  └─ serializa Decimals a Number()
  └─ pasa { initialItems, userCanManage } a StockList
```

### Re-fetch al filtrar (client-side)

```
StockList (Client)
  └─ debounced search / status filter / lowStock toggle
  └─ axios.get('/api/inventory/items?search=&status=&lowStock=')
  └─ API GET /api/inventory/items → tenantPrisma.inventoryItem.findMany
  └─ setData(response.data)
```

### Abrir Sheet de detalle

```
StockList click fila
  └─ setSelectedItem(item) → Sheet abre
  └─ ItemDetailSheet monta → useEffect fetchDetail()
  └─ axios.get('/api/inventory/items/[id]?page=1')
  └─ API GET /api/inventory/items/[id] → { item, movements, total }
  └─ renderiza datos + historial
```

### Ajuste manual

```
ItemDetailSheet → "Ajuste manual" button
  └─ AdjustmentDialog abre
  └─ usuario llena form (type, quantity, unitCost?, notes)
  └─ axios.post('/api/inventory/adjustments', body)
  └─ API POST → $transaction → inventoryItem.update + inventoryMovement.create
  └─ 201 → Dialog cierra → Sheet actualiza item + historial
```

### Editar umbrales

```
ItemDetailSheet → "Editar umbrales" button
  └─ ThresholdsDialog abre
  └─ axios.patch('/api/inventory/items/[id]', { minStock, maxStock, location })
  └─ API PATCH → inventoryItem.update (solo campos permitidos)
  └─ 200 → Dialog cierra → Sheet y tabla actualizan item
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/dashboard/inventory/stock/page.tsx` | Create | Server Component — fetch inicial + permisos |
| `src/app/dashboard/inventory/stock/components/StockList/StockList.tsx` | Create | Client Component principal — tabla + filtros |
| `src/app/dashboard/inventory/stock/components/StockList/StockList.types.ts` | Create | Tipos: `StockListProps`, `InventoryItemRow` |
| `src/app/dashboard/inventory/stock/components/StockList/index.ts` | Create | Barrel export |
| `src/app/dashboard/inventory/stock/components/ItemDetailSheet/ItemDetailSheet.tsx` | Create | Sheet lateral — detalle + historial de movimientos |
| `src/app/dashboard/inventory/stock/components/ItemDetailSheet/ItemDetailSheet.types.ts` | Create | Tipos del Sheet |
| `src/app/dashboard/inventory/stock/components/ItemDetailSheet/index.ts` | Create | Barrel export |
| `src/app/dashboard/inventory/stock/components/AdjustmentDialog/AdjustmentDialog.tsx` | Create | Dialog ajuste manual |
| `src/app/dashboard/inventory/stock/components/AdjustmentDialog/AdjustmentDialog.form.ts` | Create | Zod schema del form |
| `src/app/dashboard/inventory/stock/components/AdjustmentDialog/index.ts` | Create | Barrel export |
| `src/app/dashboard/inventory/stock/components/ThresholdsDialog/ThresholdsDialog.tsx` | Create | Dialog editar umbrales |
| `src/app/dashboard/inventory/stock/components/ThresholdsDialog/ThresholdsDialog.form.ts` | Create | Zod schema (minStock, maxStock, location) |
| `src/app/dashboard/inventory/stock/components/ThresholdsDialog/index.ts` | Create | Barrel export |
| `src/app/api/inventory/items/[id]/route.ts` | Create | GET detalle + PATCH umbrales |
| `src/app/api/inventory/adjustments/route.ts` | Create | POST ajuste manual |
| `src/app/api/inventory/items/route.ts` | Modify | Agregar filtros `warehouse` y `lowStock` |
| `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts` | Modify | Agregar subItem "Stock" en sección Inventario |

---

## Interfaces / Contracts

### `InventoryItemRow` (client-side)

```ts
type InventoryItemRow = {
  id: string;
  masterPartId: string;
  warehouse: string;
  location: string | null;
  quantity: number;       // serializado desde Decimal
  minStock: number;
  maxStock: number | null;
  averageCost: number;
  totalValue: number;
  status: InventoryStatus;
  masterPart: {
    id: string;
    code: string;
    description: string;
    unit: string;
  };
};
```

### `GET /api/inventory/items` — query params añadidos

```
?search=string
?status=ACTIVE|LOW_STOCK|OUT_OF_STOCK|DISCONTINUED
?warehouse=string
?lowStock=true            // nuevo: quantity <= minStock
```

### `GET /api/inventory/items/[id]` — response

```ts
{
  item: InventoryItemRow;
  movements: {
    id: string;
    movementType: MovementType;
    quantity: number;
    unitCost: number;
    totalCost: number;
    previousStock: number;
    newStock: number;
    referenceType: string;
    notes: string | null;
    performedAt: string;  // ISO
  }[];
  pagination: { total: number; page: number; pageSize: number };
}
```

### `PATCH /api/inventory/items/[id]` — body (campos permitidos)

```ts
{
  minStock?: number;   // >= 0
  maxStock?: number;   // > minStock si presente
  location?: string;
  warehouse?: string;
}
```

### `POST /api/inventory/adjustments` — body

```ts
{
  inventoryItemId: string;
  type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;      // > 0
  unitCost?: number;     // requerido si type === ADJUSTMENT_IN
  notes: string;         // mínimo 5 caracteres
}
```

Response 201:
```ts
{
  movement: InventoryMovement;
  updatedItem: InventoryItemRow;
}
```

### Sidebar subItem a agregar

```ts
{
  label: 'Stock',
  href: '/dashboard/inventory/stock',
  roles: [
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.COORDINATOR,
    UserRole.PURCHASER,
    UserRole.TECHNICIAN,
  ],
}
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | `GET /api/inventory/items` filtros nuevos | Test en `inventory-lifecycle.test.ts` existente |
| Integration | `GET /api/inventory/items/[id]` — aislamiento tenant | Test nuevo en mismo archivo |
| Integration | `PATCH /api/inventory/items/[id]` — permisos, campos ignorados | Test nuevo |
| Integration | `POST /api/inventory/adjustments` — costo promedio, stock negativo, notes | Test nuevo |
| Unit | Zod schema `AdjustmentDialog.form.ts` | Inline con vitest |

---

## Migration / Rollout

No migration required. El schema ya existe con migración aplicada. Todo es additive.

---

## Open Questions

- Ninguna. El diseño está completo para proceder a tasks.
