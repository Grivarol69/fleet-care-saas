# Proposal: work-order-form-complete

## Intent

El backend de Work Orders está completo. El problema es exclusivamente la UI del formulario
de carga (`UnifiedWorkOrderForm`) y el flujo de estados (`WorkOrderHeader`). El form actual
tiene inputs crampeados, un inline de subtareas roto agregado por otro colaborador, y las
partes no usan el modal inteligente ya construido. El flujo de estados salta directamente
PENDING → IN_PROGRESS omitiendo la aprobación del Manager, y genera el ticket/OC en el
momento incorrecto (cierre en vez de aprobación).

## Scope

### In Scope

- **Fix inline roto**: eliminar "Añadir Tarea Manual" + su render inline; mantener solo "Cargar Despiece" via tempario
- **Rediseño visual servicios**: layout card vertical por servicio (legible, espaciado)
- **Partes con modal**: conectar `AddItemDialog` al botón "Añadir Repuesto" + fix bug de tipos (`manufacturer`/`isRecommended`)
- **Widget horas**: suma `standardHours` vs `directHours` en tiempo real via `useWatch`
- **Flujo de estados correcto**: PENDING → PENDING_APPROVAL → APPROVED → IN_PROGRESS → PENDING_INVOICE → COMPLETED
- **Ticket + OC en APPROVED**: mover generación desde PENDING_INVOICE → APPROVED (cuando Manager aprueba)
- **Fix GET /[id]**: incluir `workOrderSubTasks` en items (hoy cargan vacías al editar)
- **Fix PUT guard**: no borrar subTasks con status DONE/IN_PROGRESS

### Out of Scope

- Cambios de schema Prisma
- Nuevo modal para subtareas manuales (no aplica — solo tempario)
- Rediseño del tab Cierre / ComprasTab (ya implementados, se tocan solo para adaptar al nuevo flujo de estados)
- Integración SIIGO

## Approach

**UI-first, sin tocar DB.** Todos los endpoints necesarios existen. Los cambios son:

1. `UnifiedWorkOrderForm.tsx`: rediseño de `renderItemRow` para servicios (Card vertical), eliminar `handleAddManualSubTask`, conectar `AddItemDialog` a la sección de partes
2. `WorkOrderHeader.tsx`: agregar botones para cada estado del flujo correcto
3. `[id]/route.ts`: actualizar `ALLOWED_TRANSITIONS`, mover lógica ticket+OC al handler de APPROVED, agregar `workOrderSubTasks` en GET, filtro `status: 'PENDING'` en PUT deleteMany

## Affected Areas

| Archivo                                                                                    | Impacto                                                                 |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx`                          | Modified — rediseño, fix inline, conectar modal partes, widget horas    |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx`   | Modified — fix tipos                                                    |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx` | Modified — botones por estado                                           |
| `src/app/api/maintenance/work-orders/[id]/route.ts`                                        | Modified — transiciones, ticket+OC en APPROVED, GET subTasks, PUT guard |
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`                                  | Modified — tipo WorkOrder incluye subTasks                              |

## Risks

| Riesgo                                                                                                                                               | Prob | Mitigación                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| WorkOrderHeader llama al mismo PATCH para todas las transiciones; mover ticket+OC al handler APPROVED puede afectar WOs existentes con estado legacy | Med  | Guard: solo ejecutar lógica ticket+OC si la WO no tiene ya un `internalWorkTicket` |
| PUT "God Mode" recibe `subTasks: []` al editar y borra las DONE                                                                                      | High | Filtro `status: 'PENDING'` en `deleteMany` — fix antes de todo lo demás            |

## Rollback Plan

```bash
git revert <commit-hash>
# No hay cambios de schema ni migraciones — rollback instantáneo.
```

## Dependencies

- `AddItemDialog.tsx` ya implementado y funcional (solo conectar + fix tipos)
- `GET /api/maintenance/tempario/lookup` funciona (solo agregar guard `brandId`)
- `PATCH /api/maintenance/work-orders/[id]/subtasks/[id]` ya existe para update individual

## Success Criteria

- [ ] Crear OT: servicios en cards verticales legibles, repuestos via modal con sugerencia automática
- [ ] "Cargar Despiece" carga subtareas del Tempario; "Añadir Tarea Manual" no existe
- [ ] Widget muestra Hrs Est y Hrs Reales actualizados en tiempo real
- [ ] Técnico envía a aprobación → Manager aprueba → ticket PDF descarga + OC se crean
- [ ] Editar OT existente: subtareas DONE no se borran
- [ ] `pnpm type-check` sin errores nuevos
