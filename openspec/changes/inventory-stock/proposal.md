# Proposal: Inventory Stock Module

## Intent

El módulo de Inventario actual sólo tiene Catálogo de Partes (`/inventory/parts`) y Compras (`/inventory/purchases`). No existe UI para gestionar el **stock real** del tenant: cuántas unidades hay en almacén, cuándo se consume, cuándo entra material.

El schema ya tiene `InventoryItem` y `InventoryMovement` listos. Falta el módulo de dashboard y los endpoints que los expongan correctamente para la gestión operativa del día a día.

## Scope

### In Scope
- Página `/dashboard/inventory/stock` — lista de ítems de stock con cantidades, alertas de mínimos, valor total
- Panel de detalle de ítem — movimientos históricos, editar umbrales, ajuste manual de stock
- API `GET /api/inventory/items` — lista con filtros (estado, almacén, bajo mínimo)
- API `GET /api/inventory/items/[id]` — detalle con movimientos paginados
- API `PATCH /api/inventory/items/[id]` — editar `minStock`, `maxStock`, `location`, `warehouse`
- API `POST /api/inventory/adjustments` — ajuste manual de stock (entrada/salida administrativa)
- Sidebar entry: "Stock" bajo "Inventario" visible para MANAGER, PURCHASER, TECHNICIAN
- Alertas visuales cuando `quantity <= minStock`

### Out of Scope
- Integración automática con Compras (eso es un movimiento, ya existe `/api/inventory/purchases`)
- Múltiples almacenes / transferencias entre almacenes
- Códigos QR / scaneo
- Reportes de valorización / contabilidad

## Approach

El schema ya está completo. El trabajo es principalmente UI + completar los endpoints que faltan:

1. **APIs faltantes**: Agregar `GET/PATCH /api/inventory/items/[id]` y `POST /api/inventory/adjustments`
2. **Página Stock**: Tabla con columnas: Parte, Código, Almacén, Cantidad, Mínimo, Valor, Estado
3. **Filtros**: por estado (ACTIVE/INACTIVE), por almacén, por "bajo mínimo"
4. **Panel detalle**: Sheet lateral con historial de movimientos + form de edición de umbrales
5. **Ajuste manual**: Dialog para ingreso/egreso administrativo con nota obligatoria
6. **Sidebar**: Agregar "Stock" en `SidebarRoutes.data.ts`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/dashboard/inventory/stock/` | New | Página principal de stock + componentes |
| `src/app/api/inventory/items/[id]/route.ts` | New | GET detalle + PATCH umbrales |
| `src/app/api/inventory/adjustments/route.ts` | New | POST ajuste manual |
| `src/app/api/inventory/items/route.ts` | Modified | Mejorar filtros y respuesta |
| `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts` | Modified | Agregar "Stock" |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `averageCost` y `totalValue` desincronizados si se hace ajuste manual | Med | El endpoint de ajuste recalcula ambos campos usando costo promedio ponderado |
| Permisos: TECHNICIAN puede ver stock pero ¿puede ajustar? | Low | Solo MANAGER y PURCHASER pueden hacer ajustes manuales |
| `InventoryItem` ya tiene registros de compras previas sin UI — datos inconsistentes | Low | La UI simplemente lee lo que ya hay; ajustes manuales son aditivos |

## Rollback Plan

Todo es additive (nuevas páginas y endpoints). Para revertir: eliminar los archivos nuevos en `stock/` y `adjustments/route.ts`. El schema no cambia.

## Dependencies

- Schema `InventoryItem` y `InventoryMovement` ya existen y tienen migración aplicada
- `MasterPart` debe existir para cada `InventoryItem` (ya garantizado por FK)
- `MovementType` enum ya existe: `PURCHASE`, `CONSUMPTION`, `ADJUSTMENT`, `TRANSFER`, `RETURN`

## Success Criteria

- [ ] La página `/inventory/stock` muestra todos los `InventoryItem` del tenant con cantidades correctas
- [ ] Ítems con `quantity <= minStock` se marcan visualmente en rojo/naranja
- [ ] Un MANAGER puede editar `minStock` y `maxStock` desde la UI
- [ ] Un PURCHASER puede hacer ajuste manual (entrada/salida) y aparece en historial de movimientos
- [ ] TECHNICIAN puede ver el stock pero no puede ajustar
- [ ] El sidebar muestra "Stock" bajo Inventario para roles con acceso
