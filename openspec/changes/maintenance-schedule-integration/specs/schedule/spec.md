# Schedule Specification

## Purpose

Define el comportamiento del calendario de mantenimiento: el endpoint que provee datos y el componente visual que los presenta en la página de alertas.

---

## Requirements

### Requirement: Schedule API Endpoint

El sistema DEBE exponer `GET /api/maintenance/schedule` que retorna datos del tenant autenticado.

La respuesta MUST incluir dos colecciones:
- `scheduledWorkOrders`: WOs con `startDate != null` y `status IN [PENDING, APPROVED]`
- `pendingAlerts`: alertas con `workOrderId = null` y `status IN [PENDING, ACKNOWLEDGED]`

El endpoint MUST usar `tenantPrisma` para aislar datos por tenant.

#### Scenario: Tenant con WOs programados y alertas pendientes

- GIVEN el tenant tiene WOs con `startDate` y alertas sin WO
- WHEN `GET /api/maintenance/schedule` es invocado por un usuario autenticado
- THEN responde 200 con `{ scheduledWorkOrders: [...], pendingAlerts: [...] }`
- AND cada WO incluye: `id`, `title`, `startDate`, `priority`, `status`, `vehicle.licensePlate`
- AND cada alerta incluye: `id`, `itemName`, `vehiclePlate`, `kmToMaintenance`, `alertLevel`

#### Scenario: Usuario no autenticado

- GIVEN el request no incluye sesión válida
- WHEN `GET /api/maintenance/schedule` es invocado
- THEN responde 401 `{ error: 'Unauthorized' }`

#### Scenario: Tenant sin datos

- GIVEN el tenant no tiene WOs programados ni alertas pendientes
- WHEN `GET /api/maintenance/schedule` es invocado
- THEN responde 200 con `{ scheduledWorkOrders: [], pendingAlerts: [] }`

---

### Requirement: Calendario en Página de Alertas

El sistema DEBE renderizar `MaintenanceCalendar` en `/dashboard/maintenance/alerts`, debajo de las KPI cards.

#### Scenario: WO programado aparece en fecha exacta

- GIVEN existe un WO con `startDate = 2026-05-10` y `status = PENDING`
- WHEN el usuario navega al mes Mayo 2026 en el calendario
- THEN el día 10 DEBE mostrar la placa del vehículo con estilo sólido (fecha confirmada)

#### Scenario: Alerta sin WO aparece en fecha estimada

- GIVEN existe una alerta con `workOrderId = null` y `kmToMaintenance = 500`
- WHEN el calendario calcula la fecha estimada (`hoy + 500/100 = hoy + 5 días`)
- THEN el día estimado DEBE mostrar la placa con estilo outline (fecha estimada)
- AND DEBE distinguirse visualmente de los WOs programados

#### Scenario: Cell con más de 2 items

- GIVEN un día tiene 3 o más mantenimientos (WOs o alertas)
- WHEN el usuario ve el calendario
- THEN el cell MUST mostrar máximo 2 items visibles
- AND MUST mostrar badge "+N más" con el conteo restante

#### Scenario: Navegación entre meses

- GIVEN el calendario está mostrando el mes actual
- WHEN el usuario hace click en "anterior" o "siguiente"
- THEN el calendario MUST mostrar el mes correspondiente
- AND MUST recalcular los items visibles para ese mes

---

### Requirement: Diferenciación Visual de Tipos de Evento

El calendario MUST distinguir visualmente entre eventos de fecha confirmada y estimada.

- WO con `startDate` real: fondo sólido azul, label "Programado"
- Alerta estimada (km/100): borde outline, label "Estimado" en la leyenda
- Alerta vencida (`kmToMaintenance <= 0`): fondo rojo sólido, label "Vencido"

#### Scenario: Leyenda visible

- GIVEN el calendario está cargado con datos
- WHEN el usuario ve el componente
- THEN DEBE ver una leyenda con al menos: "Programado", "Estimado", "Vencido"
