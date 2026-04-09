# Proposal: Work Order UX Redesign — "La OT que los usuarios van a amar"

## Intent

El módulo de Órdenes de Trabajo es el corazón operativo de Fleet Care SaaS. Hoy tiene dos problemas críticos:

1. **Fragmentación cognitiva**: El operador salta entre 5 tabs para completar una sola tarea. Un servicio externo puede aparecer en "Taller Propio" Y en "Servicios Externos" simultáneamente por un bug en la lógica de filtro por `itemSource`. Las subtareas están desconectadas visualmente de sus items.

2. **El técnico no tiene su espacio**: El TECHNICIAN ve la misma interfaz de gestión que el MANAGER. No existe una vista de ejecución optimizada para el taller — la oportunidad diferenciadora más clara frente a la competencia.

El objetivo es convertir la OT en la herramienta que los usuarios pidan usar en vez de evitar.

## Scope

### In Scope

**Fase 1 — Header inteligente (foundation)**

- Header sticky con: estado de la OT (badge clickable), vehículo, técnico asignado, y botón de acción primaria contextual (Iniciar / Completar / Cerrar) siempre visible
- Eliminar acciones de estado del GeneralInfoTab y consolidarlas en el header

**Fase 2 — Tab "Trabajo" unificado**

- Reemplaza: `InternalWorkTab` + `ServicesTab` + `PartsTab`
- Sección "Taller Propio": items internos con subtasks expandibles inline bajo cada item
- Sección "Servicios & Repuestos Externos": items externos con OC vinculada o generación de OC
- Cada item expandible muestra: descripción, subtasks checklist, labor entries, observaciones
- Dialog de "Agregar Item" con selector de destino: Taller / Externo / Repuesto
- Flujo de generación de ticket interno rediseñado: entrada de horas por item antes de confirmar

**Fase 3 — Tab "Compras & Costos"**

- Reemplaza: `ExpensesTab` + PurchaseOrdersTab (que estaba comentado)
- Card de resumen de costos auto-calculado: labor + repuestos + externos + gastos adicionales
- Lista de OCs vinculadas a esta OT
- Gastos adicionales (transporte, herramientas, etc.) — el ExpensesTab actual

**Fase 4 — Tab "Actividad"**

- Habilita el HistoryTab que estaba comentado
- Timeline cronológica de cambios de estado, comentarios y documentos
- Input de comentario con soporte de notas libres

**Fase 5 — "Mi Taller" en Sidebar (diferenciador)**

- Nueva ruta `/dashboard/maintenance/taller` en Sidebar (visible para TECHNICIAN, MANAGER, OWNER)
- Vista de las OTs con trabajo de taller asignado al técnico logueado
- Cards de OT con: vehículo, título, lista de tareas pendientes, progreso visual (3/7 done)
- Click en tarea → detalle inline ejecutable (no navega a otra página)
- Optimizada para pantalla completa en tablet de taller

### Out of Scope

- Timer de reloj (start/stop timer persistente) — deferido para siguiente iteración
- Modo offline — requiere Service Worker, fuera de alcance
- Adjuntar fotos por subtarea — deferido
- Vendor portal (acceso externo para proveedores) — futuro
- Migración de datos ni cambios de schema Prisma

## Approach

**3-Tab Consolidation + Mi Taller sidebar view** (Approach B de exploration).

Se mantiene la arquitectura de tabs pero se reduce de 5 → 3 tabs con semántica clara. No hay nuevas migraciones de DB. Los cambios son exclusivamente UI + minor API additions para soportar los nuevos flujos.

Regla de negocio para clasificar items (fix del bug actual):

- Item **interno** = `itemSource === 'INTERNAL_STOCK'` OR `mantItemType` is ACTION/SERVICE sin itemSource con intención de taller
- Item **externo** = `itemSource === 'EXTERNAL'` OR `closureType === 'PURCHASE_ORDER'`
- Al crear un item, el usuario elige explícitamente el destino — se persiste en `itemSource` inmediatamente, eliminando el estado ambiguo PENDING sin source.

## Affected Areas

| Area                                                                                       | Impact   | Description                                                           |
| ------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------- |
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`                                  | Modified | Header sticky + reducción a 3 tabs                                    |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/GeneralInfoTab.tsx`  | Modified | Eliminar botones de estado → header. Mantener campos de info          |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/InternalWorkTab.tsx` | Replaced | Nuevo `WorkTab.tsx` unificado que absorbe Internal + Services + Parts |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ServicesTab.tsx`     | Removed  | Absorbido por WorkTab                                                 |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PartsTab.tsx`        | Removed  | Absorbido por WorkTab                                                 |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ExpensesTab.tsx`     | Replaced | Nuevo `CostsTab.tsx` con OCs + Expenses + resumen auto-calculado      |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx`   | Modified | Agregar selector de destino (interno/externo/repuesto)                |
| `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`                                | Modified | Nueva ruta "Mi Taller" bajo Mantenimiento                             |
| `src/app/dashboard/maintenance/taller/page.tsx`                                            | New      | Vista de ejecución para técnicos de taller                            |
| `src/app/dashboard/maintenance/taller/components/`                                         | New      | TallerCard, TaskChecklist, etc.                                       |

## Risks

| Risk                                                                    | Likelihood | Mitigation                                                                                                                                             |
| ----------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Items en estado ambiguo (PENDING sin itemSource) en datos existentes    | Med        | Al renderizar, items sin itemSource se clasifican como "internos" por defecto (comportamiento más seguro). Se muestra badge "Sin clasificar" editable. |
| Ticket interno: cambio en flujo de creación rompe datos existentes      | Low        | Solo cambia la UI del dialog; la API `POST /api/internal-tickets` no cambia. Los tickets existentes se siguen mostrando.                               |
| AddItemDialog: cambio de type parameter puede crear items mal tipados   | Low        | Agregar validación en la API de items para rechazar items sin `itemSource` explícito al crear.                                                         |
| Mi Taller: TECHNICIAN ve OTs de otros si la API no filtra correctamente | Med        | `GET /api/maintenance/work-orders` ya acepta filtros; agregar `?assignedTo=me` que use el `userId` de la sesión.                                       |

## Rollback Plan

Todos los componentes eliminados (ServicesTab, PartsTab) se conservan en el repo hasta que la Fase 2 esté verificada. El page.tsx puede restaurarse al snapshot anterior via git. No hay cambios de schema, por lo que no hay rollback de DB necesario.

```bash
# Rollback rápido si algo falla en producción
git revert <commit-hash-del-merge>
```

Las rutas existentes (`/dashboard/maintenance/work-orders`) no cambian — solo se modifica el contenido renderizado.

## Dependencies

- El módulo de `internal-tickets` y su API deben seguir funcionando (no se toca la API, solo la UI del dialog)
- `src/lib/permissions.ts` debe exponer utilidad para verificar si el user es el técnico asignado (ya existe via `requireCurrentUser()`)

## Success Criteria

- [ ] Un operador puede agregar un item de taller Y ver sus subtareas expandidas SIN cambiar de tab
- [ ] Al agregar un servicio externo, aparece SOLO en la sección "Externos" — nunca en "Taller"
- [ ] El botón de acción primaria (Iniciar/Completar) es visible desde CUALQUIER tab sin scroll
- [ ] La generación de ticket interno permite ingresar horas por item antes de confirmar
- [ ] El tab "Compras & Costos" muestra el costo total auto-calculado (sin campo manual)
- [ ] Un TECHNICIAN que entra a "Mi Taller" ve únicamente sus OTs asignadas con tareas pendientes
- [ ] No hay regresiones en el flujo de generación de OC de servicios externos
- [ ] TypeScript type-check sin errores nuevos (`pnpm type-check`)
