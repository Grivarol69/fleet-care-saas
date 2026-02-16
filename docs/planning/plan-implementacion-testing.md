# Plan de Implementacion: Testing Automatizado Exhaustivo - Fleet Care SaaS

**Fecha**: 16 Febrero 2026
**Version**: 2.0
**Complementa**: `docs/planning/estrategia-testing-y-lanzamiento.md` (estrategia de alto nivel)
**Objetivo**: Plan de ejecucion detallado, archivo por archivo, test por test

---

## Contexto

Fleet Care tiene 82 API routes, 5 services de negocio, 47 modelos Prisma, 28 paginas de dashboard, y solo 7 tests existentes (todos en work-orders). El usuario necesita certeza absoluta de que el software funciona antes del lanzamiento. Este plan reemplaza pruebas manuales con testing automatizado exhaustivo cubriendo todos los circuitos de negocio.

### Estado actual del testing

```
Tests existentes (7 archivos):
  src/lib/__tests__/auth.test.ts                                    -> Mock Clerk, getCurrentUser
  src/lib/__tests__/utils.test.ts                                   -> cn(), formatCurrency()
  src/lib/logic/__tests__/work-order-utils.test.ts                  -> Status transitions (logica en el test)
  src/lib/services/__tests__/MaintenanceAlertService.test.ts        -> Mocked Prisma, alert levels
  src/app/api/maintenance/work-orders/__tests__/work-order-api.test.ts -> Integration DB real, POST
  src/app/api/maintenance/work-orders/__tests__/e2e-flow.test.ts    -> Alert->WO->Complete lifecycle
  src/app/api/maintenance/work-orders/[id]/__tests__/route.test.ts  -> PATCH transitions, closure blocking

Patron establecido:
  - vi.mock('@/lib/auth') para mock de autenticacion
  - DB real PostgreSQL en docker (puerto 5433) para integration
  - Cleanup manual con 10+ deleteMany en afterEach (fragil, sin centralizar)
  - Sin factories, sin helpers compartidos, sin test utils
```

### Infraestructura disponible

- **Vitest 3.2.4** + jsdom + @testing-library/react (ya instalados)
- **Docker Compose**: `docker-compose.test.yml` con PostgreSQL 15 en puerto 5433
- **`.env.test`**: DATABASE_URL apuntando a DB test + mocks de Clerk
- **Scripts npm**: `pnpm test`, `pnpm test:watch`, `pnpm db:test:push`, `pnpm db:test:seed`

---

## FASE 0: Infraestructura de Testing

**Objetivo**: Crear helpers reutilizables que eliminen duplicacion y hagan los tests faciles de escribir.

### 0.1 Test Factory - `src/test/helpers/test-factory.ts`

Factory centralizada para crear datos de test. Cada factory retorna el objeto creado con su ID.

```typescript
// Funciones a implementar:
createTestTenant(overrides?) -> Tenant
  // slug unico: 'test-' + Date.now() + random
  // country: 'CO' por defecto

createTestUser(tenantId, overrides?) -> User
  // role: 'OWNER' por defecto
  // email: `test-${Date.now()}@test.com`

createTestVehicle(tenantId, overrides?) -> Vehicle + brand + line + type
  // Crea brand, line, type automaticamente
  // licensePlate: 'TEST-' + random
  // status: 'ACTIVE', mileage: 50000

createTestMantItem(tenantId, overrides?) -> MantItem + category
  // Crea categoria automaticamente
  // mantType: 'PREVENTIVE' por defecto

createTestMaintenanceProgram(tenantId, vehicleId, userId, overrides?) -> {program, package, item}
  // Crea programa + package + programItem completo
  // Retorna los 3 objetos para poder referenciarlos

createTestAlert(tenantId, vehicleId, programItemId, overrides?) -> MaintenanceAlert
  // type: 'OVERDUE', priority: 'HIGH', status: 'PENDING'

createTestProvider(tenantId, overrides?) -> Provider
  // name, email, phone generados

createTestMasterPart(tenantId, overrides?) -> MasterPart
  // code: 'MP-' + random, referencePrice: 50000

createTestInventoryItem(tenantId, masterPartId, overrides?) -> InventoryItem
  // quantity: 100, averageCost: 50000, status: 'ACTIVE'

createTestWorkOrder(tenantId, vehicleId, overrides?) -> WorkOrder
  // status: 'PENDING', priority: 'MEDIUM'

createTestWorkOrderWithItems(tenantId, vehicleId, mantItemId, overrides?) -> {workOrder, items}
  // Crea OT + items vinculados
```

### 0.2 Cleanup Helper - `src/test/helpers/test-cleanup.ts`

```typescript
cleanupTenant(tenantId: string) -> void
  // Borra en orden correcto de FK dependencies:
  // 1. InvoiceItem, Invoice
  // 2. PurchaseOrderItem, PurchaseOrder
  // 3. InventoryMovement, InventoryItem
  // 4. WorkOrderExpense, WorkOrderItem, WorkOrder
  // 5. InternalWorkTicket
  // 6. FinancialAlert
  // 7. MaintenanceAlert
  // 8. VehicleProgramItem, VehicleProgramPackage, VehicleMantProgram
  // 9. PartPriceHistory
  // 10. MantItemVehiclePart, MantItem, MantCategory
  // 11. MasterPart
  // 12. OdometerLog, VehicleDocument, Vehicle
  // 13. VehicleLine, VehicleBrand, VehicleType
  // 14. Provider, Driver, Technician
  // 15. MantItemRequest
  // 16. User
  // 17. Tenant
```

### 0.3 Auth Mock Helper - `src/test/helpers/auth-mock.ts`

```typescript
import { vi } from 'vitest';

// Debe llamarse DESPUES de vi.mock('@/lib/auth')
mockAuthAsUser(user: Partial<User> & { tenantId: string; role: string; id: string })
  // Configura getCurrentUser para retornar este user

mockAuthAsUnauthenticated()
  // getCurrentUser retorna null

mockAuthAsSuperAdmin(user)
  // getCurrentUser retorna user con isSuperAdmin: true
```

### 0.4 Request Helpers - `src/test/helpers/request-helpers.ts`

```typescript
createApiRequest(method: string, url: string, body?: object) -> NextRequest
  // Crea NextRequest con JSON body y headers correctos

createApiRequestWithParams(method: string, url: string, params: Record<string, string>) -> NextRequest
  // Crea NextRequest con search params (para GET con filtros)
```

### 0.5 Vitest Config Update - `vitest.config.ts`

```typescript
// Agregar:
resolve.alias['@test'] = path.resolve(__dirname, './src/test')

// Considerar separar en 2 projects:
// - unit: environment 'node', include: ['src/lib/**/*.test.ts']
// - integration: environment 'node', include: ['src/app/api/**/*.test.ts']
// Esto permite correr unit tests sin DB
```

### 0.6 Archivos a crear en Fase 0:

| Archivo | Descripcion |
|---------|-------------|
| `src/test/helpers/test-factory.ts` | Factories de datos de test |
| `src/test/helpers/test-cleanup.ts` | Limpieza centralizada por tenant |
| `src/test/helpers/auth-mock.ts` | Mock reutilizable de auth |
| `src/test/helpers/request-helpers.ts` | Helpers para crear NextRequest |
| `src/test/helpers/index.ts` | Barrel export |

### 0.7 Archivos a modificar en Fase 0:

| Archivo | Cambio |
|---------|--------|
| `vitest.config.ts` | Agregar alias `@test`, considerar projects |

---

## FASE 1: Tests Unitarios de Logica de Negocio (Sin DB)

**Objetivo**: Probar funciones puras. No requieren Docker ni DB. Son rapidos.

### 1.1 Permisos - `src/lib/__tests__/permissions.test.ts`

**Archivo bajo test**: `src/lib/permissions.ts` (258 lineas, 20+ funciones de permisos)

```
Tests (~25):

describe('Individual Role Validators')
  - isSuperAdmin: true para SUPER_ADMIN, false para todos los demas
  - isOwner: true para OWNER, false para otros
  - isTechnician, isPurchaser, isDriver: idem
  - Todas retornan false con null

describe('Composite Permissions')
  canManageMasterData:
    - true para SUPER_ADMIN, OWNER, MANAGER
    - false para TECHNICIAN, PURCHASER, DRIVER
    - false para null

  canViewCosts:
    - true para SUPER_ADMIN, OWNER, MANAGER, PURCHASER
    - false para TECHNICIAN, DRIVER

  canCreateWorkOrders:
    - true para SUPER_ADMIN, OWNER, MANAGER
    - false para TECHNICIAN, PURCHASER, DRIVER

  canExecuteWorkOrders:
    - true para SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN
    - false para PURCHASER, DRIVER

  canManagePurchases:
    - true para SUPER_ADMIN, OWNER, MANAGER, PURCHASER
    - false para TECHNICIAN, DRIVER

  canApproveInvoices:
    - true para SUPER_ADMIN, OWNER, MANAGER, PURCHASER
    - false para TECHNICIAN, DRIVER

  canManageVehicles / canDeleteVehicles:
    - Verificar que solo OWNER puede delete, MANAGER puede manage

  canCreateMantItems / canResolveMantItemRequests:
    - TECHNICIAN NO puede crear directamente (debe usar request)

describe('requireMasterDataMutationPermission')
  - Item global + SUPER_ADMIN: OK
  - Item global + OWNER: throws error
  - Item tenant + OWNER mismo tenant: OK
  - Item tenant + OWNER otro tenant: throws error
  - Item tenant + TECHNICIAN: throws error

describe('requireAuthenticated / requireManagementRole')
  - null user: throws
  - valid user: no throw
```

### 1.2 Calculos Financieros - `src/lib/logic/__tests__/financial-calculations.test.ts`

**Nota**: Las funciones de calculo estan actualmente inline en las API routes. Debemos extraerlas a `src/lib/logic/financial-calculations.ts` ANTES de testear (refactor menor).

```
Funciones a extraer y testear:

calculateSubtotal(items: {quantity, unitPrice}[]) -> number
calculateTax(subtotal, taxRate) -> number
calculateTotal(subtotal, taxAmount) -> number
calculatePriceDeviation(referencePrice, actualPrice) -> {deviationPercent, exceedsThreshold}
calculateWeightedAverageCost(currentStock, currentAvgCost, newQuantity, newUnitCost) -> number
generateOrderNumber(year, sequentialNumber) -> string // OC-YYYY-000001
calculateBudgetOverrun(estimatedCost, actualExpenses) -> {overrun, overrunPercent}

Tests (~15):

describe('calculateSubtotal')
  - Items vacios: 0
  - Un item: quantity * unitPrice
  - Multiples items: suma correcta
  - Decimales: precision correcta

describe('calculatePriceDeviation')
  - Dentro del 10%: exceedsThreshold = false
  - Exactamente 10%: exceedsThreshold = false (tolerancia inclusiva)
  - 11%: exceedsThreshold = true
  - Precio menor: exceedsThreshold = false
  - Precio referencia 0: edge case

describe('calculateWeightedAverageCost')
  - Stock 100 a $50, compra 50 a $80 -> avg cost = $60
  - Stock 0 (primera compra): avg = precio de compra
  - Compra de 0 unidades: avg no cambia

describe('generateOrderNumber')
  - Formato correcto: OC-2026-000001
  - Padding: 1 -> 000001, 999999 -> 999999

describe('calculateBudgetOverrun')
  - Sin exceso: overrun = 0
  - Exceso 20%: calculo correcto
  - estimatedCost = 0: edge case
```

### 1.3 Logica de Mantenimiento - `src/lib/logic/__tests__/maintenance-logic.test.ts`

**Nota**: Similar al anterior, extraer funciones puras de `MaintenanceAlertService.ts`.

```
Funciones a extraer:

calculateAlertLevel(kmToMaintenance) -> 'NONE' | 'UPCOMING' | 'WARNING' | 'CRITICAL'
  // 2000+ = NONE, 1000-2000 = UPCOMING, 500-1000 = WARNING, <500 = CRITICAL

calculatePriorityScore(alertLevel, mantType, daysOverdue) -> number // 0-100

getEstimatedCost(mantItemVehiclePart?, programItem?, alert?) -> number
  // Fallback chain: mantItemVehiclePart.estimatedCost -> programItem.estimatedCost -> alert.estimatedCost -> 0

Tests (~12):

describe('calculateAlertLevel')
  - 5000 km: NONE
  - 1500 km: UPCOMING
  - 800 km: WARNING
  - 200 km: CRITICAL
  - 0 km: CRITICAL
  - Negativo (-500): CRITICAL (ya vencido)

describe('calculatePriorityScore')
  - CRITICAL + PREVENTIVE + 30 dias overdue: score alto (>80)
  - UPCOMING + PREVENTIVE + 0 dias: score bajo (<30)
  - Verificar que score esta entre 0-100

describe('getEstimatedCost - fallback chain')
  - Con MantItemVehiclePart.estimatedCost: usa ese
  - Sin MantItemVehiclePart, con ProgramItem.estimatedCost: usa ese
  - Sin ambos, con Alert.estimatedCost: usa ese
  - Sin ninguno: retorna 0
```

### 1.4 Mejorar test existente - `src/lib/logic/__tests__/work-order-utils.test.ts`

**Archivo existente**: Ya tiene tests basicos de transitions y financial calcs.

```
Tests a AGREGAR (~10):

describe('Work Order Status Transitions - complete')
  - PENDING -> IN_PROGRESS: valido
  - IN_PROGRESS -> COMPLETED: valido (si items OK)
  - IN_PROGRESS -> COMPLETED: invalido (items pendientes)
  - COMPLETED -> cualquier: invalido
  - CANCELLED -> cualquier: invalido
  - PENDING -> COMPLETED: invalido (no puede saltarse IN_PROGRESS)

describe('Closure Validation')
  - Todos items COMPLETED: puede cerrar
  - 1 item PENDING: no puede cerrar (retorna items pendientes)
  - Items mixtos (COMPLETED + CANCELLED): puede cerrar
  - OT sin items: puede cerrar (edge case)

describe('Estimated vs Actual Cost')
  - Calculo de variacion: (actual - estimated) / estimated * 100
  - Edge: estimated = 0
```

### Archivos a crear en Fase 1:

| Archivo | Tests | Tipo |
|---------|-------|------|
| `src/lib/__tests__/permissions.test.ts` | ~25 | Unit |
| `src/lib/logic/financial-calculations.ts` | - | Refactor (extraer funciones) |
| `src/lib/logic/__tests__/financial-calculations.test.ts` | ~15 | Unit |
| `src/lib/logic/maintenance-logic.ts` | - | Refactor (extraer funciones) |
| `src/lib/logic/__tests__/maintenance-logic.test.ts` | ~12 | Unit |
| `src/lib/logic/__tests__/work-order-utils.test.ts` | +10 | Unit (agregar) |

**Subtotal Fase 1: ~62 tests unitarios**

---

## FASE 2: Tests de Integracion API (DB Real)

**Objetivo**: Probar cada circuito de negocio critico contra la base de datos real. Requiere Docker corriendo.

**Patron comun para todos los tests de esta fase:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTestTenant, createTestUser, ... } from '@test/helpers';
import { cleanupTenant } from '@test/helpers';
import { mockAuthAsUser } from '@test/helpers';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

describe('Nombre del Test Suite', () => {
  let tenantId: string;
  let user: User;

  beforeEach(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    user = await createTestUser(tenantId, { role: 'OWNER' });
    mockAuthAsUser(user);
  });

  afterEach(async () => {
    await cleanupTenant(tenantId);
    vi.clearAllMocks();
  });

  // ... tests
});
```

### 2.1 Circuito Preventivo Completo

**Archivo**: `src/app/api/maintenance/work-orders/__tests__/preventive-circuit.test.ts`

**APIs bajo test**:
- `POST /api/maintenance/work-orders` (src/app/api/maintenance/work-orders/route.ts)
- `GET /api/maintenance/alerts` (src/app/api/maintenance/alerts/route.ts)

```
Tests (~8):

it('crea OT preventiva desde alertas y vincula correctamente')
  Setup: tenant + user + vehicle + mantProgram + alert
  Action: POST /work-orders con alertIds
  Assert:
    - Response 201 con OT creada
    - OT.status = PENDING
    - OT.mantType = PREVENTIVE
    - Alert.status cambia a IN_PROGRESS
    - Alert.workOrderId = OT.id
    - WorkOrderItem creado con mantItemId correcto
    - WorkOrderItem.totalCost = programItem.estimatedCost (fallback nivel 1)

it('usa fallback de costo nivel 2 (alert.estimatedCost) cuando no hay programItem cost')
  Setup: programItem sin estimatedCost, alert con estimatedCost
  Assert: WorkOrderItem.totalCost = alert.estimatedCost

it('usa costo 0 cuando no hay ninguna referencia de costo')

it('rechaza creacion sin alertas (400)')
  Action: POST con alertIds: []
  Assert: 400

it('rechaza creacion con alertas de otro tenant (404 o ignoradas)')

it('rechaza creacion si vehiculo no pertenece al tenant (404)')

it('rechaza creacion si usuario no tiene permisos (403)')
  Setup: user con role DRIVER
  Assert: 403

it('maneja multiples alertas en una sola OT')
  Setup: 3 alertas pendientes
  Action: POST con alertIds: [id1, id2, id3]
  Assert: 3 WorkOrderItems creados, 3 alertas actualizadas
```

### 2.2 Circuito Correctivo con Taller Interno

**Archivo**: `src/app/api/maintenance/work-orders/__tests__/corrective-internal.test.ts`

**APIs bajo test**:
- `POST /api/maintenance/work-orders` (creacion OT correctiva)
- `POST /api/maintenance/work-orders/[id]/items` (agregar items)
- `PATCH /api/maintenance/work-orders/[id]` (cambio de estado)
- `PATCH /api/maintenance/work-orders/[id]/items/[itemId]` (completar items)

```
Tests (~10):

it('crea OT correctiva manual (workType: INTERNAL)')
  Assert: OT.mantType = CORRECTIVE, OT.workType = INTERNAL

it('agrega items a OT existente')
  Action: POST /work-orders/{id}/items
  Assert: Item creado con cantidad, precio, total correctos

it('transicion PENDING -> IN_PROGRESS')
  Action: PATCH { action: 'start' }
  Assert: OT.status = IN_PROGRESS

it('bloquea COMPLETED si hay items pendientes')
  Setup: OT con 2 items, 1 PENDING
  Action: PATCH { action: 'complete' }
  Assert: 400 con mensaje de items pendientes

it('permite COMPLETED cuando todos items estan COMPLETED o CANCELLED')
  Setup: Marcar todos items como COMPLETED
  Action: PATCH { action: 'complete' }
  Assert: OT.status = COMPLETED

it('calcula estimatedCost como suma de items.totalCost')

it('agrega item con consumo de inventario')
  Setup: InventoryItem con stock = 50
  Action: POST item con useInventory: true
  Assert: Stock decrementado, InventoryMovement creado

it('bloquea consumo de inventario si stock insuficiente')
  Setup: InventoryItem con stock = 2
  Action: POST item con quantity = 5, useInventory: true
  Assert: Error stock insuficiente

it('rechaza agregar items si OT esta COMPLETED')

it('TECHNICIAN puede ejecutar pero no crear OT')
  Setup: mock auth como TECHNICIAN
  Assert: POST crear OT -> 403, PATCH start -> 200
```

### 2.3 Ordenes de Compra - Lifecycle Completo

**Archivo**: `src/app/api/purchase-orders/__tests__/purchase-order-lifecycle.test.ts`

**APIs bajo test**:
- `POST /api/purchase-orders` (src/app/api/purchase-orders/route.ts)
- `PATCH /api/purchase-orders/[id]` (src/app/api/purchase-orders/[id]/route.ts)
- `GET /api/purchase-orders` (listado con filtros)
- `DELETE /api/purchase-orders/[id]`

```
Tests (~12):

it('crea OC vinculada a OT con numero secuencial correcto')
  Assert: orderNumber = OC-2026-000001, status = DRAFT

it('segunda OC tiene numero secuencial correcto')
  Action: Crear 2 OCs
  Assert: OC-2026-000001 y OC-2026-000002

it('calcula subtotal y total correctamente')
  Items: [{qty: 2, price: 50000}, {qty: 1, price: 100000}]
  Assert: subtotal = 200000, total = 200000 (taxRate = 0)

it('workflow completo: DRAFT -> submit -> PENDING_APPROVAL')
  Action: PATCH { action: 'submit' }
  Assert: status = PENDING_APPROVAL

it('workflow: PENDING_APPROVAL -> approve -> APPROVED')
  Action: PATCH { action: 'approve' }
  Assert: status = APPROVED, approvedBy = userId, approvedAt != null

it('workflow: approve registra quien aprobo y cuando')

it('workflow: APPROVED -> send -> SENT (mock email)')
  Setup: Provider con email, mock Resend
  Action: PATCH { action: 'send' }
  Assert: status = SENT, sentAt != null
  NOTE: Debemos mockear Resend y renderToBuffer para este test

it('reject vuelve a DRAFT')
  Action: PATCH { action: 'reject' } desde PENDING_APPROVAL
  Assert: status = DRAFT

it('cancel desde multiples estados validos')
  Assert: cancel desde DRAFT, PENDING_APPROVAL, APPROVED -> CANCELLED

it('transicion invalida: send desde DRAFT -> 400')

it('permisos: TECHNICIAN no puede aprobar (403)')
  Setup: mock auth como TECHNICIAN
  Assert: PATCH approve -> 403

it('permisos: PURCHASER puede submit pero no approve')

it('DELETE solo funciona en DRAFT')
  Assert: DELETE de OC en APPROVED -> 400
  Assert: DELETE de OC en DRAFT -> 200

it('GET con filtros: status, workOrderId, providerId')
  Setup: 3 OCs con diferentes estados
  Action: GET ?status=DRAFT
  Assert: Solo retorna OCs en DRAFT

it('GET con filtro comma-separated: status=APPROVED,SENT')
  Assert: Retorna OCs en APPROVED y SENT
```

### 2.4 Facturas y Watchdog Financiero

**Archivo**: `src/app/api/invoices/__tests__/invoice-lifecycle.test.ts`

**APIs bajo test**:
- `POST /api/invoices` (src/app/api/invoices/route.ts)
- `GET /api/invoices` y `GET /api/invoices/[id]`
- `src/lib/services/FinancialWatchdogService.ts` (integrado)

```
Tests (~10):

it('crea factura vinculada a OC')
  Setup: OC en estado APPROVED/SENT con items
  Action: POST /invoices con purchaseOrderId
  Assert: Invoice creada con items, vinculada a OC

it('crea factura independiente (sin OC)')
  Action: POST /invoices sin purchaseOrderId
  Assert: Invoice creada correctamente

it('Watchdog detecta sobreprecio >10%')
  Setup: MasterPart con referencePrice = 100000
  Action: Crear factura con item a precio 120000 (+20%)
  Assert: FinancialAlert creada con type = PRICE_DEVIATION

it('Watchdog NO alerta si precio dentro del 10%')
  Setup: MasterPart con referencePrice = 100000
  Action: Item a precio 109000 (+9%)
  Assert: NO se crea FinancialAlert

it('Watchdog detecta exceso de presupuesto en OT')
  Setup: OT con estimatedCost = 500000, expenses existentes = 400000
  Action: Nuevo expense de 200000 (total = 600000, +20% overrun)
  Assert: FinancialAlert con type = BUDGET_OVERRUN

it('Watchdog no duplica alertas de budget overrun')
  Setup: Ya existe alerta BUDGET_OVERRUN PENDING
  Action: Otro expense que excede presupuesto
  Assert: No se crea nueva alerta

it('updateReferencePrice actualiza masterPart y crea historial')
  Action: FinancialWatchdogService.updateReferencePrice(...)
  Assert: masterPart.referencePrice actualizado, partPriceHistory creado

it('listado de facturas filtrado por tenant')

it('GET factura por ID incluye items y OC')

it('factura rechazada si proveedor no existe')
```

### 2.5 Inventario y Consumo

**Archivo**: `src/app/api/inventory/__tests__/inventory-lifecycle.test.ts`

**APIs bajo test**:
- `POST /api/inventory/purchases` (entrada de stock)
- `POST /api/inventory/consume` (consumo desde OT)
- `GET /api/inventory/items`
- `GET /api/inventory/movements`
- `src/lib/services/InventoryService.ts`

```
Tests (~10):

it('checkAvailability retorna true si hay stock suficiente')
  Setup: InventoryItem con quantity = 100
  Action: checkAvailability(tenantId, masterPartId, 50)
  Assert: available = true, currentStock = 100

it('checkAvailability retorna false si stock insuficiente')
  Action: checkAvailability(tenantId, masterPartId, 150)
  Assert: available = false

it('checkAvailability retorna false si no existe item')
  Assert: available = false, currentStock = 0

it('consumeStockForWorkOrder crea movimiento y decrementa stock')
  Setup: InventoryItem stock = 100, averageCost = 50000
  Action: consumeStockForWorkOrder(tenantId, woId, woItemId, userId, masterPartId, 10)
  Assert:
    - InventoryMovement creado con type = CONSUMPTION
    - movement.quantity = 10, unitCost = 50000, totalCost = 500000
    - movement.previousStock = 100, newStock = 90
    - InventoryItem.quantity = 90

it('consumeStockForWorkOrder falla si stock insuficiente')
  Setup: stock = 5
  Action: consumir 10
  Assert: throws Error "Insufficient stock"

it('purchase entry actualiza weighted average cost')
  Setup: stock 100 a avg $50, nueva compra 50 a $80
  Assert: nuevo avgCost = (100*50 + 50*80) / 150 = $60

it('primera compra (stock 0) establece average cost = unit cost')

it('listado de items filtrado por tenant')

it('listado de movimientos filtrado por inventoryItemId')

it('GET items con stock bajo (below minStock)')
```

### 2.6 Seguridad Multi-tenant

**Archivo**: `src/app/api/__tests__/multi-tenant-security.test.ts`

**Proposito**: Verificar que un tenant NUNCA puede acceder a datos de otro tenant.

```
Tests (~12):

Setup: Crear 2 tenants (A y B) con datos identicos

describe('Vehiculos')
  it('Tenant A no ve vehiculos de Tenant B en listado')
  it('Tenant A no puede GET vehiculo de Tenant B por ID')

describe('Work Orders')
  it('Tenant A no ve OTs de Tenant B')
  it('Tenant A no puede PATCH OT de Tenant B')

describe('Purchase Orders')
  it('Tenant A no ve OCs de Tenant B')
  it('Tenant A no puede aprobar OC de Tenant B')

describe('Invoices')
  it('Tenant A no ve facturas de Tenant B')

describe('Inventory')
  it('Tenant A no puede consumir stock de Tenant B')

describe('Alerts')
  it('Tenant A no ve alertas de Tenant B')

describe('People')
  it('Tenant A no ve proveedores de Tenant B')

describe('Dashboard')
  it('Dashboard metricas son exclusivas del tenant')

describe('Cross-tenant creation')
  it('No se puede crear OT con vehiculo de otro tenant')
```

### 2.7 Vehiculos y Datos Maestros

**Archivo**: `src/app/api/vehicles/__tests__/vehicles-crud.test.ts`

**APIs bajo test**:
- `POST/GET /api/vehicles/brands`, `POST/GET /api/vehicles/lines`, `POST/GET /api/vehicles/types`
- `POST/GET/PATCH/DELETE /api/vehicles/vehicles`
- `POST /api/vehicles/odometer`

```
Tests (~8):

it('CRUD completo: crear brand -> line -> type -> vehicle')
it('vehiculo con licensePlate duplicada en mismo tenant -> error')
it('vehiculo con licensePlate duplicada en OTRO tenant -> OK')
it('DRIVER no puede crear vehiculos (403)')
it('registrar odometro incrementa mileage del vehiculo')
it('odometro rechaza valor menor al actual')
it('GET vehiculos con filtros: status, brandId')
it('DELETE vehiculo (solo OWNER)')
```

### 2.8 Personas (Providers, Technicians, Drivers)

**Archivo**: `src/app/api/people/__tests__/people-crud.test.ts`

```
Tests (~8):

it('CRUD proveedor completo')
it('proveedor sin email se puede crear pero no recibir OC')
it('CRUD tecnico completo')
it('CRUD conductor completo')
it('DRIVER no puede gestionar proveedores (403)')
it('PURCHASER puede gestionar proveedores')
it('proveedor con email duplicado en mismo tenant -> error')
it('listado personas filtrado por tenant')
```

### 2.9 Items de Mantenimiento y Templates

**Archivo**: `src/app/api/maintenance/__tests__/mant-items-crud.test.ts`

**APIs bajo test**:
- `POST/GET /api/maintenance/mant-categories`
- `POST/GET/PATCH/DELETE /api/maintenance/mant-items`
- `POST /api/maintenance/mant-template/clone`
- `POST/GET /api/maintenance/mant-item-requests`

```
Tests (~8):

it('CRUD categoria de mantenimiento')
it('CRUD item de mantenimiento con categoria')
it('clonar template global a tenant')
it('buscar items similares por nombre')
it('TECHNICIAN no puede crear item directamente (403)')
it('TECHNICIAN crea MantItemRequest')
it('MANAGER aprueba MantItemRequest -> item creado')
it('MANAGER rechaza MantItemRequest')
```

### 2.10 Dashboard y Metricas

**Archivo**: `src/app/api/dashboard/__tests__/dashboard-metrics.test.ts`

**APIs bajo test**:
- `GET /api/dashboard/navbar-stats`
- `GET /api/dashboard/fleet-status`
- `GET /api/dashboard/financial-metrics`

```
Tests (~6):

it('navbar-stats retorna conteos correctos')
  Setup: 3 vehiculos, 2 alertas pending, 1 OT
  Assert: vehicleCount = 3, pendingAlerts = 2, activeWorkOrders = 1

it('fleet-status retorna distribucion de estados vehiculos')
  Setup: 3 ACTIVE, 1 MAINTENANCE, 1 INACTIVE
  Assert: distribucion correcta

it('financial-metrics calcula totales del periodo')

it('metricas son exclusivas del tenant (no mezcla)')

it('TECHNICIAN no puede ver dashboard financiero (403)')

it('datos vacios retornan 0s, no errors')
```

**Subtotal Fase 2: ~82 tests de integracion**

---

## FASE 3: Seed Masivo y Stress Testing

### 3.1 Script Seed Masivo - `prisma/seed-stress.ts`

```typescript
// Genera datos realistas para 3 tenants:
//
// Tenant 1 "Transportes del Norte" (flota grande):
//   - 5 usuarios, 10 proveedores, 80 vehiculos
//   - 200 OTs en diferentes estados
//   - 80 OCs, 40 facturas
//   - 300 alertas, 500 items inventario
//
// Tenant 2 "Logistica Express" (flota mediana):
//   - 3 usuarios, 5 proveedores, 30 vehiculos
//   - 80 OTs, 30 OCs, 20 facturas
//
// Tenant 3 "Servicios Rapidos" (flota pequena):
//   - 2 usuarios, 3 proveedores, 10 vehiculos
//   - 20 OTs, 10 OCs, 5 facturas
//
// Total: ~2000+ registros distribuidos realisticamente
//
// Script: pnpm db:test:seed:stress
```

### 3.2 Tests de Stress - `src/test/__tests__/stress.test.ts`

```
Tests (~5):

it('GET /work-orders con 200+ registros responde en <2s')
it('GET /purchase-orders con filtros multiples responde en <2s')
it('GET /dashboard/financial-metrics con datos masivos responde en <2s')
it('GET /inventory/items con 500+ items responde en <2s')
it('GET /maintenance/alerts con 300+ alertas responde en <2s')
```

**Subtotal Fase 3: ~5 tests de stress + seed script**

---

## FASE 4: Fixes Menores

### 4.1 Fix Pre-commit Hook (ESLint OOM)

**Archivo**: `.lintstagedrc.js` o `package.json` (lint-staged config)

**Problema**: `lint-staged` ejecuta ESLint sobre TODOS los archivos staged. Con 439+ archivos staged, ESLint se queda sin memoria (SIGKILL).

**Solucion**: Configurar lint-staged para que solo ejecute ESLint sobre archivos `.ts`/`.tsx` staged, con `--max-warnings` razonable y sin `--fix` (que es mas pesado).

### 4.2 Mock de Resend para tests de envio OC

**Necesidad**: Los tests de `PATCH /purchase-orders/[id]` con action `send` necesitan mockear:
- `Resend` (envio de email)
- `renderToBuffer` de `@react-pdf/renderer` (generacion PDF)

**Archivo**: Agregar mock en test o en `src/test/helpers/external-mocks.ts`

---

## Resumen de Archivos

### Archivos NUEVOS a crear:

| # | Archivo | Fase | Tipo |
|---|---------|------|------|
| 1 | `src/test/helpers/test-factory.ts` | 0 | Infra |
| 2 | `src/test/helpers/test-cleanup.ts` | 0 | Infra |
| 3 | `src/test/helpers/auth-mock.ts` | 0 | Infra |
| 4 | `src/test/helpers/request-helpers.ts` | 0 | Infra |
| 5 | `src/test/helpers/index.ts` | 0 | Infra |
| 6 | `src/lib/__tests__/permissions.test.ts` | 1 | Unit |
| 7 | `src/lib/logic/financial-calculations.ts` | 1 | Refactor |
| 8 | `src/lib/logic/__tests__/financial-calculations.test.ts` | 1 | Unit |
| 9 | `src/lib/logic/maintenance-logic.ts` | 1 | Refactor |
| 10 | `src/lib/logic/__tests__/maintenance-logic.test.ts` | 1 | Unit |
| 11 | `src/app/api/maintenance/work-orders/__tests__/preventive-circuit.test.ts` | 2 | Integration |
| 12 | `src/app/api/maintenance/work-orders/__tests__/corrective-internal.test.ts` | 2 | Integration |
| 13 | `src/app/api/purchase-orders/__tests__/purchase-order-lifecycle.test.ts` | 2 | Integration |
| 14 | `src/app/api/invoices/__tests__/invoice-lifecycle.test.ts` | 2 | Integration |
| 15 | `src/app/api/inventory/__tests__/inventory-lifecycle.test.ts` | 2 | Integration |
| 16 | `src/app/api/__tests__/multi-tenant-security.test.ts` | 2 | Integration |
| 17 | `src/app/api/vehicles/__tests__/vehicles-crud.test.ts` | 2 | Integration |
| 18 | `src/app/api/people/__tests__/people-crud.test.ts` | 2 | Integration |
| 19 | `src/app/api/maintenance/__tests__/mant-items-crud.test.ts` | 2 | Integration |
| 20 | `src/app/api/dashboard/__tests__/dashboard-metrics.test.ts` | 2 | Integration |
| 21 | `prisma/seed-stress.ts` | 3 | Seed |
| 22 | `src/test/__tests__/stress.test.ts` | 3 | Stress |
| 23 | `src/test/helpers/external-mocks.ts` | 4 | Infra |

### Archivos a MODIFICAR:

| Archivo | Cambio |
|---------|--------|
| `vitest.config.ts` | Alias `@test`, considerar projects |
| `src/lib/logic/__tests__/work-order-utils.test.ts` | +10 tests |
| `package.json` | Script `db:test:seed:stress` |
| `.lintstagedrc.js` o `package.json` | Fix lint-staged config |

---

## Conteo Total de Tests

| Fase | Tests Nuevos | Tipo |
|------|-------------|------|
| Fase 1: Unit | ~62 | Sin DB, rapidos |
| Fase 2: Integration | ~82 | DB real, circuitos completos |
| Fase 3: Stress | ~5 | Performance con datos masivos |
| **Total** | **~149** | **+ 7 existentes = ~156 tests** |

---

## Orden de Ejecucion Recomendado

```
SESION 1: Fase 0 (Infraestructura)
  -> test-factory, test-cleanup, auth-mock, request-helpers
  -> Actualizar vitest.config.ts
  -> Verificar que tests existentes siguen pasando

SESION 2: Fase 1 (Unit tests)
  -> permissions.test.ts (25 tests)
  -> Extraer + testear financial-calculations (15 tests)
  -> Extraer + testear maintenance-logic (12 tests)
  -> Mejorar work-order-utils (10 tests)

SESION 3-4: Fase 2.1-2.3 (Circuitos core)
  -> preventive-circuit.test.ts (8 tests)
  -> corrective-internal.test.ts (10 tests)
  -> purchase-order-lifecycle.test.ts (12 tests)

SESION 5-6: Fase 2.4-2.6 (Financial + Security)
  -> invoice-lifecycle.test.ts (10 tests)
  -> inventory-lifecycle.test.ts (10 tests)
  -> multi-tenant-security.test.ts (12 tests)

SESION 7: Fase 2.7-2.10 (CRUD + Dashboard)
  -> vehicles-crud.test.ts (8 tests)
  -> people-crud.test.ts (8 tests)
  -> mant-items-crud.test.ts (8 tests)
  -> dashboard-metrics.test.ts (6 tests)

SESION 8: Fase 3 (Stress) + Fase 4 (Fixes)
  -> seed-stress.ts
  -> stress.test.ts (5 tests)
  -> Fix pre-commit hook
  -> Fix mock Resend/PDF
```

## Verificacion

Despues de cada sesion:
```bash
docker compose -f docker-compose.test.yml up -d  # DB test corriendo
pnpm db:test:push                                 # Schema sincronizado
pnpm test                                         # Todos los tests pasan
pnpm type-check                                   # 0 errores TypeScript
```

Al finalizar todas las fases:
- `pnpm test` → ~156 tests en verde
- Cada circuito de negocio critico tiene cobertura
- Multi-tenancy verificada con tests cruzados entre 2 tenants
- Watchdog financiero verificado con datos de borde (10% threshold)
- Inventario verificado con stock insuficiente, weighted avg cost
- Permisos verificados para cada rol (6 roles x funciones criticas)
- Performance verificada con datos masivos (<2s por API)
