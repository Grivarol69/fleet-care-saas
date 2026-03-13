# Inventory Stock — API Specification

## Purpose

Define el comportamiento de los endpoints que exponen y modifican el stock de inventario real del tenant. El stock está modelado por `InventoryItem` (existencias actuales) y `InventoryMovement` (historial de cambios).

---

## Requirements

### Requirement: Listar ítems de stock

El sistema MUST retornar todos los `InventoryItem` del tenant autenticado, incluyendo los datos del `MasterPart` asociado.

El sistema MUST soportar los siguientes filtros opcionales vía query params:
- `status`: filtra por `InventoryStatus` (`ACTIVE`, `LOW_STOCK`, `OUT_OF_STOCK`, `DISCONTINUED`)
- `warehouse`: filtra por nombre de almacén
- `lowStock`: si `true`, retorna sólo ítems donde `quantity <= minStock`
- `search`: busca por `masterPart.description` o `masterPart.code` (case-insensitive)

El sistema MUST permitir acceso a cualquier usuario autenticado del tenant (OWNER, MANAGER, PURCHASER, TECHNICIAN). DRIVER MUST NOT tener acceso.

#### Scenario: Listar todo el stock

- GIVEN un usuario MANAGER autenticado
- WHEN hace `GET /api/inventory/items`
- THEN recibe array de `InventoryItem` con `masterPart` incluido, del propio tenant
- AND el status HTTP es 200

#### Scenario: Filtrar por bajo mínimo

- GIVEN existen ítems donde `quantity <= minStock` y otros donde `quantity > minStock`
- WHEN hace `GET /api/inventory/items?lowStock=true`
- THEN recibe sólo los ítems donde `quantity <= minStock`

#### Scenario: Filtrar por almacén

- GIVEN existen ítems en almacén "PRINCIPAL" y en almacén "DEPOSITO_2"
- WHEN hace `GET /api/inventory/items?warehouse=DEPOSITO_2`
- THEN recibe sólo los ítems de "DEPOSITO_2"

#### Scenario: DRIVER no puede acceder

- GIVEN un usuario con rol DRIVER autenticado
- WHEN hace `GET /api/inventory/items`
- THEN recibe 403

---

### Requirement: Obtener detalle de ítem

El sistema MUST retornar un `InventoryItem` por su `id`, incluyendo:
- Datos del `MasterPart`
- Los últimos 20 `InventoryMovement` ordenados por `performedAt` DESC (paginados)
- Metadata de paginación: `total`, `page`, `pageSize`

#### Scenario: Obtener ítem existente

- GIVEN un `InventoryItem` con `id = "abc"` existe en el tenant
- WHEN hace `GET /api/inventory/items/abc`
- THEN recibe el ítem con `masterPart` y `movements` (últimos 20)
- AND el status HTTP es 200

#### Scenario: Ítem de otro tenant

- GIVEN un `InventoryItem` existe en `tenantId = "other-tenant"`
- WHEN un usuario del tenant actual hace `GET /api/inventory/items/abc`
- THEN recibe 404 (el filtro de tenant oculta el ítem)

#### Scenario: Ítem no existe

- GIVEN no existe un `InventoryItem` con `id = "xyz"`
- WHEN hace `GET /api/inventory/items/xyz`
- THEN recibe 404

---

### Requirement: Editar umbrales de ítem

El sistema MUST permitir actualizar `minStock`, `maxStock`, `location` y `warehouse` de un `InventoryItem`.

Solo usuarios con rol MANAGER, OWNER, PURCHASER o SUPER_ADMIN MUST poder realizar esta operación (equivalente a `canManagePurchases`). TECHNICIAN MUST NOT poder editar umbrales.

El sistema MUST NOT permitir modificar `quantity`, `averageCost` ni `totalValue` por este endpoint (esos campos sólo cambian vía movimientos).

#### Scenario: MANAGER edita minStock

- GIVEN un `InventoryItem` con `minStock = 5`
- WHEN MANAGER hace `PATCH /api/inventory/items/abc` con `{ minStock: 10 }`
- THEN el ítem queda con `minStock = 10`
- AND el status HTTP es 200

#### Scenario: TECHNICIAN intenta editar

- GIVEN un usuario TECHNICIAN autenticado
- WHEN hace `PATCH /api/inventory/items/abc` con cualquier body
- THEN recibe 403

#### Scenario: Intento de editar quantity directamente

- GIVEN un MANAGER autenticado
- WHEN hace `PATCH /api/inventory/items/abc` con `{ quantity: 999 }`
- THEN el campo `quantity` NO cambia en la base de datos
- AND el resto de campos válidos sí se actualiza si se enviaron

---

### Requirement: Ajuste manual de stock

El sistema MUST permitir registrar un ajuste manual de stock que cree un `InventoryMovement` de tipo `ADJUSTMENT_IN` o `ADJUSTMENT_OUT` y actualice atómicamente `quantity`, `averageCost` y `totalValue` del `InventoryItem`.

El body MUST incluir:
- `inventoryItemId`: String — ítem a ajustar
- `type`: `"ADJUSTMENT_IN"` | `"ADJUSTMENT_OUT"`
- `quantity`: número positivo
- `unitCost`: número positivo (requerido para `ADJUSTMENT_IN`; para `ADJUSTMENT_OUT` se usa el `averageCost` actual)
- `notes`: String — obligatorio, mínimo 5 caracteres

Solo MANAGER, OWNER, PURCHASER y SUPER_ADMIN pueden realizar ajustes. TECHNICIAN MUST NOT.

El costo promedio ponderado MUST recalcularse al hacer `ADJUSTMENT_IN`:
`newAvgCost = (previousStock * previousAvgCost + quantity * unitCost) / (previousStock + quantity)`

Si el resultado de `ADJUSTMENT_OUT` deja `quantity < 0`, el sistema MUST rechazar la operación con 422.

#### Scenario: Ajuste de entrada exitoso

- GIVEN un `InventoryItem` con `quantity=10`, `averageCost=100`
- WHEN PURCHASER hace `POST /api/inventory/adjustments` con `{ type: "ADJUSTMENT_IN", quantity: 5, unitCost: 120, notes: "Reposición de emergencia" }`
- THEN se crea un `InventoryMovement` con `movementType = ADJUSTMENT_IN`
- AND `quantity` del ítem pasa a `15`
- AND `averageCost` se recalcula: `(10*100 + 5*120) / 15 = 106.67`
- AND el status HTTP es 201

#### Scenario: Ajuste de salida exitoso

- GIVEN un `InventoryItem` con `quantity=10`
- WHEN hace `POST /api/inventory/adjustments` con `{ type: "ADJUSTMENT_OUT", quantity: 3, notes: "Merma detectada" }`
- THEN `quantity` del ítem pasa a `7`
- AND se crea un `InventoryMovement` con `movementType = ADJUSTMENT_OUT`

#### Scenario: Ajuste de salida deja stock negativo

- GIVEN un `InventoryItem` con `quantity=2`
- WHEN hace `POST /api/inventory/adjustments` con `{ type: "ADJUSTMENT_OUT", quantity: 5 }`
- THEN recibe 422 con mensaje de error indicando stock insuficiente
- AND el `InventoryItem` NO se modifica

#### Scenario: Notes vacío

- GIVEN cualquier usuario con permiso
- WHEN hace `POST /api/inventory/adjustments` sin campo `notes` o con menos de 5 caracteres
- THEN recibe 400

#### Scenario: TECHNICIAN intenta ajustar

- GIVEN un TECHNICIAN autenticado
- WHEN hace `POST /api/inventory/adjustments`
- THEN recibe 403

---

### Requirement: Aislamiento de tenant

El sistema MUST garantizar que ningún endpoint de inventario retorne, modifique ni procese datos de un `InventoryItem` que no pertenezca al `tenantId` del usuario autenticado.

#### Scenario: Aislamiento en ajuste

- GIVEN un `InventoryItem` con `inventoryItemId` perteneciente a otro tenant
- WHEN un usuario hace `POST /api/inventory/adjustments` referenciando ese id
- THEN recibe 404 (el ítem no es encontrado por el `tenantPrisma`)
