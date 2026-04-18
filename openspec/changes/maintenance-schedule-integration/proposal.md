# Proposal: maintenance-schedule-integration

## Intent

`MaintenanceCalendar` está construido pero no está montado en ninguna página y usa fechas estimadas (km/100) en vez de datos reales. Las OTs correctivas tampoco tienen campo de fecha. El resultado: el schedule existe en DB (`WorkOrder.startDate`) pero es invisible para el usuario.

## Scope

### In Scope
- Agregar `scheduledDate` al `WorkOrderCreateWizard` (OTs correctivas)
- Crear `GET /api/maintenance/schedule` con WOs programados + alertas sin WO
- Refactorizar `MaintenanceCalendar` para consumir datos reales (dos capas: fecha exacta vs estimada)
- Montar `MaintenanceCalendar` en la página de alertas (debajo de KPI cards)

### Out of Scope
- Nueva página dedicada `/dashboard/maintenance/schedule`
- Edición de fecha desde el calendario (drag-and-drop, click-to-reschedule)
- `avgKmPerDay` por vehículo para mejorar estimaciones
- Notificaciones push/email de vencimientos por fecha

## Approach

**Opción A — calendar en alerts page + endpoint dedicado.**

1. `WorkOrderCreateWizard`: agregar `scheduledDate` al schema Zod + campo UI en Paso 2 + incluir en payload
2. `GET /api/maintenance/schedule`: retorna `{ scheduledWorkOrders[], pendingAlerts[] }` con `tenantPrisma`
3. `MaintenanceCalendar`: reemplazar `useMaintenanceAlerts()` por `useSWR('/api/maintenance/schedule')`. Renderizar capa sólida (WO con fecha) + capa outline (alerta estimada)
4. `alerts/page.tsx`: importar y montar `<MaintenanceCalendar />` tras las KPI cards

Sin cambios de schema Prisma. El campo `WorkOrder.startDate` ya existe.

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx` | Modified | Agregar campo scheduledDate |
| `src/app/api/maintenance/schedule/route.ts` | New | GET handler combinando WOs + alertas |
| `src/components/layout/MaintenanceCalendar/MaintenanceCalendar.tsx` | Modified | Refactorizar datasource + rendering |
| `src/app/dashboard/maintenance/alerts/page.tsx` | Modified | Montar calendar component |

**Prisma models leídos:** `WorkOrder` (startDate), `MaintenanceAlert` (workOrderId, status, kmToMaintenance)
**Roles afectados:** MANAGER, PURCHASER, OWNER ven el calendario; no hay cambios de permisos — el endpoint usa `requireCurrentUser()` + `tenantPrisma` estándar.

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Fechas estimadas muy imprecisas (km/100 no refleja uso real) | Med | Label visual "estimado" en el cell; no afecta datos reales |
| Cell saturado si muchos WOs el mismo día | Low | Máx 2 items visibles + badge "+N más" |
| `useMaintenanceAlerts` usado en otro lugar — romper al refactorizar | Low | Verificar imports antes de tocar; el hook queda intacto |

## Rollback Plan

Sin cambios de schema. Rollback = revertir los 4 archivos. El `WorkOrderCreateWizard` acepta payload sin `scheduledDate` (campo optional en API), por lo que revertir el wizard no afecta OTs existentes.

## Dependencies

- Sin dependencias externas. `WorkOrder.startDate` ya existe en schema.

## Success Criteria

- [ ] Crear OT correctiva desde wizard con fecha → `WorkOrder.startDate` guardado en DB
- [ ] `GET /api/maintenance/schedule` responde con WOs + alertas del tenant
- [ ] Calendario visible en `/dashboard/maintenance/alerts` con eventos reales en fechas correctas
- [ ] WOs programados en azul sólido; alertas estimadas en azul outline/punteado
- [ ] Navegar meses (anterior/siguiente) funciona sin errores
- [ ] `pnpm type-check` pasa sin errores
