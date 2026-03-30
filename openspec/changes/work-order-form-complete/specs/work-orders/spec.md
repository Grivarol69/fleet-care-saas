# Delta for work-orders

## MODIFIED Requirements

### Requirement: Header — Botones de acción por estado (reemplaza spec anterior)

El header DEBE mostrar el botón correcto para cada estado del flujo completo:

| Estado           | Botón                     | Rol                  |
| ---------------- | ------------------------- | -------------------- |
| PENDING          | "Enviar a Aprobación"     | canExecuteWorkOrders |
| PENDING_APPROVAL | "Aprobar OT" + "Rechazar" | canApproveWorkOrder  |
| APPROVED         | "Iniciar Trabajo"         | canExecuteWorkOrders |
| IN_PROGRESS      | "Cerrar OT" (requiere km) | canCloseWorkOrder    |
| PENDING_INVOICE  | "Marcar Completada"       | canCloseWorkOrder    |

Al aprobar, si `workOrder.technicianId === null`, DEBE mostrarse advertencia antes del confirm (sin bloquear).

#### Scenario: Manager aprueba una OT

- GIVEN la OT está en estado PENDING_APPROVAL
- AND el usuario tiene rol MANAGER
- WHEN hace click en "Aprobar OT" y confirma
- THEN la OT pasa a APPROVED
- AND el sistema genera automáticamente el InternalWorkTicket (si hay técnico) y las OC (si hay ítems EXTERNAL)
- AND el ticket PDF se descarga automáticamente si fue generado

#### Scenario: Técnico no puede aprobar

- GIVEN la OT está en PENDING_APPROVAL
- AND el usuario tiene rol TECHNICIAN
- THEN el botón "Aprobar OT" NO DEBE estar visible

---

### Requirement: Flujo de generación de Ticket + OC (reemplaza spec anterior)

El sistema DEBE generar el InternalWorkTicket y las PurchaseOrders al momento de la transición a **APPROVED**, NO al cerrar la OT.

La transición a PENDING_INVOICE DEBE únicamente calcular `actualCost` y registrar `endDate`.

El sistema DEBE ser idempotente: si ya existe un InternalWorkTicket para la OT, NO DEBE crear uno nuevo.

#### Scenario: Ticket se genera al aprobar

- GIVEN la OT está en PENDING_APPROVAL con técnico asignado e ítems INTERNAL_STOCK
- WHEN un Manager aprueba la OT
- THEN se crea el InternalWorkTicket en la misma transacción
- AND el PDF del ticket se retorna en la respuesta para descarga automática

#### Scenario: OC se genera al aprobar

- GIVEN la OT tiene ítems con `itemSource = EXTERNAL`
- WHEN un Manager aprueba la OT
- THEN se crean PurchaseOrders agrupadas por `providerId`
- AND el conteo de OC generadas se muestra como toast al usuario

---

### Requirement: Subtareas vinculadas solo al Tempario (modifica Tab Trabajo)

El formulario de carga de OT DEBE NOT permitir agregar subtareas manuales (sin `temparioItemId`).

El único mecanismo para cargar subtareas DEBE ser el botón "Cargar Despiece" que consulta el Tempario.

Las subtareas con `temparioItemId` DEBEN mostrarse como texto readonly con badge de horas estándar.

#### Scenario: Solo aparece "Cargar Despiece"

- GIVEN el usuario agrega un servicio con Origen "Taller Propio"
- THEN la sección Despiece de Tareas DEBE mostrar únicamente el botón "Cargar Despiece"
- AND NO DEBE existir ningún botón "Añadir Tarea Manual"

#### Scenario: Cargar Despiece sin marca de vehículo

- GIVEN el vehículo seleccionado no tiene marca asignada
- WHEN el usuario hace click en "Cargar Despiece"
- THEN DEBE mostrarse un toast informativo
- AND NO DEBE realizarse la llamada a la API

---

## ADDED Requirements

### Requirement: Formulario de servicios — layout Card vertical

Cada servicio en el formulario de creación/edición DEBE renderizarse como una Card vertical con líneas separadas (no grid horizontal crampeado).

El Origen DEBE mostrarse como badge toggle (Taller Propio / Servicio Externo), no como Select dropdown.

#### Scenario: Cambio de origen actualiza la UI

- GIVEN un servicio tiene Origen "Taller Propio"
- WHEN el usuario cambia a "Servicio Externo"
- THEN DEBE aparecer el selector de Proveedor en una línea nueva
- AND DEBE desaparecer la sección Despiece de Tareas

---

### Requirement: Repuestos via modal AddItemDialog

El botón "Añadir Repuesto" DEBE abrir el modal AddItemDialog con lookup automático de `MantItemVehiclePart` y verificación de stock.

El modal MUST NOT llamar al endpoint POST directamente; el ítem DEBE agregarse al estado local del form.

#### Scenario: Sistema sugiere repuesto correcto

- GIVEN el usuario abre AddItemDialog seleccionando un mantItem de tipo PART
- AND el vehículo tiene marca y línea registradas
- THEN el modal DEBE mostrar la sugerencia del repuesto correspondiente vía `/api/maintenance/vehicle-parts/suggest`
- AND si hay stock disponible, `itemSource` DEBE ser pre-seleccionado como INTERNAL_STOCK

---

### Requirement: Widget de horas en tiempo real

El formulario DEBE mostrar la suma de `standardHours` y `directHours` de todas las subtareas de servicios, actualizándose reactivamente.

#### Scenario: Widget refleja subtareas cargadas

- GIVEN el usuario cargó el Despiece de un servicio con 3 subtareas de 2h cada una
- THEN el widget DEBE mostrar "Hrs Est: 6.0h"
- AND al completar horas reales, "Hrs Reales" se actualiza sin recargar

---

### Requirement: GET incluye workOrderSubTasks

La respuesta de `GET /api/maintenance/work-orders/[id]` DEBE incluir `workOrderSubTasks` dentro de cada `workOrderItem`, ordenadas por `sequence ASC`.

#### Scenario: Edición preserva subtareas existentes

- GIVEN la OT tiene ítems con subtareas en estado DONE
- WHEN el usuario abre el formulario de edición
- THEN las subtareas DONE DEBEN mostrarse como texto readonly
- AND al guardar (PUT), las subtareas DONE NO DEBEN eliminarse
