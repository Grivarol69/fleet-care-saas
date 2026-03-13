# Delta for Work Orders — OT Flow Redesign

## Context

Este delta modifica el spec `openspec/specs/work-orders/spec.md`.
La estructura de 4 tabs (Información General, Trabajo, Compras & Costos, Actividad)
es reemplazada por 6 tabs con roles semánticos claros.

---

## MODIFIED Requirements

### Requirement: Estructura de Tabs del Detalle de OT

(Previously: 4 tabs — Información General, Trabajo (Interno/Ext), Costos y Gastos, Actividad)

La página de detalle `/dashboard/maintenance/work-orders/[id]` DEBE renderizar exactamente
6 tabs en este orden:

1. **Resumen** — visión general de la OT
2. **Taller Propio** — trabajos ejecutados internamente
3. **Trabajos Externos** — trabajos y repuestos de proveedores
4. **Compras** — órdenes de compra y facturas (transversal a internos y externos)
5. **Cierre** — auditoría y acción de cierre
6. **Actividad** — historial cronológico

El tab por defecto al abrir la página DEBE ser **Resumen**.

#### Scenario: Navegación completa entre tabs

- GIVEN la OT está cargada en estado IN_PROGRESS
- WHEN el usuario navega entre los 6 tabs
- THEN cada tab DEBE renderizar su contenido sin recargar la página
- AND el estado de la OT en el header DEBE mantenerse visible en todos los tabs

#### Scenario: Tab por defecto al abrir OT

- GIVEN el usuario navega a `/dashboard/maintenance/work-orders/{id}`
- WHEN la página termina de cargar
- THEN el tab activo DEBE ser "Resumen"
- AND los demás tabs DEBEN ser accesibles sin restricción de orden

---

### Requirement: Tab "Trabajo" — Vista Unificada

(Previously: un único tab "Trabajo" con dos secciones verticales Taller + Externos)

REMOVED. Reemplazado por dos tabs separados: "Taller Propio" y "Trabajos Externos".
Ver requirements nuevos correspondientes.

---

### Requirement: Tab "Compras & Costos"

(Previously: CostsTab con CostSummaryCard + tabla OCs + ExpensesTab)

REMOVED. Reemplazado por el tab "Compras" con scope ampliado.
Ver requirement nuevo "Tab Compras — Transversal".

---

### Requirement: Campo actualCost Editable Manualmente

(Previously: GeneralInfoTab tenía un campo Input para editar actualCost manualmente)

REMOVED. El costo real de la OT MUST NOT ser editable manualmente desde la UI.
El sistema DEBE calcular el costo total automáticamente desde la suma de:
- Labor interna (InternalWorkTicket.laborEntries)
- Repuestos internos (InternalWorkTicket.partEntries)
- Servicios externos (WorkOrderItem.totalCost donde itemSource = EXTERNAL)
- Gastos adicionales (WorkOrderExpense.amount)

#### Scenario: Costo calculado automáticamente

- GIVEN la OT tiene 1 ticket interno con labor $100 + repuestos $50, y 1 OC por $200
- WHEN el usuario abre el tab "Cierre"
- THEN DEBE mostrarse costo total = $350 calculado automáticamente
- AND MUST NOT existir un campo de texto para ingresar el costo manualmente

---

## ADDED Requirements

### Requirement: Tab Resumen — Panel de Orientación Rápida

El tab "Resumen" DEBE proveer orientación completa sobre la OT sin necesidad de navegar
a otros tabs.

DEBE mostrar:

- Título y descripción de la OT
- Badge de estado (color-coded)
- Tipo de mantenimiento (Preventivo / Correctivo / Predictivo)
- Prioridad
- Vehículo: placa, marca, línea, km de creación, km actual
- Técnico asignado (único por OT)
- Centro de costos asignado
- Notas internas
- Alertas de mantenimiento de origen (las que generaron la OT)
- Mini-panel de 4 métricas:
  - Costo acumulado hasta el momento
  - Ítems completados / total ítems
  - OCs pendientes de factura
  - Estado general de cierre (Pendiente / Listo para cerrar)
- Fechas: creación, inicio, fin estimado

El usuario DEBE poder editar desde este tab: título, descripción, notas, prioridad, centro de costos.

MUST NOT mostrar campos de costo real editable.

#### Scenario: Operador ve progreso sin navegar

- GIVEN la OT tiene 3 ítems: 2 completados y 1 pendiente
- AND hay 1 OC sin factura
- WHEN el operador está en el tab "Resumen"
- THEN DEBE ver "2/3 ítems completados"
- AND DEBE ver "1 OC pendiente de factura"
- AND DEBE ver el costo acumulado calculado

#### Scenario: Resumen editable por roles con permisos

- GIVEN el usuario tiene rol MANAGER
- AND la OT no está en estado COMPLETED ni CANCELLED
- WHEN hace click en "Editar" en el tab Resumen
- THEN DEBE poder modificar título, descripción, prioridad, notas, centro de costos
- AND al guardar los cambios DEBEN persistirse via PATCH

#### Scenario: Resumen read-only en OT cerrada

- GIVEN la OT está en estado COMPLETED
- WHEN el usuario abre el tab Resumen
- THEN MUST NOT mostrarse el botón "Editar"
- AND todos los campos DEBEN ser de solo lectura

---

### Requirement: Tab Taller Propio — Gestión de Trabajo Interno

El tab "Taller Propio" DEBE mostrar ÚNICAMENTE los `WorkOrderItem` con
`itemSource = 'INTERNAL_STOCK'` (o `itemSource = null` como fallback legacy).

MUST NOT mostrar ítems con `itemSource = 'EXTERNAL'`.

Cada ítem DEBE ser expandible mostrando sus `WorkOrderSubTask`.

#### Scenario: Separación estricta de ítems internos

- GIVEN la OT tiene 2 ítems internos y 1 externo
- WHEN el usuario abre el tab "Taller Propio"
- THEN DEBE ver exactamente 2 ítems
- AND MUST NOT ver el ítem externo en este tab

#### Scenario: Ítem legacy sin itemSource aparece en Taller

- GIVEN existe un WorkOrderItem con `itemSource = null`
- WHEN el tab "Taller Propio" carga
- THEN DEBE mostrar ese ítem con badge "Sin clasificar"
- AND SHOULD ofrecer opción de asignar destino

#### Scenario: Agregar trabajo interno

- GIVEN el usuario está en el tab "Taller Propio"
- AND la OT no está en estado COMPLETED ni CANCELLED
- WHEN hace click en "Nuevo Trabajo"
- THEN DEBE abrirse el dialog de búsqueda de servicios/MantItems
- AND al confirmar, el ítem DEBE crearse con `itemSource = 'INTERNAL_STOCK'`

#### Scenario: Estado vacío de Taller Propio

- GIVEN la OT no tiene ningún ítem interno
- WHEN el usuario abre el tab "Taller Propio"
- THEN DEBE mostrarse un estado vacío con texto "No hay trabajos internos"
- AND DEBE mostrarse el botón "Nuevo Trabajo"

---

### Requirement: Búsqueda de Servicios via Combobox

El dialog/panel de agregar ítems DEBE usar un combobox (Command + Popover) para
buscar `MantItem` disponibles.

MUST NOT usar un `<select>` HTML plano ni requerir scroll en una lista larga sin búsqueda.

El combobox DEBE:
- Filtrar por nombre mientras el usuario escribe
- Mostrar al menos: nombre del ítem, tipo (Servicio / Repuesto / Acción)
- Responder visualmente dentro de 200ms de tipeo

#### Scenario: Operador encuentra servicio rápidamente

- GIVEN el dialog de agregar ítem está abierto en modo Taller Propio
- WHEN el operador escribe "aceite" en el combobox
- THEN DEBEN mostrarse solo los MantItems cuyo nombre contiene "aceite"
- AND el resultado DEBE aparecer sin recargar la página

#### Scenario: Combobox sin resultados

- GIVEN el operador escribe un término que no coincide con ningún MantItem
- WHEN el combobox procesa la búsqueda
- THEN DEBE mostrar un mensaje "Sin resultados" en el dropdown
- AND MUST NOT mostrar una lista vacía sin feedback

---

### Requirement: Carga de Subtareas — Solo Manual desde Tempario

El sistema NO DEBE auto-expandir subtareas del tempario al abrir/expandir un WorkOrderItem.

El flujo de carga DEBE ser exclusivamente mediante el botón "Agregar desde Tempario"
que abre el `TemparioPickerModal`.

MUST NOT existir un botón llamado "Expandir Tempario" que realice POST automático
al endpoint `/subtasks/expand`.

#### Scenario: Técnico agrega subtarea desde tempario

- GIVEN el ítem de taller está expandido mostrando su hoja de subtareas vacía
- WHEN el técnico hace click en "Agregar desde Tempario"
- THEN DEBE abrirse el TemparioPickerModal con el catálogo de ítems del tempario
- AND el técnico DEBE poder buscar y seleccionar ítems manualmente
- AND al confirmar, la subtarea seleccionada DEBE aparecer en la lista

#### Scenario: Expansión automática no ocurre al abrir ítem

- GIVEN existe un WorkOrderItem vinculado a un MantItem con procedimiento en tempario
- WHEN el técnico hace click en el ítem para expandirlo
- THEN MUST NOT dispararse ningún POST a `/subtasks/expand` automáticamente
- AND la lista de subtareas DEBE cargarse solo con lo ya guardado en BD

#### Scenario: Ítem sin subtareas muestra estado vacío limpio

- GIVEN el WorkOrderItem no tiene subtareas creadas
- WHEN el técnico expande el ítem
- THEN DEBE verse un mensaje "Sin subtareas. Agregá desde el Tempario o manualmente."
- AND MUST NOT mostrarse mensajes de error sobre receta no encontrada

---

### Requirement: Tab Trabajos Externos — Gestión de Proveedores

El tab "Trabajos Externos" DEBE mostrar ÚNICAMENTE los `WorkOrderItem` con
`itemSource = 'EXTERNAL'`.

MUST NOT mostrar ítems con `itemSource = 'INTERNAL_STOCK'` o `null`.

El tab DEBE organizar los ítems en dos sub-secciones visuales:

1. **Servicios Externos**: ítems de tipo SERVICE
2. **Repuestos Externos**: ítems de tipo PART

Cada ítem DEBE mostrar:
- Nombre del MantItem
- Proveedor asignado (si tiene OC generada)
- Número y estado de la OC vinculada (si existe)
- Estado de cierre: PENDING / PURCHASE_ORDER / INVOICE_RECEIVED
- Checkbox para selección batch de OC (solo si closureType = PENDING)

#### Scenario: Sub-secciones claramente diferenciadas

- GIVEN la OT tiene 1 servicio externo y 2 repuestos externos
- WHEN el usuario abre el tab "Trabajos Externos"
- THEN DEBE ver la sección "Servicios Externos" con 1 ítem
- AND DEBE ver la sección "Repuestos Externos" con 2 ítems
- AND las secciones DEBEN estar visualmente separadas

#### Scenario: Generación de OC desde Trabajos Externos

- GIVEN existen ítems externos con closureType = 'PENDING'
- WHEN el usuario selecciona uno o más ítems via checkbox
- AND hace click en "Generar OC"
- THEN DEBE abrirse un dialog de confirmación con selector de proveedor
- AND al confirmar, la OC DEBE crearse y aparecer en el tab "Compras"
- AND los ítems seleccionados DEBEN cambiar su closureType a 'PURCHASE_ORDER'

#### Scenario: Ítem con OC ya generada no muestra checkbox

- GIVEN un WorkOrderItem externo tiene closureType = 'PURCHASE_ORDER'
- WHEN el tab "Trabajos Externos" renderiza ese ítem
- THEN MUST NOT mostrarse el checkbox de selección
- AND DEBE mostrarse el número de OC vinculada como referencia

#### Scenario: Repuesto externo también puede generar OC

- GIVEN existe un WorkOrderItem externo de tipo PART con closureType = 'PENDING'
- WHEN el usuario lo selecciona y genera OC
- THEN la OC DEBE crearse y aparecer en tab "Compras"
- AND el repuesto DEBE poder representar tanto material para taller propio
  como material que se lleva al proveedor

#### Scenario: Estado vacío diferenciado por sub-sección

- GIVEN la OT no tiene servicios externos pero sí repuestos externos
- WHEN el tab "Trabajos Externos" carga
- THEN la sección "Servicios Externos" DEBE mostrar estado vacío "Sin servicios externos"
- AND la sección "Repuestos Externos" DEBE mostrar los ítems normalmente

---

### Requirement: Tab Compras — Gestión Transversal de OCs y Facturas

El tab "Compras" DEBE consolidar TODAS las Órdenes de Compra y facturas vinculadas
a la OT, independientemente de si el origen fue un trabajo interno o externo.

DEBE contener tres secciones:

**Sección 1 — Órdenes de Compra:**
- Lista de todas las OCs vinculadas a esta OT
- Por OC: número, proveedor, estado (PENDING/APPROVED/RECEIVED/INVOICED), monto total
- Expandible: ítems incluidos en la OC con cantidad y precio
- Mini-resumen al pie: total comprometido / total facturado / pendiente de factura

**Sección 2 — Facturas vinculadas:**
- Lista de facturas con número, proveedor, monto, estado
- Referencia a qué OC corresponde cada factura
- Alerta visual si el monto de la factura supera el monto de la OC en más de 10%

**Sección 3 — Gastos adicionales:**
- Gastos sin OC formal (traslados, herramientas, materiales menores)
- Campos: tipo, descripción, monto, proveedor (opcional), fecha

#### Scenario: OC generada desde Trabajos Externos aparece en Compras

- GIVEN el usuario generó una OC desde el tab "Trabajos Externos"
- WHEN navega al tab "Compras"
- THEN DEBE ver esa OC en la sección "Órdenes de Compra"
- AND DEBE ver el monto total de la OC

#### Scenario: Alerta de sobreprecio en factura

- GIVEN una OC fue creada por $1.000
- AND se vincula una factura por $1.200 (20% más)
- WHEN el tab "Compras" renderiza la sección de facturas
- THEN DEBE mostrarse una alerta visual en esa fila indicando "Variación +20%"

#### Scenario: Total comprometido vs facturado

- GIVEN la OT tiene 2 OCs: una por $500 con factura, otra por $300 sin factura
- WHEN el usuario abre el tab "Compras"
- THEN DEBE ver: Comprometido $800 / Facturado $500 / Pendiente de factura $300

#### Scenario: Agregar gasto adicional

- GIVEN el usuario está en el tab "Compras"
- WHEN hace click en "Agregar Gasto"
- THEN DEBE abrirse un dialog con campos: tipo, descripción, monto, proveedor (opcional)
- AND al confirmar, el gasto DEBE aparecer en la sección "Gastos adicionales"
- AND DEBE sumarse al cálculo del tab "Cierre"

#### Scenario: Tab Compras sin actividad

- GIVEN la OT no tiene OCs, facturas ni gastos adicionales
- WHEN el usuario abre el tab "Compras"
- THEN DEBE mostrarse el resumen con totales en $0
- AND DEBE mostrarse estado vacío en cada sección

---

### Requirement: Tab Cierre — Vista de Auditoría y Acción de Cierre

El tab "Cierre" DEBE ser una vista consolidada de solo lectura que reúne toda la
información necesaria para tomar la decisión de cerrar la OT.

DEBE mostrar las siguientes secciones:

**Sección: Resumen Ejecutivo**
- Vehículo, placa, marca, modelo, km de creación, km de cierre (editable solo aquí)
- Técnico responsable, proveedor(es) involucrados
- Centro de costos imputado
- Estado actual de la OT

**Sección: Trabajos Realizados**
- Tabla de ítems internos: nombre, horas estimadas, horas reales, técnico, estado
- Tabla de ítems externos: nombre, proveedor, costo, estado
- Total ítems completados / total ítems

**Sección: Desglose de Costos**
- Labor interna (calculado desde InternalWorkTicket.laborEntries)
- Repuestos internos (calculado desde InternalWorkTicket.partEntries)
- Servicios externos (calculado desde WorkOrderItem.totalCost EXTERNAL SERVICE)
- Repuestos externos (calculado desde WorkOrderItem.totalCost EXTERNAL PART)
- Gastos adicionales (calculado desde WorkOrderExpense)
- **TOTAL REAL** (suma de todo lo anterior)
- Costo estimado original y variación porcentual

**Sección: Documentación**
- OCs generadas con su estado
- Facturas vinculadas
- Alertas de mantenimiento de origen y su estado de cierre

**Sección: Checklist de Cierre**
- Lista auto-generada de ítems bloqueantes que impiden cerrar
- Ejemplos de bloqueantes: ítem sin completar, OC sin factura, subtarea IN_PROGRESS

El botón "Cerrar OT" DEBE estar visible SOLO para roles OWNER, MANAGER y SUPERVISOR.
El botón "Cerrar OT" MUST NOT habilitarse si el checklist tiene ítems bloqueantes pendientes.

#### Scenario: Costo total calculado automáticamente

- GIVEN la OT tiene: ticket interno $150 labor + $80 repuestos, OC por servicio $300, gasto $20
- WHEN el usuario abre el tab "Cierre"
- THEN DEBE ver: Labor $150 / Repuestos internos $80 / Servicios ext $300 / Gastos $20 / TOTAL $550
- AND MUST NOT verse un campo editable de costo

#### Scenario: Botón Cerrar OT bloqueado con ítems pendientes

- GIVEN la OT tiene 1 WorkOrderItem con status = 'PENDING'
- AND 1 OC sin factura vinculada
- WHEN el usuario MANAGER abre el tab "Cierre"
- THEN DEBE verse el checklist con 2 ítems bloqueantes marcados
- AND el botón "Cerrar OT" DEBE estar deshabilitado (disabled)

#### Scenario: Botón Cerrar OT habilitado cuando checklist limpio

- GIVEN todos los WorkOrderItem tienen status = 'COMPLETED' o 'CANCELLED'
- AND todas las OCs tienen factura vinculada
- WHEN el usuario MANAGER abre el tab "Cierre"
- THEN el checklist DEBE mostrar todos los ítems resueltos
- AND el botón "Cerrar OT" DEBE estar habilitado

#### Scenario: Cierre requiere kilometraje

- GIVEN el checklist de cierre está limpio
- WHEN el usuario hace click en "Cerrar OT"
- THEN DEBE aparecer un dialog solicitando el kilometraje de cierre
- AND el campo km DEBE ser numérico y requerido
- AND MUST NOT cerrarse la OT sin ingresar km de cierre

#### Scenario: TECHNICIAN no ve botón Cerrar OT

- GIVEN el usuario tiene rol TECHNICIAN
- WHEN abre el tab "Cierre"
- THEN DEBE ver toda la información consolidada
- AND MUST NOT ver el botón "Cerrar OT"

#### Scenario: Variación de costo visible

- GIVEN el costo estimado original era $500 y el costo real calculado es $620
- WHEN el usuario ve el desglose de costos en "Cierre"
- THEN DEBE ver: Estimado $500 / Real $620 / Variación +$120 (+24%)
- AND la variación SHOULD estar resaltada visualmente si supera el 15%

---

## REMOVED Requirements

### Requirement: Botón "Expandir Tempario" Automático

(Reason: Genera confusión al operador — dispara un POST automático al abrir el ítem,
falla silenciosamente si no hay receta, y el mensaje de error "Intentando cargar tempario..."
no comunica qué pasó. La carga manual desde TemparioPickerModal es el flujo correcto.)

El endpoint `POST /api/maintenance/work-orders/[id]/subtasks/expand` SHOULD seguir existiendo
en backend para uso futuro (recetas automáticas), pero MUST NOT invocarse automáticamente
desde el frontend al expandir un WorkOrderItem.

### Requirement: Sub-sección "Terceros / Repuestos" en WorkTab

(Reason: Reemplazado por el tab independiente "Trabajos Externos" con mejor organización
por tipo SERVICE vs PART y conexión directa al tab "Compras".)

### Requirement: Campo manual actualCost en GeneralInfoTab

(Reason: El costo real debe ser calculado, no ingresado manualmente. Un campo editable
permite inconsistencias entre lo registrado en ítems/tickets/OCs y el número en pantalla.
El tab "Cierre" provee el cálculo automático con trazabilidad completa.)
