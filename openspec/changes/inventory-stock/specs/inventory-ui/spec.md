# Inventory Stock UI — Specification

## Purpose

Define el comportamiento visual e interactivo del módulo `/dashboard/inventory/stock`, que permite gestionar el stock real de repuestos del tenant.

---

## Requirements

### Requirement: Página principal de stock

El sistema MUST mostrar una tabla con todos los `InventoryItem` del tenant con las siguientes columnas:
- Parte (nombre/descripción del `MasterPart`)
- Código (`masterPart.code`)
- Almacén (`warehouse`)
- Cantidad actual (`quantity`)
- Mínimo (`minStock`)
- Valor total (`totalValue`, formateado como moneda)
- Estado (`status` como badge)

La tabla MUST respetar la regla de UI: sin columna UUID visible.

#### Scenario: Usuario ve la lista

- GIVEN el tenant tiene 3 `InventoryItem`
- WHEN el usuario navega a `/dashboard/inventory/stock`
- THEN se renderizan 3 filas con las 7 columnas descritas
- AND no aparece ninguna columna con UUID raw

---

### Requirement: Alertas visuales de stock bajo

Ítems donde `quantity <= minStock` MUST mostrarse con un indicador visual de alerta (fondo/texto en naranja o rojo).

Ítems con `status = OUT_OF_STOCK` MUST mostrarse con badge rojo.
Ítems con `status = LOW_STOCK` MUST mostrarse con badge naranja/amarillo.
Ítems con `status = ACTIVE` y `quantity > minStock` MUST mostrarse con badge verde.

#### Scenario: Ítem bajo mínimo

- GIVEN un `InventoryItem` con `quantity=2`, `minStock=5`
- WHEN se renderiza la fila
- THEN la fila o badge de estado muestra un color de alerta (naranja/rojo)

#### Scenario: Ítem en stock normal

- GIVEN un `InventoryItem` con `quantity=20`, `minStock=5`
- WHEN se renderiza la fila
- THEN la fila no tiene indicador de alerta

---

### Requirement: Filtros de la lista

La página MUST tener filtros por:
- Búsqueda libre (por nombre o código de parte)
- Estado (`ACTIVE`, `LOW_STOCK`, `OUT_OF_STOCK`, `DISCONTINUED`)
- Toggle "Solo bajo mínimo" (shortcut para `lowStock=true`)

#### Scenario: Filtro por bajo mínimo activado

- GIVEN existen ítems con stock normal y ítems bajo mínimo
- WHEN el usuario activa el toggle "Solo bajo mínimo"
- THEN la tabla muestra sólo los ítems con `quantity <= minStock`

---

### Requirement: Panel de detalle (Sheet)

Al hacer clic en una fila, MUST abrirse un Sheet lateral con:
- Datos del ítem: parte, almacén, cantidad actual, mínimo, máximo, costo promedio, valor total
- Historial de movimientos: tabla con `movementType`, `quantity`, `unitCost`, `performedAt`, paginada (20 por página)
- Botón "Editar umbrales" (visible sólo para MANAGER, OWNER, PURCHASER)
- Botón "Ajuste manual" (visible sólo para MANAGER, OWNER, PURCHASER)

#### Scenario: TECHNICIAN abre panel

- GIVEN un usuario TECHNICIAN
- WHEN hace clic en una fila de la lista
- THEN el Sheet se abre con los datos y el historial
- AND NO se muestran los botones de "Editar umbrales" ni "Ajuste manual"

#### Scenario: PURCHASER abre panel

- GIVEN un usuario PURCHASER
- WHEN hace clic en una fila
- THEN el Sheet se abre con ambos botones visibles

---

### Requirement: Editar umbrales de ítem

Un Dialog MUST abrirse al clickear "Editar umbrales" con un formulario que contenga:
- `minStock`: número (requerido, ≥ 0)
- `maxStock`: número (opcional, debe ser > minStock si se ingresa)
- `location`: texto libre (opcional)

Al confirmar, el sistema MUST hacer `PATCH /api/inventory/items/[id]` y actualizar la vista sin recargar la página.

#### Scenario: Edición exitosa de umbrales

- GIVEN el Sheet está abierto con `minStock=5`
- WHEN el usuario cambia a `minStock=10` y confirma
- THEN el Dialog se cierra, el Sheet actualiza el valor, y la tabla refleja el nuevo mínimo
- AND si `quantity <= 10` el badge pasa a estado de alerta

#### Scenario: maxStock menor que minStock

- GIVEN el usuario ingresa `minStock=20` y `maxStock=10`
- WHEN intenta confirmar
- THEN se muestra error de validación inline y no se hace la llamada a la API

---

### Requirement: Ajuste manual de stock

Un Dialog MUST abrirse al clickear "Ajuste manual" con:
- Tipo: selector `ADJUSTMENT_IN` (Entrada) | `ADJUSTMENT_OUT` (Salida)
- Cantidad: número positivo (requerido)
- Costo unitario: número positivo (visible y requerido sólo para `ADJUSTMENT_IN`)
- Notas: textarea (requerido, mínimo 5 caracteres)

Al confirmar, el sistema MUST hacer `POST /api/inventory/adjustments` y, en caso de éxito:
- Cerrar el Dialog
- Actualizar la cantidad mostrada en el Sheet y en la tabla
- Agregar el movimiento al historial en el Sheet

#### Scenario: Ajuste de entrada exitoso

- GIVEN el Sheet tiene `quantity=10`
- WHEN el usuario elige "Entrada", ingresa cantidad=5, costo=120, notas="Reposición"
- THEN la API retorna 201, el Sheet actualiza `quantity=15`, y el historial muestra el nuevo movimiento

#### Scenario: Ajuste rechazado por stock insuficiente

- GIVEN `quantity=2`
- WHEN el usuario elige "Salida" con cantidad=5 y confirma
- THEN la API retorna 422 y se muestra un toast de error sin cerrar el Dialog

#### Scenario: Notas vacías

- GIVEN el campo notas está vacío o tiene menos de 5 caracteres
- WHEN el usuario intenta confirmar
- THEN se muestra error de validación inline sin llamar a la API

---

### Requirement: Sidebar — Entrada Stock

La entrada "Stock" MUST aparecer en el sidebar bajo la sección "Inventario" para roles: SUPER_ADMIN, OWNER, MANAGER, PURCHASER, TECHNICIAN.

DRIVER MUST NOT ver la entrada "Stock" en el sidebar.

#### Scenario: MANAGER ve el sidebar

- GIVEN un usuario con rol MANAGER
- WHEN navega al dashboard
- THEN en la sección Inventario del sidebar aparece "Stock" con enlace a `/dashboard/inventory/stock`

#### Scenario: DRIVER no ve Stock

- GIVEN un usuario con rol DRIVER
- WHEN navega al dashboard
- THEN la sección Inventario del sidebar NO contiene la entrada "Stock"
