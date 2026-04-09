# Work Order Detail — Specification (New Domain)

## Purpose

Define el comportamiento del módulo de detalle de Orden de Trabajo, incluyendo la clasificación de items, el header inteligente, los tres tabs consolidados, y los flujos de creación de tickets internos y órdenes de compra.

---

## Requirements

### Requirement: Header Sticky con Contexto Global

La página de detalle de OT DEBE renderizar un header que permanece visible durante el scroll y mientras el usuario navega entre tabs.

El header DEBE mostrar:

- Número/título de la OT
- Badge de estado de la OT (PENDING, IN_PROGRESS, COMPLETED, etc.)
- Placa y nombre del vehículo
- Nombre del técnico asignado (o "Sin asignar")
- Botón de acción primaria contextual según el estado

El botón de acción primaria DEBE cambiar su label y comportamiento según el estado actual:

- PENDING → "Iniciar Trabajo" (si el usuario puede ejecutar)
- PENDING → "Enviar a Aprobación" (si el usuario es MANAGER o superior)
- PENDING_APPROVAL → "Aprobar" + "Rechazar" (si el usuario es MANAGER o superior)
- APPROVED → "Iniciar Trabajo"
- IN_PROGRESS → "Completar" o "Enviar a Facturación"
- PENDING_INVOICE → "Cerrar OT" (requiere km de cierre)

El header SHOULD NOT duplicar estos botones dentro de los tabs.

#### Scenario: Técnico inicia una OT desde el tab Trabajo

- GIVEN la OT está en estado PENDING
- AND el usuario tiene rol TECHNICIAN y es el técnico asignado
- WHEN el usuario está en el tab "Trabajo"
- THEN el botón "Iniciar Trabajo" DEBE estar visible en el header sin scroll
- AND al hacer click cambia el estado a IN_PROGRESS
- AND el badge del header se actualiza inmediatamente

#### Scenario: Header visible en todos los tabs

- GIVEN la OT está en estado IN_PROGRESS
- WHEN el usuario navega entre los tabs "Trabajo", "Compras & Costos" y "Actividad"
- THEN el header con estado y botón de acción DEBE permanecer visible en todos los tabs

#### Scenario: Acción de cierre requiere kilometraje

- GIVEN la OT está en estado PENDING_INVOICE
- WHEN el usuario hace click en "Cerrar OT"
- THEN DEBE aparecer un dialog solicitando el kilometraje de cierre
- AND el campo de km DEBE ser requerido antes de confirmar el cierre

---

### Requirement: Clasificación Explícita de Items

Todo WorkOrderItem DEBE tener un `itemSource` definido en el momento de su creación. El sistema NO DEBE permitir items con `itemSource = null` creados desde la UI rediseñada.

La clasificación DEBE ser:

- `INTERNAL_STOCK` = trabajo de taller propio (labor interna, acciones, servicios internos)
- `EXTERNAL` = servicio o repuesto que viene de un proveedor externo
- Items existentes con `itemSource = null` DEBEN tratarse como `INTERNAL_STOCK` por defecto

#### Scenario: Operador agrega item al crear una OT

- GIVEN el operador está en el tab "Trabajo" de una OT
- WHEN abre el dialog "Agregar Item"
- THEN el dialog DEBE mostrar un selector de destino con opciones: "Taller Propio" / "Servicio Externo" / "Repuesto Externo"
- AND el campo destino DEBE ser requerido antes de continuar
- AND al confirmar, el item se crea con el `itemSource` correspondiente

#### Scenario: Item sin itemSource en datos existentes

- GIVEN existe un WorkOrderItem con `itemSource = null` (dato previo a la migración)
- WHEN el tab "Trabajo" carga los items de la OT
- THEN el item DEBE aparecer en la sección "Taller Propio"
- AND DEBE mostrar un badge "Sin clasificar" con opción de editar el destino

#### Scenario: Item externo nunca aparece en sección Taller

- GIVEN existe un WorkOrderItem con `itemSource = 'EXTERNAL'`
- WHEN el tab "Trabajo" renderiza las secciones
- THEN el item MUST NOT aparecer en la sección "Taller Propio"
- AND MUST aparecer en la sección "Servicios & Repuestos Externos"

---

### Requirement: Tab "Trabajo" — Vista Unificada

El tab "Trabajo" DEBE reemplazar los tabs anteriores de "Taller Propio", "Servicios Externos" y "Repuestos". DEBE contener dos secciones claramente diferenciadas dentro del mismo tab.

**Sección "Taller Propio"** DEBE mostrar todos los items con `itemSource = 'INTERNAL_STOCK'` (o `null` como fallback).

Cada item de la sección Taller DEBE ser expandible mostrando:

- Lista de subtasks/checklist con estado (PENDING/IN_PROGRESS/DONE/CANCELLED)
- Horas estándar del tempario (si aplica, solo lectura)
- Campo de horas directas editable inline por subtask
- Botón "Expandir Tempario" (si el mantItem tiene procedimiento vinculado y aún no se expandió)
- Botón "Agregar subtarea manual"
- Sección de labor entries ya registrados (del InternalWorkTicket asociado)

**Sección "Servicios & Repuestos Externos"** DEBE mostrar items con `itemSource = 'EXTERNAL'`.

Cada item externo DEBE mostrar:

- Proveedor asignado (si tiene OC generada)
- Número de OC vinculada (si existe)
- Badge de estado de cierre (PENDING / PURCHASE_ORDER / INVOICE)
- Checkbox de selección para generar OC en batch

#### Scenario: Técnico expande subtasks de un item de taller

- GIVEN el tab "Trabajo" está activo
- AND existe un item interno con tempario disponible
- WHEN el técnico hace click en el row del item para expandirlo
- THEN DEBE mostrarse la lista de subtasks debajo del item en la misma vista
- AND MUST NOT navegar a otro tab ni recargar la página

#### Scenario: Técnico marca subtask como completada

- GIVEN el item está expandido mostrando sus subtasks
- WHEN el técnico cambia el estado de una subtask a DONE
- THEN el cambio DEBE persistirse via PATCH inmediatamente (no requiere botón "Guardar")
- AND el indicador de progreso del item (ej. "3/5 completadas") DEBE actualizarse

#### Scenario: Operador genera OC de servicios externos

- GIVEN existen items externos con `closureType = 'PENDING'` en la sección Externos
- WHEN el operador selecciona uno o más items con los checkboxes
- AND hace click en "Generar OC"
- THEN DEBE abrirse un dialog pidiendo proveedor
- AND al confirmar, se crea la OC y los items cambian a `closureType = 'PURCHASE_ORDER'`

#### Scenario: Tab Trabajo sin items

- GIVEN la OT no tiene ningún WorkOrderItem creado aún
- WHEN el usuario navega al tab "Trabajo"
- THEN DEBE mostrarse un estado vacío con botón "Agregar primer item"

---

### Requirement: Flujo de Ticket Interno con Horas por Item

El dialog de generación de Ticket Interno DEBE permitir ingresar las horas reales por cada item antes de confirmar la creación.

El sistema NO DEBE usar una hora fija (hardcoded) de 1hr por item.

#### Scenario: Operador crea ticket interno con horas reales

- GIVEN existen items de taller con `closureType = 'PENDING'`
- WHEN el operador hace click en "Crear Ticket Interno"
- THEN DEBE abrirse un dialog mostrando la lista de items pendientes
- AND cada item DEBE tener un campo de horas editable (default: horas estándar del tempario si existe, sino vacío)
- AND DEBE haber un selector de técnico
- AND solo al confirmar con horas válidas (> 0) para todos los items se crea el ticket

#### Scenario: Item sin horas no permite confirmar

- GIVEN el dialog de ticket interno está abierto
- AND un item tiene el campo de horas vacío o en 0
- WHEN el operador hace click en "Crear Ticket"
- THEN MUST NOT crearse el ticket
- AND MUST mostrarse un mensaje de error indicando qué items necesitan horas

---

### Requirement: Tab "Compras & Costos"

El tab "Compras & Costos" DEBE reemplazar el tab "Gastos" y habilitar la vista de OCs vinculadas.

DEBE contener:

- Card de resumen auto-calculado con: Total Labor (de tickets internos), Total Repuestos (de tickets), Total Externos (de OCs), Total Gastos Adicionales (de WorkOrderExpenses), y Gran Total
- Lista de OCs vinculadas a esta OT
- Sección de gastos adicionales (transporte, herramientas, materiales, etc.)

El campo `actualCost` de la OT SHOULD ser calculado automáticamente como la suma de todos los costos. El sistema SHOULD NOT requerir ingreso manual del costo actual.

#### Scenario: Costos se actualizan al cerrar un ticket interno

- GIVEN el tab "Compras & Costos" está visible
- AND se acaba de crear un InternalWorkTicket
- WHEN el usuario refresca o navega al tab
- THEN el resumen DEBE reflejar los nuevos totales de labor y repuestos del ticket

#### Scenario: Operador agrega gasto adicional

- GIVEN el operador está en el tab "Compras & Costos"
- WHEN hace click en "Agregar Gasto"
- THEN DEBE abrirse un dialog con campos: tipo (TRANSPORT/TOOLS/MATERIALS/OTHER), descripción, monto, proveedor (opcional)
- AND al confirmar, el gasto aparece en la lista y el Gran Total se actualiza

#### Scenario: Tab Compras sin actividad

- GIVEN la OT no tiene OCs ni gastos adicionales ni tickets
- WHEN el usuario navega al tab "Compras & Costos"
- THEN DEBE mostrar el resumen de costos con todos los totales en $0
- AND un estado vacío para cada sección

---

### Requirement: Tab "Actividad"

El tab "Actividad" DEBE mostrar una línea de tiempo cronológica de los eventos de la OT.

DEBE incluir:

- Cambios de estado (quién cambió, a qué estado, fecha/hora)
- Comentarios libres agregados por usuarios
- Fecha de creación de la OT

El usuario SHOULD poder agregar un comentario de texto libre desde este tab.

#### Scenario: Usuario ve historial de estados

- GIVEN la OT pasó por los estados PENDING → IN_PROGRESS → COMPLETED
- WHEN el usuario navega al tab "Actividad"
- THEN DEBE verse una timeline con las 3 transiciones en orden cronológico
- AND cada entrada MUST mostrar: quién hizo el cambio, a qué estado, y cuándo

#### Scenario: Operador agrega comentario

- GIVEN el usuario está en el tab "Actividad"
- WHEN escribe un texto en el input de comentario y confirma
- THEN el comentario DEBE aparecer en la timeline con nombre del autor y timestamp
- AND DEBE persistirse para que otros usuarios lo vean
