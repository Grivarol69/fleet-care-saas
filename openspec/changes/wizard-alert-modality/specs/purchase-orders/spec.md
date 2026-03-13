# Purchase Orders — Specification (New Domain)

## Purpose

Define el comportamiento de generación y visualización de Órdenes de Compra (OC) dentro
del contexto de una Orden de Trabajo. Las OCs se originan en el tab "Trabajos Externos"
y se visualizan en el tab "Compras".

---

## Requirements

### Requirement: Generación de OC desde Tab Trabajos Externos

El tab "Trabajos Externos" MUST proveer un mecanismo para generar Órdenes de Compra
a partir de WorkOrderItems externos seleccionados.

El sistema MUST generar exactamente una `PurchaseOrder` por proveedor distinto
representado en los items seleccionados.

El sistema MUST NOT permitir incluir en la generación items que no tengan `providerId` asignado.

El sistema MUST NOT crear una OC si alguno de los items seleccionados ya está incluido
en otra `PurchaseOrder` activa (status distinto a `CANCELLED`).

#### Scenario: Generación con items de un único proveedor

- GIVEN el tab "Trabajos Externos" tiene 3 items todos con el mismo `providerId`
- AND todos tienen `closureType = PENDING`
- WHEN el operador selecciona los 3 items y hace click en "Generar OC"
- THEN MUST crearse exactamente 1 `PurchaseOrder` con `providerId` correspondiente
- AND la OC MUST contener 3 `PurchaseOrderItem` vinculados a los WorkOrderItems
- AND el `status` de la OC MUST ser `DRAFT`
- AND los 3 WorkOrderItems MUST tener `closureType = PURCHASE_ORDER`
- AND la OC MUST aparecer en el tab "Compras" al refrescar

#### Scenario: Generación con items de múltiples proveedores

- GIVEN existen 4 items: 2 con `providerId = A` y 2 con `providerId = B`
- WHEN el operador selecciona los 4 y hace click en "Generar OC"
- THEN MUST crearse exactamente 2 `PurchaseOrder`: una para A y una para B
- AND cada OC contiene únicamente los items de su proveedor
- AND ambas OCs aparecen en el tab "Compras"

#### Scenario: Intento de generar OC con item sin proveedor

- GIVEN el operador selecciona un item con `providerId = null`
- WHEN hace click en "Generar OC"
- THEN MUST NOT crearse ninguna OC
- AND MUST mostrarse un mensaje de error: "Todos los ítems deben tener proveedor asignado"

#### Scenario: Botón Generar OC deshabilitado sin selección

- GIVEN el tab "Trabajos Externos" está activo
- AND ningún item está seleccionado con checkbox
- THEN el botón "Generar OC" MUST estar deshabilitado (disabled)

#### Scenario: Intento de generar OC con item ya en OC activa

- GIVEN un WorkOrderItem tiene `closureType = PURCHASE_ORDER`
- AND el operador intenta seleccionarlo para una nueva OC
- THEN el checkbox del item MUST estar deshabilitado
- AND MUST mostrar un indicador visual de que ya tiene OC

---

### Requirement: Visualización de OCs en Tab Compras

El tab "Compras" MUST mostrar todas las `PurchaseOrder` vinculadas a la OT,
con la información mínima necesaria para hacer seguimiento.

Cada OC en la lista MUST mostrar: número de orden, nombre del proveedor, tipo (SERVICES/PARTS),
estado con badge de color, y monto total.

#### Scenario: Tab Compras con OCs generadas

- GIVEN la OT tiene 2 PurchaseOrders generadas (una DRAFT, una SENT)
- WHEN el usuario navega al tab "Compras"
- THEN MUST mostrarse una tabla con las 2 OCs
- AND la OC en DRAFT MUST mostrar badge amarillo "Borrador"
- AND la OC en SENT MUST mostrar badge azul "Enviada"

#### Scenario: Tab Compras sin OCs

- GIVEN la OT no tiene ninguna PurchaseOrder
- WHEN el usuario navega al tab "Compras"
- THEN MUST mostrarse un estado vacío: "No hay órdenes de compra generadas"
- AND MUST NOT mostrarse una tabla vacía

---

### Requirement: Numeración de OCs

Cada `PurchaseOrder` MUST tener un `orderNumber` único dentro del tenant,
con formato `OC-{AÑO}-{SECUENCIA}` donde secuencia es un número incremental de 6 dígitos.

El sistema MUST garantizar unicidad del `orderNumber` dentro del tenant
(constraint `@@unique([tenantId, orderNumber])` ya existe en schema).

#### Scenario: Generación de número único

- GIVEN el tenant ya tiene OCs con números OC-2026-000001 y OC-2026-000002
- WHEN se genera una nueva OC
- THEN su `orderNumber` MUST ser OC-2026-000003
- AND MUST NOT duplicarse si dos OCs se generan en paralelo

---

### Requirement: Relación Provider en WorkOrderItem

Todo WorkOrderItem con `itemSource = EXTERNAL` que vaya a ser incluido en una OC
MUST tener `providerId` asignado (relación formal con entidad `Provider`).

El campo `supplier` (String libre) MAY coexistir con `providerId` como texto heredado.
El sistema MUST priorizar `provider.name` sobre `supplier` para display.

#### Scenario: Display de proveedor con ambos campos presentes

- GIVEN un WorkOrderItem tiene `providerId` asignado y `supplier = "Texto viejo"`
- WHEN el item se renderiza en cualquier tab
- THEN MUST mostrarse `provider.name` (no el `supplier` string)

#### Scenario: Display de proveedor solo con supplier legacy

- GIVEN un WorkOrderItem tiene `providerId = null` y `supplier = "Gomería Central"`
- WHEN el item se renderiza
- THEN MUST mostrarse "Gomería Central" como fallback

#### Scenario: Display sin ningún dato de proveedor

- GIVEN un WorkOrderItem tiene `providerId = null` y `supplier` vacío o nulo
- WHEN el item se renderiza
- THEN MUST mostrarse "—" o un badge "Sin proveedor"
