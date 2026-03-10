# Mi Taller — Specification (New Domain)

## Purpose

Define el comportamiento de la vista "Mi Taller": una página dedicada en la sidebar para técnicos y supervisores de taller que muestra exclusivamente las Órdenes de Trabajo con trabajo interno pendiente o en progreso, optimizada para ejecución desde una tablet en el taller.

---

## Requirements

### Requirement: Acceso y Visibilidad en Sidebar

La ruta `/dashboard/maintenance/taller` DEBE estar disponible en la sidebar bajo la sección "Mantenimiento".

Los roles que DEBEN ver la entrada "Mi Taller" en la sidebar son:

- TECHNICIAN
- MANAGER
- OWNER
- SUPER_ADMIN

El rol DRIVER MUST NOT ver esta entrada.
El rol PURCHASER MUST NOT ver esta entrada.

#### Scenario: Técnico ve "Mi Taller" en la sidebar

- GIVEN el usuario está autenticado con rol TECHNICIAN
- WHEN navega al dashboard
- THEN DEBE ver la entrada "Mi Taller" en la sección Mantenimiento de la sidebar
- AND al hacer click navega a `/dashboard/maintenance/taller`

#### Scenario: Driver no ve "Mi Taller"

- GIVEN el usuario está autenticado con rol DRIVER
- WHEN navega al dashboard
- THEN MUST NOT ver la entrada "Mi Taller" en la sidebar

---

### Requirement: Filtrado de OTs para el Técnico

Cuando el usuario autenticado tiene rol TECHNICIAN, la vista "Mi Taller" DEBE mostrar ÚNICAMENTE las OTs donde:

- El usuario es el técnico asignado (`workOrder.technicianId = currentUser.id`)
- Y la OT tiene al menos un WorkOrderItem con `itemSource = 'INTERNAL_STOCK'` (o `null`)
- Y el estado de la OT es IN_PROGRESS, PENDING, o APPROVED

Cuando el usuario tiene rol MANAGER, OWNER, o SUPER_ADMIN, la vista DEBE mostrar todas las OTs del tenant que cumplan los criterios de items internos, sin filtrar por técnico asignado.

#### Scenario: Técnico ve solo sus OTs

- GIVEN el usuario es TECHNICIAN con id "tech-1"
- AND existen OTs: OT-A asignada a "tech-1", OT-B asignada a "tech-2", OT-C sin técnico
- WHEN el técnico navega a "Mi Taller"
- THEN MUST mostrar solo OT-A
- AND MUST NOT mostrar OT-B ni OT-C

#### Scenario: Manager ve todas las OTs de taller

- GIVEN el usuario es MANAGER
- AND existen OTs: OT-A (tech-1), OT-B (tech-2), OT-C (sin técnico)
- AND todas tienen items internos
- WHEN navega a "Mi Taller"
- THEN DEBE mostrar OT-A, OT-B y OT-C

#### Scenario: OT sin items internos no aparece en Mi Taller

- GIVEN existe una OT con solo items `itemSource = 'EXTERNAL'`
- WHEN cualquier usuario navega a "Mi Taller"
- THEN MUST NOT aparecer esa OT en la lista

---

### Requirement: Card de OT en Mi Taller

Cada OT en la vista "Mi Taller" DEBE mostrarse como una Card con:

- Placa del vehículo (prominente)
- Marca y línea del vehículo
- Título de la OT
- Badge de estado (color-coded)
- Badge de prioridad (color-coded)
- Técnico asignado (nombre)
- Indicador de progreso de subtasks: "X/Y tareas completadas" con barra de progreso visual
- Lista de las primeras 3 subtasks pendientes (PENDING) como preview

#### Scenario: Card muestra progreso correcto

- GIVEN una OT tiene 7 subtasks: 3 DONE, 4 PENDING
- WHEN se renderiza la card en "Mi Taller"
- THEN DEBE mostrar "3/7 completadas" o una barra con 43% de progreso
- AND las 3 primeras subtasks PENDING DEBEN listarse en la card

#### Scenario: OT sin subtasks muestra estado diferente

- GIVEN una OT tiene items internos pero ningún WorkOrderSubTask creado
- WHEN se renderiza la card
- THEN DEBE mostrar "Sin subtareas" o "Pendiente de planificación"
- AND SHOULD mostrar un botón "Expandir Tempario" si el mantItem tiene procedimiento vinculado

---

### Requirement: Detalle de Tarea Inline

Al hacer click en una OT card en "Mi Taller", DEBE expandirse un panel de detalle inline (sin navegación a otra página) mostrando los items de taller y sus subtasks.

El técnico DEBE poder desde este panel:

- Ver y cambiar el estado de cada subtask (PENDING → IN_PROGRESS → DONE)
- Ingresar horas directas por subtask
- Expandir el tempario si no fue expandido aún

La vista inline SHOULD ser de pantalla completa en viewports menores a 1024px (tablet/móvil).

#### Scenario: Técnico marca tarea como completada desde Mi Taller

- GIVEN el técnico está en "Mi Taller" con el panel de detalle de OT-A expandido
- WHEN cambia el estado de la subtask "Drenar aceite" a DONE
- THEN el cambio DEBE persistirse inmediatamente
- AND el contador de progreso de la card DEBE actualizarse
- AND el técnico MUST NOT ser redirigido a otra página

#### Scenario: Panel se cierra al navegar

- GIVEN el panel de detalle inline está abierto
- WHEN el usuario hace click fuera del panel o presiona Escape
- THEN el panel DEBE cerrarse y volver a la vista de cards

---

### Requirement: Estado Vacío de Mi Taller

Si el técnico no tiene OTs de taller asignadas en estado activo, la página DEBE mostrar un estado vacío informativo.

#### Scenario: Técnico sin trabajo de taller pendiente

- GIVEN el técnico no tiene OTs asignadas con items internos activos
- WHEN navega a "Mi Taller"
- THEN DEBE ver un mensaje como "No tenés trabajo de taller pendiente"
- AND SHOULD ver un enlace a la lista general de OTs
