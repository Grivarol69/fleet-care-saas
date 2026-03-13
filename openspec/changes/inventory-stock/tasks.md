# Tasks: Inventory Stock Module

## Phase 1: Backend — Endpoints

- [x] 1.1 Modificar `src/app/api/inventory/items/route.ts` (GET): agregar filtro `warehouse` (`whereClause.warehouse = warehouse`) y filtro `lowStock` (`whereClause.quantity = { lte: tenantPrisma.inventoryItem.fields.minStock }` — usar raw o post-filter). Mantener todos los filtros existentes.
- [x] 1.2 Crear `src/app/api/inventory/items/[id]/route.ts` con:
  - `GET`: busca `inventoryItem` por `id` con `tenantPrisma` (aislamiento automático), incluye `masterPart` y `movements` paginados (query param `page`, `pageSize=20`, ordenados por `performedAt DESC`). Retorna `{ item, movements, pagination }`. Si no existe → 404. Serializa Decimals.
  - `PATCH`: acepta sólo `{ minStock?, maxStock?, location?, warehouse? }`. Ignora cualquier otro campo. Valida `maxStock > minStock` si ambos presentes. Requiere `canManagePurchases(user)` → 403 si no. Retorna ítem actualizado.
- [x] 1.3 Crear `src/app/api/inventory/adjustments/route.ts` con `POST`:
  - Valida body: `inventoryItemId` (string), `type` (`ADJUSTMENT_IN` | `ADJUSTMENT_OUT`), `quantity` (> 0), `unitCost` (requerido y > 0 si `ADJUSTMENT_IN`), `notes` (mínimo 5 caracteres).
  - Requiere `canManagePurchases(user)` → 403 si no.
  - Busca el `InventoryItem` con `tenantPrisma` — 404 si no existe.
  - Ejecuta `$transaction`: recalcula `averageCost` / `totalValue` / `quantity` con la misma lógica de `/api/inventory/movements` (líneas 61-137). Crea `InventoryMovement` con `referenceType: 'MANUAL_ADJUSTMENT'`, `referenceId: 'MANUAL'`, `performedBy: user.id`, y `notes` del body.
  - Si `ADJUSTMENT_OUT` deja `quantity < 0` → 422 con mensaje.
  - Retorna `{ movement, updatedItem }` con status 201.

## Phase 2: UI — Tipos y Zod Schemas

- [x] 2.1 Crear `src/app/dashboard/inventory/stock/components/StockList/StockList.types.ts` con:
  - `InventoryItemRow`: tipo con todos los campos de `InventoryItem` + `masterPart: { id, code, description, unit }`, Decimals como `number`.
  - `StockListProps`: `{ initialItems: InventoryItemRow[]; userCanManage: boolean }`
- [x] 2.2 Crear `src/app/dashboard/inventory/stock/components/ItemDetailSheet/ItemDetailSheet.types.ts` con:
  - `MovementRow`: `{ id, movementType, quantity, unitCost, totalCost, previousStock, newStock, referenceType, notes, performedAt }`
  - `ItemDetailSheetProps`: `{ item: InventoryItemRow | null; open: boolean; onOpenChange: (v: boolean) => void; userCanManage: boolean; onItemUpdated: (item: InventoryItemRow) => void }`
- [x] 2.3 Crear `src/app/dashboard/inventory/stock/components/AdjustmentDialog/AdjustmentDialog.form.ts` con Zod schema:
  - `type`: enum `['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']`
  - `quantity`: `z.number().positive()`
  - `unitCost`: `z.number().positive().optional()` — con `.superRefine()` que lo hace requerido si `type === 'ADJUSTMENT_IN'`
  - `notes`: `z.string().min(5, 'Las notas deben tener al menos 5 caracteres')`
- [x] 2.4 Crear `src/app/dashboard/inventory/stock/components/ThresholdsDialog/ThresholdsDialog.form.ts` con Zod schema:
  - `minStock`: `z.number().min(0)`
  - `maxStock`: `z.number().positive().optional().nullable()`
  - `location`: `z.string().optional().nullable()`
  - Con `.refine()` que valida `maxStock > minStock` si ambos presentes.

## Phase 3: UI — Componentes

- [x] 3.1 Crear `src/app/dashboard/inventory/stock/components/AdjustmentDialog/AdjustmentDialog.tsx`:
  - Props: `{ open, onOpenChange, item: InventoryItemRow, onSuccess: (updatedItem: InventoryItemRow) => void }`
  - Formulario con `react-hook-form` + schema de 2.3.
  - Campo `type`: `Select` con opciones "Entrada" / "Salida".
  - Campo `unitCost`: visible y requerido solo cuando `type === 'ADJUSTMENT_IN'`.
  - Al submit: `axios.post('/api/inventory/adjustments', body)` → en 201 llama `onSuccess(response.data.updatedItem)` y cierra. En 422 muestra toast destructivo sin cerrar.
  - Barrel: `src/app/dashboard/inventory/stock/components/AdjustmentDialog/index.ts`

- [x] 3.2 Crear `src/app/dashboard/inventory/stock/components/ThresholdsDialog/ThresholdsDialog.tsx`:
  - Props: `{ open, onOpenChange, item: InventoryItemRow, onSuccess: (updatedItem: InventoryItemRow) => void }`
  - Formulario con `react-hook-form` + schema de 2.4. Valores iniciales del `item`.
  - Al submit: `axios.patch('/api/inventory/items/${item.id}', body)` → en 200 llama `onSuccess(response.data)` y cierra.
  - Barrel: `src/app/dashboard/inventory/stock/components/ThresholdsDialog/index.ts`

- [x] 3.3 Crear `src/app/dashboard/inventory/stock/components/ItemDetailSheet/ItemDetailSheet.tsx`:
  - Usa `Sheet`, `SheetContent`, `SheetHeader` de `@/components/ui/sheet`.
  - Al abrir (`open === true`): `useEffect` fetcha `GET /api/inventory/items/${item.id}?page=1` y setea `movements + pagination`.
  - Sección superior: datos del ítem (parte, almacén, cantidad, mínimo, máximo, costo prom, valor total).
  - Tabla de movimientos: columnas `Tipo | Cantidad | Costo Unit. | Stock anterior → nuevo | Fecha`. Paginación simple (botones Anterior/Siguiente).
  - Botones "Editar umbrales" y "Ajuste manual" visibles sólo si `userCanManage`. Abren los dialogs de 3.1 y 3.2.
  - En `onSuccess` de ambos dialogs: actualiza el ítem local + recarga historial + llama `onItemUpdated(updatedItem)`.
  - Barrel: `src/app/dashboard/inventory/stock/components/ItemDetailSheet/index.ts`

- [x] 3.4 Crear `src/app/dashboard/inventory/stock/components/StockList/StockList.tsx`:
  - `'use client'`. Props de `StockListProps` (2.1).
  - Estado: `data`, `loading`, `search`, `statusFilter`, `lowStockOnly`, `selectedItem`, `sheetOpen`.
  - Filtros debounced con `useRef<setTimeout>` (350ms) → re-fetcha `GET /api/inventory/items` con params.
  - TanStack Table con columnas: Código (`font-mono text-xs`), Descripción, Almacén, Cantidad, Mínimo, Valor Total (formateado `es-CO COP`), Estado (Badge: verde=ACTIVE, amarillo=LOW_STOCK, rojo=OUT_OF_STOCK, gris=DISCONTINUED).
  - Fila con `quantity <= minStock` debe tener clase CSS de fondo naranja claro (`bg-orange-50`).
  - Click en fila → `setSelectedItem(row.original); setSheetOpen(true)`.
  - Header: `Input` búsqueda + `Select` estado + `Switch` "Solo bajo mínimo".
  - Renderiza `ItemDetailSheet` con `onItemUpdated` que actualiza la fila en `data`.
  - Barrel: `src/app/dashboard/inventory/stock/components/StockList/index.ts`

## Phase 4: UI — Página y Sidebar

- [x] 4.1 Crear `src/app/dashboard/inventory/stock/page.tsx` (Server Component):
  - `getCurrentUser()` → redirect si no autenticado.
  - Verificar que `user.role` no sea `DRIVER` → redirect a `/dashboard` si es DRIVER.
  - `tenantPrisma.inventoryItem.findMany({ include: { masterPart: true }, orderBy: { masterPart: { description: 'asc' } } })`.
  - Serializar todos los Decimal fields a `Number()` antes de pasar al Client Component.
  - Pasar `userCanManage={canManagePurchases(user)}` a `StockList`.
  - Layout con header: `h1` "Stock de Inventario" + `p` descripción.

- [x] 4.2 Modificar `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`:
  - En el array `subItems` de la sección `Inventario` (Package icon), agregar después de "Catálogo de Partes":
    ```ts
    {
      label: 'Stock',
      href: '/dashboard/inventory/stock',
      roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.COORDINATOR, UserRole.PURCHASER, UserRole.TECHNICIAN],
    }
    ```

## Phase 5: Tests

- [ ] 5.1 En `src/app/api/inventory/__tests__/inventory-lifecycle.test.ts`, agregar tests para `GET /api/inventory/items` con los filtros nuevos:
  - Test: `?lowStock=true` retorna sólo ítems con `quantity <= minStock`.
  - Test: `?warehouse=DEPOSITO` retorna sólo ítems del almacén indicado.

- [ ] 5.2 En el mismo archivo, agregar tests para `GET /api/inventory/items/[id]`:
  - Test: ítem del tenant propio → 200 con `{ item, movements, pagination }`.
  - Test: ítem de otro tenant → 404.
  - Test: id inexistente → 404.

- [ ] 5.3 En el mismo archivo, agregar tests para `PATCH /api/inventory/items/[id]`:
  - Test: MANAGER actualiza `minStock=10` → 200, campo actualizado.
  - Test: campo `quantity` en body → no modifica `quantity` en DB.
  - Test: TECHNICIAN → 403.

- [ ] 5.4 En el mismo archivo, agregar tests para `POST /api/inventory/adjustments`:
  - Test: `ADJUSTMENT_IN` → costo promedio recalculado correctamente, movimiento creado.
  - Test: `ADJUSTMENT_OUT` exitoso → `quantity` reducida.
  - Test: `ADJUSTMENT_OUT` con cantidad mayor al stock → 422.
  - Test: `notes` vacío → 400.
  - Test: TECHNICIAN → 403.
  - Test: `inventoryItemId` de otro tenant → 404.
