# Proposal: OT Flow Redesign — Claridad operativa, control de costos, trazabilidad

## Intent

El módulo de Órdenes de Trabajo es el core del negocio. Su problema actual no es el backend
(ya robusto con 100+ endpoints) sino el flujo mental del operador: no queda claro qué es una OT,
qué le falta, cuánto está costando, ni cómo cerrarla.

La versión anterior (archivada 2026-03-10) consolidó 5 tabs → 3 tabs y resolvió bugs de
clasificación. Este rediseño incorpora las lecciones aprendidas y añade:

1. **Tab Cierre**: vista de auditoría/gerencial que consolida todo lo necesario para tomar
   la decisión de cerrar y registrar en el historial contable.
2. **Compras como eje transversal**: las OCs sirven tanto a trabajos internos como externos,
   por lo que tienen su propio tab en vez de vivir dentro de cada sección.
3. **Simplificación del tempario**: sin auto-expansión de recetas, solo carga manual de ítems.
4. **Búsqueda de servicios rediseñada**: combobox rápido en vez de dialog pesado.
5. **Arquitectura de sidebar unificada**: la OT sigue siendo una unidad atómica en la
   navegación — no se separa en rutas distintas por tipo.

---

## Scope

### In Scope

**Fase A — Estructura: 6 tabs en página de detalle**
- Reestructurar `[id]/page.tsx` de 4 tabs → 6 tabs: Resumen, Taller Propio, Trabajos Externos, Compras, Cierre, Actividad
- Extraer lógica de `WorkTab.tsx` en dos componentes separados: `TallerPropioTab.tsx` y `TrabajosExternosTab.tsx`
- Renombrar/refactorizar `CostsTab.tsx` → `ComprasTab.tsx` (OCs + facturas + gastos)
- Crear `ResumenTab.tsx` (info consolidada + mini-panel de costos + progreso)
- Crear `CierreTab.tsx` (vista de auditoría + checklist de cierre + botón cerrar)

**Fase B — Tab Taller Propio**
- Búsqueda de servicios/MantItems con combobox rápido (Command + Popover, como wizard)
- Eliminar auto-expansión de tempario: solo carga manual desde `TemparioPickerModal`
- Remover `noRecipe` state y el POST a `/subtasks/expand` del flujo normal
- Mantener `WorkItemRow` con subtareas editables inline
- Renombrar botón "Cargar Subtarea" a algo más descriptivo: "Agregar desde Tempario"

**Fase C — Tab Trabajos Externos + refactor ComprasTab**
- `TrabajosExternosTab.tsx`: lista items EXTERNAL (servicios y repuestos), con referencia a OC
- Los checkboxes de selección para generar OC permanecen aquí
- `ComprasTab.tsx`: OCs generadas (desde cualquier fuente), facturas vinculadas, gastos varios
- Calcular totales por sección en ComprasTab (comprometido en OCs / facturado / pendiente)

**Fase D — Tab Cierre**
- `CierreTab.tsx`: vista de solo lectura (salvo acción de cierre)
- Checklist automático de ítems bloqueantes (items sin resolver, OCs sin factura, etc.)
- Desglose consolidado: labor interna, repuestos internos, servicios externos, repuestos externos, gastos
- Eliminar campo manual `actualCost` en `GeneralInfoTab`; el costo real se calcula aquí
- Botón "Cerrar OT" visible solo cuando checklist está limpio (para OWNER/SUPERVISOR/MANAGER)

### Out of Scope

- Cambios de schema Prisma (no se agrega `technicianId` a `WorkOrderItem` — un técnico por OT)
- Auto-expansión de recetas/despiece desde tempario (se incorpora en iteración futura)
- Timer de reloj por subtarea (deferido)
- Adjuntar fotos a subtareas (deferido)
- Vista "Mi Taller" en sidebar — ya está implementada y tiene su propio spec; no se toca
- Separación de OT Interna / OT Externa en sidebar (decisión: se mantiene unificada)
- Flujo de recepción de repuesto externo en inventario (requiere nuevo backend; fase futura)

---

## Approach

**6-Tab Unified Detail + Transversal Purchases Tab**

La unidad de navegación sigue siendo la OT única. Los tabs van de lo general a lo particular:

```
[ Resumen ] → [ Taller Propio ] → [ Trabajos Externos ] → [ Compras ] → [ Cierre ] [ Actividad ]
```

- Los tabs 2 y 3 son el "dónde se hace el trabajo"
- El tab 4 es el "cómo se compra lo que se necesita" (transversal a internos y externos)
- El tab 5 es la "vista gerencial/auditoría para cerrar"
- El tab 6 es el historial (ya implementado, sin cambios)

No hay nuevas migraciones de DB. Todos los cambios son UI + reorganización de componentes
existentes. El backend ya soporta todo lo necesario.

---

## Affected Areas

| Area | Impact | Descripción |
|------|--------|-------------|
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx` | Modified | 4 tabs → 6 tabs, imports actualizados |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkTab.tsx` | Replaced | Se divide en TallerPropioTab + TrabajosExternosTab |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/TallerPropioTab.tsx` | New | Items internos, búsqueda combobox, carga manual tempario |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/TrabajosExternosTab.tsx` | New | Items externos, checkbox de selección para OC |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ResumenTab.tsx` | New | Mini-panel consolidado de progreso + costos acumulados |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/CierreTab.tsx` | New | Vista auditoría + checklist + botón cerrar |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab.tsx` | New (rename) | Renombre + refactor de CostsTab: OCs + facturas + gastos |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/CostsTab.tsx` | Replaced | Reemplazado por ComprasTab |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx` | Modified | Búsqueda via combobox rápido en vez de select plano |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkItemRow.tsx` | Modified | Remover auto-expand, simplificar botones de subtarea |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/GeneralInfoTab.tsx` | Modified | Eliminar campo manual actualCost; datos pasan a ResumenTab |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `WorkTab.tsx` existente tiene lógica de OC embedded; al dividir puede romperse el flujo de checkboxes | Med | Mover exactamente la lógica de `selectedExternalIds` + `handleGenerateOC` a `TrabajosExternosTab`; no refactorizar la lógica, solo relocalizar |
| `CostsTab.tsx` ya muestra OCs y gastos; renombrarlo sin perder datos existentes | Low | Es renombre + ajuste de sección; la lógica de fetch no cambia |
| `CierreTab.tsx` calcula `actualCost` sumando desde ítems: si los totales en BD son inconsistentes, el número puede diferir del valor manual anterior | Med | Mostrar ambos valores en el período de transición; deprecar el campo manual tras verificar |
| `AddItemDialog.tsx` con combobox puede cambiar el tipo devuelto; items creados mal tipados | Low | No se toca la lógica de creación de items, solo se reemplaza el control de búsqueda |

---

## Rollback Plan

```bash
# Todos los archivos nuevos son aditivos (TallerPropioTab, TrabajosExternosTab, ResumenTab,
# CierreTab, ComprasTab). El WorkTab.tsx original se conserva hasta verificación de Fase B+C.
# El [id]/page.tsx puede revertirse al snapshot previo via:
git revert <commit-hash-fase-a>

# No hay cambios de schema, no hay rollback de DB necesario.
# Las rutas públicas no cambian: /dashboard/maintenance/work-orders/[id] sigue igual.
```

---

## Dependencies

- `WorkItemRow.tsx` y `TemparioPickerModal.tsx` ya funcionan; no se tocan en Fase A
- `InternalTicketDialog.tsx` sigue funcionando sin cambios
- `CostSummaryCard.tsx` puede reutilizarse en `CierreTab.tsx`
- El endpoint `GET /api/maintenance/work-orders/[id]` ya devuelve: items, OCs, facturas,
  expenses, internalWorkTickets — suficiente para calcular costos en `CierreTab`

---

## Success Criteria

- [ ] El operador puede ver en "Resumen" el costo acumulado y el progreso de ítems sin entrar a sub-tabs
- [ ] Tab "Taller Propio" muestra solo items INTERNAL_STOCK; nunca ítems externos
- [ ] Tab "Trabajos Externos" muestra solo items EXTERNAL; nunca ítems internos
- [ ] La búsqueda de servicios en AddItemDialog usa combobox; el operador encuentra un servicio en < 3 segundos
- [ ] No hay botón "Expandir Tempario" con comportamiento críptico; solo "Agregar desde Tempario" que abre el picker
- [ ] Tab "Compras" consolida OCs generadas desde cualquier flujo (interno o externo)
- [ ] Tab "Cierre" calcula el costo total automáticamente; no hay campo de costo real editable
- [ ] El botón "Cerrar OT" en tab Cierre solo se habilita cuando no hay ítems bloqueantes
- [ ] `pnpm type-check` sin errores nuevos
- [ ] `pnpm lint` sin errores nuevos
