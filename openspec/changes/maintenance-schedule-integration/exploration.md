# Exploration: maintenance-schedule-integration

## Current State

### MaintenanceCalendar — construido pero huérfano

`src/components/layout/MaintenanceCalendar/MaintenanceCalendar.tsx` existe con un calendario mensual funcional pero:
- **No está montado en ninguna página** (ningún import en `/src/app/`)
- Usa `useMaintenanceAlerts()` y estima fechas con heurística `kmToMaintenance / 100` (asume 100 km/día)
- No consume `WorkOrder.startDate` — el único dato real de "fecha programada" que existe en DB

### Fecha programada — solo en el modal de alertas

`CreateWorkOrderModal` (`src/app/dashboard/maintenance/alerts/components/CreateWorkOrderModal.tsx` línea 331):
- Campo `<Input type="date">` con label "Fecha programada"
- Estado local `scheduledDate` → se envía al POST como `scheduledDate`
- API lo guarda en `WorkOrder.startDate` ✅

### WorkOrderCreateWizard — sin campo de fecha

`src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx`:
- 3 pasos: vehículo → detalles → (submit)
- `formSchema` (línea 63): no incluye `scheduledDate`
- Payload del `onSubmit` (línea 160-169): no incluye `scheduledDate`
- Gap: OTs correctivas creadas por aquí nunca tienen `startDate` en DB

### API — acepta scheduledDate

`POST /api/maintenance/work-orders`: acepta `scheduledDate` via `workOrderPayloadSchema` y lo mapea a `WorkOrder.startDate`. El soporte ya está.

### Alerts page — layout disponible

`src/app/dashboard/maintenance/alerts/page.tsx`:
- Contenedor `<div className="space-y-6 p-6 pb-32">`
- Secciones: header → KPI cards → filtros → tabla de alertas
- Espacio libre después de KPI cards para insertar el calendario

## Affected Areas

- `src/components/layout/MaintenanceCalendar/MaintenanceCalendar.tsx` — refactorizar para usar datos reales
- `src/components/layout/MaintenanceCalendar/index.tsx` — ya tiene barrel export
- `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx` — agregar scheduledDate
- `src/app/dashboard/maintenance/alerts/page.tsx` — montar calendario
- `src/app/api/maintenance/schedule/route.ts` — crear endpoint nuevo (combina WOs + alertas)

## Approaches

### Opción A — Calendar en alerts page + endpoint dedicado (recomendada)

Montar `MaintenanceCalendar` en la página de alertas (debajo de KPI cards). Refactorizar para consumir un nuevo endpoint `/api/maintenance/schedule` que devuelve:
1. WOs con `startDate != null` (fecha exacta confirmada)
2. Alertas sin WO (fecha estimada km/100)

El calendario renderiza dos capas visualmente diferenciadas.

- **Pros**: Datos reales + estimados conviven. Calendar en contexto natural (página de alertas). Un endpoint limpio.
- **Cons**: Un request adicional al cargar la página de alertas.
- **Esfuerzo**: Medio

### Opción B — Calendar como página separada `/dashboard/maintenance/schedule`

Nueva página dedicada con el calendario y una lista lateral de eventos del día.

- **Pros**: Vista full-screen, más espacio para detalles.
- **Cons**: Página extra que el usuario tiene que navegar a ver. Más trabajo de layout y sidebar.
- **Esfuerzo**: Medio-Alto

### Opción C — Calendar en sidebar/widget del dashboard principal

Agregar el calendario al dashboard home.

- **Pros**: Visibilidad máxima.
- **Cons**: El dashboard ya tiene widgets, podría saturar. Fuera del contexto de mantenimiento.
- **Esfuerzo**: Bajo (solo montar)

## Recommendation

**Opción A**: montar en alerts page + endpoint `/api/maintenance/schedule`. Es el contexto correcto (el usuario ya está gestionando alertas cuando necesita ver el schedule). El calendario bidimensional (WOs reales + estimados) aporta valor inmediato sin crear navegación extra.

Adicionalmente: agregar `scheduledDate` al `WorkOrderCreateWizard` (Paso 2, junto a prioridad) para alimentar el calendario desde OTs correctivas.

## Data Flow

```
WorkOrderCreateWizard → POST /api/maintenance/work-orders { scheduledDate }
CreateWorkOrderModal  → POST /api/maintenance/work-orders { scheduledDate }
                                    ↓
                         WorkOrder.startDate (DB)
                                    ↓
GET /api/maintenance/schedule
  └─ WorkOrders WHERE startDate != null, status IN [PENDING, APPROVED]
  └─ MaintenanceAlerts WHERE workOrderId IS NULL, status IN [PENDING, ACKNOWLEDGED]
                                    ↓
                    MaintenanceCalendar (refactored)
  ├─ Capa azul sólido: WO con fecha real
  └─ Capa azul outline: alerta con fecha estimada
```

## Risks

- El calendario estima fechas con `km/100` — algunos vehículos tienen promedios muy distintos. No hay `avgKmPerDay` por vehículo en el schema. Riesgo de fechas estimadas imprecisas para alertas sin WO. Mitigación: mostrar claramente que son estimadas.
- Si muchos WOs tienen `startDate` en el mismo día, el cell del calendario puede saturarse. Mitigación: mostrar máx 2 items + badge "+N más".
- `MaintenanceCalendar` actualmente importa `useMaintenanceAlerts` — hay que reemplazarlo sin romper el hook (que puede usarse en otros lugares). Verificar antes.

## Ready for Proposal

Sí. Alcance claro, 4 archivos afectados, sin cambios de schema. Listo para sdd-propose.
