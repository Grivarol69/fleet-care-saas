# Delta for Work Orders — Wizard Alert Modality

## ADDED Requirements

### Requirement: Selección de Modalidad en Wizard al Crear OT desde Alertas

Cuando se crea una OT a partir de un paquete de alertas de mantenimiento, el wizard DEBE presentar
al usuario un selector de modalidad a nivel de paquete — antes de confirmar la creación.

El selector MUST ofrecer exactamente dos opciones mutuamente excluyentes:
- **Taller Propio** → todos los items del paquete se crean con `itemSource = INTERNAL_STOCK`
- **Servicio Externo** → todos los items del paquete se crean con `itemSource = EXTERNAL`

El selector MUST aparecer únicamente cuando el usuario tiene al menos una alerta seleccionada.

El selector MUST tener un valor por defecto. Se recomienda "Taller Propio" como default conservador.

#### Scenario: Usuario crea OT con modalidad Taller Propio

- GIVEN el usuario está en el wizard, paso 2
- AND tiene al menos una alerta seleccionada
- WHEN selecciona la modalidad "Taller Propio"
- THEN el botón "Crear Orden" MUST estar habilitado sin requerir proveedor
- AND al confirmar, todos los WorkOrderItems creados tienen `itemSource = INTERNAL_STOCK`
- AND los items aparecen en el tab "Taller Propio" de la OT creada

#### Scenario: Usuario crea OT con modalidad Servicio Externo sin proveedor global

- GIVEN el usuario selecciona "Servicio Externo"
- AND NO activa el checkbox "Mismo proveedor para todos"
- WHEN confirma la creación
- THEN todos los WorkOrderItems se crean con `itemSource = EXTERNAL` y `providerId = null`
- AND en el tab "Trabajos Externos" cada item muestra un selector de proveedor pendiente

#### Scenario: Usuario crea OT con modalidad Servicio Externo con proveedor global

- GIVEN el usuario selecciona "Servicio Externo"
- AND activa el checkbox "Mismo proveedor para todos"
- AND selecciona un proveedor del dropdown
- WHEN confirma la creación
- THEN todos los WorkOrderItems se crean con `itemSource = EXTERNAL` y `providerId = <seleccionado>`
- AND en el tab "Trabajos Externos" todos los items muestran el proveedor asignado

#### Scenario: Selector de modalidad no aparece en OT correctiva sin alertas

- GIVEN el usuario está en el wizard creando una OT correctiva
- AND no ha seleccionado ninguna alerta
- WHEN visualiza el paso 2
- THEN el selector de modalidad MUST NOT ser visible

---

### Requirement: Toggle de Modalidad por Item en Tab Taller Propio

Cada WorkOrderItem visible en el tab "Taller Propio" DEBE mostrar un control inline
que permita cambiar su modalidad a "Servicio Externo".

El toggle MUST estar visible en todo momento dentro del row del item, no solo al expandir.

El toggle MUST NOT estar disponible si el item tiene un `InternalWorkTicket` asociado con estado distinto a `CANCELLED`.

#### Scenario: Técnico mueve un item de Taller Propio a Externo

- GIVEN existe un WorkOrderItem con `itemSource = INTERNAL_STOCK`
- AND el item NO tiene ticket interno activo
- WHEN el usuario activa el toggle "Pasar a Externo"
- THEN el sistema MUST hacer PATCH con `{ itemSource: 'EXTERNAL', providerId: null }`
- AND el item MUST desaparecer del tab "Taller Propio" inmediatamente (optimistic update)
- AND el item MUST aparecer en el tab "Trabajos Externos" al refrescar

#### Scenario: Bloqueo de toggle en item con ticket interno activo

- GIVEN un WorkOrderItem con `itemSource = INTERNAL_STOCK`
- AND el item tiene un `InternalWorkTicket` en estado `IN_PROGRESS` o `COMPLETED`
- WHEN el usuario intenta activar el toggle
- THEN el toggle MUST estar deshabilitado (disabled)
- AND MUST mostrar un tooltip: "Tiene ticket interno activo — no se puede mover"

---

### Requirement: Toggle de Modalidad por Item en Tab Trabajos Externos

Cada WorkOrderItem visible en el tab "Trabajos Externos" DEBE mostrar un control inline
que permita cambiar su modalidad a "Taller Propio".

El toggle MUST NOT estar disponible si el item ya tiene una `PurchaseOrderItem` asociada
(es decir, ya fue incluido en una OC).

Al cambiar a "Taller Propio", el sistema MUST limpiar `providerId = null` en el mismo PATCH.

#### Scenario: Operador mueve un item de Externo a Taller Propio

- GIVEN existe un WorkOrderItem con `itemSource = EXTERNAL`
- AND el item NO tiene PurchaseOrderItem asociada
- WHEN el usuario activa el toggle "Pasar a Taller Propio"
- THEN el sistema MUST hacer PATCH con `{ itemSource: 'INTERNAL_STOCK', providerId: null }`
- AND el item MUST desaparecer del tab "Trabajos Externos" inmediatamente
- AND el item MUST aparecer en el tab "Taller Propio" al refrescar

#### Scenario: Bloqueo de toggle en item con OC generada

- GIVEN un WorkOrderItem con `itemSource = EXTERNAL`
- AND el item tiene al menos un `PurchaseOrderItem` asociado
- WHEN el usuario intenta activar el toggle
- THEN el toggle MUST estar deshabilitado
- AND MUST mostrar un tooltip: "Ya tiene OC generada — cancelar la OC primero"

---

### Requirement: Asignación de Proveedor en Tab Trabajos Externos

El tab "Trabajos Externos" DEBE permitir asignar un proveedor a los items externos
tanto de forma global (todos a la vez) como de forma individual (por item).

El campo `supplier` (String libre) SHOULD usarse como fallback de display cuando
`provider` es null. El orden de prioridad para mostrar el nombre es: `provider.name` → `supplier` → `—`.

#### Scenario: Operador asigna el mismo proveedor a todos los items

- GIVEN existen 2 o más WorkOrderItems en el tab "Trabajos Externos"
- WHEN el operador activa el checkbox "Mismo proveedor para todos"
- AND selecciona un proveedor del dropdown global
- AND hace click en "Aplicar a todos"
- THEN MUST ejecutarse un PATCH por cada item que no tenga OC generada
- AND cada item MUST tener `providerId` actualizado al proveedor seleccionado
- AND items con OC ya generada MUST NOT ser modificados

#### Scenario: Operador asigna proveedor a un item individual

- GIVEN existe un WorkOrderItem con `itemSource = EXTERNAL` y `providerId = null`
- WHEN el operador selecciona un proveedor del dropdown inline del item
- THEN el sistema MUST hacer PATCH con `{ providerId: <seleccionado> }`
- AND el nombre del proveedor MUST actualizarse en el row del item

#### Scenario: Item externo sin proveedor muestra estado pendiente

- GIVEN existe un WorkOrderItem con `itemSource = EXTERNAL` y `providerId = null`
- WHEN el tab "Trabajos Externos" renderiza el item
- THEN MUST mostrarse un badge o indicador visual "Sin proveedor"
- AND el checkbox de selección para Generar OC MUST estar deshabilitado para ese item

---

## MODIFIED Requirements

### Requirement: Clasificación Explícita de Items (modificado)

(Previously: el itemSource se asignaba siempre como EXTERNAL por defecto en la creación desde alertas.)

El sistema MUST asignar `itemSource` según la modalidad elegida en el wizard:
- Si modality = `INTERNAL` → `itemSource = INTERNAL_STOCK`
- Si modality = `EXTERNAL` → `itemSource = EXTERNAL`

Items creados desde el wizard sin selección de modalidad explícita MUST default a `INTERNAL_STOCK`.

#### Scenario: Items existentes sin itemSource

- GIVEN existe un WorkOrderItem con `itemSource = null` (dato anterior a esta change)
- WHEN cualquier tab renderiza el item
- THEN MUST tratarse como `INTERNAL_STOCK` y aparecer en tab "Taller Propio"
- AND MUST mostrar badge "Sin clasificar" con opción de editar la modalidad
