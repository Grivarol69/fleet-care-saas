# Estrategia de Testing y Plan de Lanzamiento - Fleet Care SaaS

**Fecha**: 14 Febrero 2026
**Version**: 1.0
**Autor**: Equipo Fleet Care
**Objetivo**: Reemplazar pruebas manuales con testing automatizado y definir ruta critica al lanzamiento

---


## 1. ESTADO ACTUAL DEL PROYECTO

### 1.1 Numeros del Proyecto

| Metrica | Cantidad |
|---------|----------|
| Modelos Prisma | 47 |
| Enums de tipo | 42 |
| Endpoints API | 82 |
| Paginas Dashboard | 28 |
| Componentes React | 65+ |
| Servicios de Negocio | 5 |
| Tests existentes | 7 archivos |
| Errores TypeScript | 0 |
| TODOs pendientes | 6 (todos menores) |

### 1.2 Modulos Funcionales Completos

| Modulo | APIs | UI | Integrado |
|--------|------|----|----|
| Vehiculos (CRUD + documentos + odometro) | 14 | 5 pags | SI |
| Personas (conductores, tecnicos, proveedores) | 6 | 3 pags | SI |
| Catalogo Mantenimiento (categorias, items, templates) | 12 | 4 pags | SI |
| Programas de Mantenimiento (asignacion, paquetes) | 8 | 2 pags | SI |
| Alertas de Mantenimiento | 2 | 1 pag | SI |
| Ordenes de Trabajo (OT) | 12 | 3 pags + 6 tabs | SI |
| Ordenes de Compra (OC) | 5 | 2 pags + tab en OT | SI |
| Facturacion | 6 | 4 pags | SI |
| Inventario (stock, movimientos, consumo) | 6 | 2 pags | SI |
| Dashboard (metricas, KPIs) | 4 | 1 pag | SI |
| Financial Watchdog | 2 | alertas integradas | SI |
| Tickets Internos | 2 | integrado en OT | SI |
| Onboarding | server actions | wizard | SI |
| Auth + Multi-tenancy | webhook + middleware | layout | SI |

### 1.3 Cobertura de Testing Actual

```
Tests existentes (7):
  src/lib/__tests__/auth.test.ts              -> Auth/permisos
  src/lib/__tests__/utils.test.ts             -> Utilidades
  src/lib/logic/__tests__/work-order-utils.test.ts -> Logica OT
  src/lib/services/__tests__/MaintenanceAlertService.test.ts -> Alertas
  src/app/api/maintenance/work-orders/__tests__/work-order-api.test.ts -> API OT
  src/app/api/maintenance/work-orders/__tests__/e2e-flow.test.ts -> Flujo completo OT
  src/app/api/maintenance/work-orders/[id]/__tests__/route.test.ts -> PATCH OT

Cobertura estimada: ~5% (7 tests / 82 endpoints + servicios + UI)
```

**Conclusion**: La app esta funcionalmente completa pero con cobertura de tests minima. Esto es un riesgo para produccion.

---

## 2. ESTRATEGIA DE TESTING - 4 NIVELES

### Nivel 1: Unit Tests (Logica de Negocio Pura)
**Herramienta**: Vitest (ya instalado)
**Objetivo**: Probar funciones puras sin base de datos ni red
**Tiempo estimado**: 2-3 dias

Tests a crear:

```
src/lib/logic/__tests__/
  financial-calculations.test.ts    -> Calculos de IVA, subtotales, variaciones
  inventory-calculations.test.ts    -> Weighted average cost, stock validation
  work-order-transitions.test.ts    -> Maquina de estados OT (PENDING->IN_PROGRESS->...)
  purchase-order-transitions.test.ts -> Maquina de estados OC (DRAFT->APPROVED->SENT->...)
  alert-scoring.test.ts             -> Priority score 0-100, threshold logic
  part-suggestion-matching.test.ts  -> Matching por brand/line/year range
  closure-validation.test.ts        -> Reglas de cierre (todos items COMPLETED)
  price-deviation.test.ts           -> Calculos de desviacion de precio (10%, 20%, 50%)
```

Ejemplo de lo que se prueba:
```typescript
// financial-calculations.test.ts
describe('calculateItemTotals', () => {
  it('calcula subtotal, IVA 19% y total correctamente', () => {
    expect(calculateItemTotals(2, 50000, 19)).toEqual({
      subtotal: 100000,
      taxAmount: 19000,
      total: 119000
    });
  });

  it('maneja items sin costo (isFree)', () => {
    expect(calculateItemTotals(1, 0, 19)).toEqual({
      subtotal: 0, taxAmount: 0, total: 0
    });
  });

  it('calcula variacion de precio correctamente', () => {
    expect(calculateVariance(100000, 110000)).toBe(10); // +10%
    expect(calculateVariance(100000, 80000)).toBe(-20); // -20%
  });
});
```

### Nivel 2: Integration Tests (APIs contra DB real)
**Herramienta**: Vitest + Prisma + DB de test
**Objetivo**: Probar cada endpoint API con datos reales en PostgreSQL
**Tiempo estimado**: 5-7 dias
**Infraestructura**: docker-compose.test.yml (ya existe) + seed-test.ts

Tests a crear por modulo:

```
src/app/api/__tests__/
  vehicles/
    vehicles-crud.test.ts           -> CRUD vehiculos, validacion tenant
    brands-lines-types.test.ts      -> Catalogo vehicular
    documents.test.ts               -> Documentos, expiracion
    odometer.test.ts                -> Registro km, validacion secuencial

  maintenance/
    categories-items.test.ts        -> CRUD categorias e items
    templates-packages.test.ts      -> Templates, clonacion, paquetes
    vehicle-programs.test.ts        -> Asignacion programa, generacion items
    vehicle-parts.test.ts           -> KB autopartes, suggest
    alerts.test.ts                  -> Generacion, acknowledge, snooze, cierre
    work-orders-crud.test.ts        -> Crear OT preventiva y correctiva
    work-orders-items.test.ts       -> Agregar items, smart suggest, watchdog
    work-orders-lifecycle.test.ts   -> Ciclo completo PENDING->COMPLETED
    expenses.test.ts                -> Gastos, aprobacion, watchdog
    invoices-maintenance.test.ts    -> Factura vinculada a OT, cierre granular

  purchase-orders/
    po-crud.test.ts                 -> Crear OC desde OT, auto-numeracion
    po-workflow.test.ts             -> DRAFT->APPROVED->SENT, validaciones
    po-items.test.ts                -> Items, recalculo totales

  invoices/
    invoices-crud.test.ts           -> CRUD facturas
    invoices-reconciliation.test.ts -> Conciliacion factura vs OC
    price-deviation.test.ts         -> Watchdog en factura, FinancialAlert

  inventory/
    items-stock.test.ts             -> Stock, min/max, averageCost
    movements.test.ts               -> Movimientos, weighted average
    consume.test.ts                 -> Consumo desde OT, validacion stock

  people/
    drivers-technicians.test.ts     -> CRUD personas
    providers.test.ts               -> CRUD proveedores

  auth/
    multi-tenancy.test.ts           -> Aislamiento entre tenants
    permissions.test.ts             -> Roles y permisos por endpoint
    webhook.test.ts                 -> Clerk webhook sync
```

Ejemplo:
```typescript
// work-orders-lifecycle.test.ts
describe('Work Order Full Lifecycle', () => {
  it('crea OT preventiva desde alertas, agrega items, genera OC, recibe factura, cierra', async () => {
    // 1. Crear alerta
    const alert = await createTestAlert(tenantId, vehicleId);

    // 2. Crear OT desde alerta
    const woRes = await POST(makeReq({ vehicleId, alertIds: [alert.id], mantType: 'PREVENTIVE' }));
    expect(woRes.status).toBe(201);
    const wo = await woRes.json();

    // 3. Agregar item con smart suggest
    const itemRes = await POST_ITEM(wo.id, { mantItemId, quantity: 2, unitPrice: 50000 });
    expect(itemRes.status).toBe(201);

    // 4. Generar OC
    const poRes = await POST_PO({ workOrderId: wo.id, providerId, items: [...] });
    expect(poRes.status).toBe(201);

    // 5. Aprobar y enviar OC
    await PATCH_PO(po.id, { action: 'submit' });
    await PATCH_PO(po.id, { action: 'approve' });

    // 6. Crear factura vinculada a OC
    const invRes = await POST_INVOICE({ purchaseOrderId: po.id, items: [...] });
    expect(invRes.status).toBe(201);

    // 7. Verificar cierre automatico
    const finalWO = await prisma.workOrder.findUnique({ where: { id: wo.id } });
    expect(finalWO.status).toBe('COMPLETED');

    const finalAlert = await prisma.maintenanceAlert.findUnique({ where: { id: alert.id } });
    expect(finalAlert.status).toBe('COMPLETED');
  });
});
```

### Nivel 3: E2E Tests (UI automatizada)
**Herramienta**: Playwright
**Objetivo**: Simular usuario real en el navegador, hacer click, llenar formularios, verificar resultados
**Tiempo estimado**: 5-7 dias
**Prerequisito**: Nivel 2 completo (para tener seed data confiable)

Tests a crear:

```
e2e/
  auth/
    login.spec.ts                   -> Login con Clerk, redirect a dashboard
    onboarding.spec.ts              -> Wizard onboarding nuevo tenant

  vehicles/
    fleet-management.spec.ts        -> Agregar vehiculo, editar, documentos
    odometer.spec.ts                -> Registrar km, ver historial

  maintenance/
    catalog-setup.spec.ts           -> Crear categoria, item, template
    program-assignment.spec.ts      -> Asignar programa a vehiculo
    alert-dashboard.spec.ts         -> Ver alertas, crear OT desde alerta

  work-orders/
    create-preventive.spec.ts       -> Wizard: vehiculo -> alertas -> crear OT
    create-corrective.spec.ts       -> Wizard: vehiculo -> correctiva -> crear OT
    add-parts.spec.ts               -> Agregar repuesto, smart suggest, ver stock
    add-services.spec.ts            -> Agregar servicio, seleccionar proveedor
    generate-po.spec.ts             -> Generar OC desde tab repuestos/servicios
    complete-workflow.spec.ts       -> Flujo completo OT -> OC -> Factura -> Cierre

  purchase-orders/
    po-approval.spec.ts             -> Workflow aprobacion OC
    po-to-invoice.spec.ts           -> Crear factura desde OC

  invoices/
    create-from-po.spec.ts          -> Seleccionar proveedor, vincular OC, pre-cargar items
    price-comparison.spec.ts        -> Verificar tabla comparativa estimado vs real
    upload-attachment.spec.ts       -> Subir PDF factura

  inventory/
    stock-management.spec.ts        -> Ver stock, agregar compra, verificar averageCost
    consume-from-wo.spec.ts         -> Descontar stock desde OT

  dashboard/
    main-dashboard.spec.ts          -> KPIs, graficas, navegacion
    financial-alerts.spec.ts        -> Ver alertas financieras
```

Ejemplo:
```typescript
// create-preventive.spec.ts
test('crear OT preventiva desde wizard', async ({ page }) => {
  await page.goto('/dashboard/maintenance/work-orders');

  // Click "Nueva Orden"
  await page.click('button:has-text("Nueva Orden")');
  expect(page.url()).toContain('/new');

  // Paso 1: Buscar vehiculo
  await page.fill('input[placeholder*="placa"]', 'ABC-123');
  await page.click('text=ABC-123');
  await page.click('button:has-text("Siguiente")');

  // Paso 2: Seleccionar alertas pendientes
  await expect(page.locator('text=Alertas Pendientes')).toBeVisible();
  await page.click('input[type="checkbox"]'); // Primera alerta
  await page.click('button:has-text("Siguiente")');

  // Paso 3: Detalles
  await expect(page.locator('input[name="title"]')).toHaveValue(/Mantenimiento/);
  await page.click('button:has-text("Crear Orden")');

  // Verificar redirect a detalle
  await expect(page).toHaveURL(/work-orders\/\d+/);
  await expect(page.locator('text=PENDING')).toBeVisible();
});
```

### Nivel 4: Load Testing (Prueba de Carga)
**Herramienta**: k6 (Grafana)
**Objetivo**: Bombardear APIs con cientos de requests simultaneos para verificar rendimiento
**Tiempo estimado**: 2-3 dias
**Prerequisito**: Seed masivo con datos realistas

Scripts a crear:

```
load-tests/
  seed-massive.ts                  -> Script para crear 50 vehiculos, 200 OT, 500 items

  scenarios/
    concurrent-users.js            -> 100 usuarios consultando dashboard simultaneamente
    work-order-creation.js         -> 50 OTs creandose en paralelo
    inventory-operations.js        -> 200 movimientos de inventario concurrentes
    search-performance.js          -> Busquedas con datos masivos (autopartes, items, vehiculos)
    mixed-workload.js              -> Mezcla realista de operaciones

  thresholds.json                  -> Criterios de aceptacion:
                                      - p95 response time < 500ms
                                      - error rate < 1%
                                      - throughput > 100 req/s
```

Ejemplo k6:
```javascript
// concurrent-users.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up a 20 usuarios
    { duration: '1m', target: 50 },    // Subir a 50
    { duration: '2m', target: 100 },   // Pico: 100 usuarios simultaneos
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% de requests en menos de 500ms
    http_req_failed: ['rate<0.01'],     // Menos de 1% de errores
  },
};

export default function () {
  // Simular usuario navegando
  const dashboard = http.get(`${BASE_URL}/api/dashboard/fleet-status`);
  check(dashboard, { 'dashboard ok': (r) => r.status === 200 });

  const workOrders = http.get(`${BASE_URL}/api/maintenance/work-orders?limit=20`);
  check(workOrders, { 'work orders ok': (r) => r.status === 200 });

  const alerts = http.get(`${BASE_URL}/api/maintenance/alerts`);
  check(alerts, { 'alerts ok': (r) => r.status === 200 });

  sleep(1); // Pausa entre acciones (simula usuario real)
}
```

---

## 3. SEED MASIVO (Datos de Prueba Realistas)

Script que genera un dataset completo para probar con volumen:

```
seed-massive.ts:
  1 Tenant "Fleet Care Demo"
  5 Usuarios (OWNER, MANAGER, PURCHASER, 2x TECHNICIAN)
  10 Proveedores
  5 Tecnicos
  20 Conductores
  8 Marcas de vehiculo con 25 lineas
  3 Tipos de vehiculo
  50 Vehiculos activos con documentos
  15 Categorias de mantenimiento
  80 Items de mantenimiento (30 PART, 30 SERVICE, 20 ACTION)
  200 MasterParts con precios referencia
  300 MantItemVehiclePart (knowledge base)
  100 InventoryItems con stock
  5 Templates de mantenimiento
  50 Programas asignados a vehiculos
  500 MaintenanceAlerts (mixto: pending, in_progress, completed)
  200 WorkOrders (variados estados)
  800 WorkOrderItems
  100 PurchaseOrders (variados estados)
  300 PurchaseOrderItems
  80 Invoices
  250 InvoiceItems
  500 InventoryMovements
  50 InternalWorkTickets
  200 OdometerLogs
```

**Proposito**: Con este volumen podemos verificar:
- Queries no se degradan con datos reales
- Paginacion funciona correctamente
- Filtros son eficientes
- Dashboard KPIs calculan bien con volumen
- Busquedas de autopartes responden rapido

---

## 4. CIRCUITOS CRITICOS A PROBAR

Estos son los flujos de negocio que DEBEN funcionar perfectamente antes de lanzar:

### Circuito 1: Ciclo Preventivo Completo
```
Registrar km en odometro
  -> Alerta generada automaticamente
  -> Crear OT desde alerta (wizard)
  -> Agregar items con smart suggest
  -> Generar OC al proveedor
  -> Aprobar OC
  -> Enviar OC por email
  -> Crear factura vinculada a OC
  -> Comparar precios estimado vs real
  -> Cerrar OT
  -> Verificar: alerta cerrada, programa actualizado, precio historico
```

### Circuito 2: Ciclo Correctivo con Taller Propio
```
Detectar novedad
  -> Crear OT correctiva (wizard)
  -> Agregar repuestos desde stock
  -> Verificar disponibilidad
  -> Descontar inventario
  -> Crear ticket interno
  -> Registrar labor del tecnico
  -> Cerrar OT
  -> Verificar: stock actualizado, movimientos registrados
```

### Circuito 3: Ciclo Correctivo con Proveedor Externo
```
Crear OT correctiva
  -> Agregar servicios externos
  -> Generar OC al proveedor
  -> Workflow aprobacion (submit -> approve -> send)
  -> Crear factura desde OC (pre-llenado)
  -> Financial watchdog verifica desviacion
  -> Cerrar OT
  -> Verificar: alertas financieras si aplica, precios actualizados
```

### Circuito 4: Multi-tenancy y Seguridad
```
Tenant A crea vehiculo, OT, factura
  -> Tenant B NO puede ver datos de Tenant A
  -> Roles: TECHNICIAN no puede aprobar OC
  -> Roles: DRIVER solo ve odometro
  -> SUPER_ADMIN ve panel admin sin datos de tenant
```

### Circuito 5: Facturacion Directa (sin OT)
```
Crear factura independiente
  -> Seleccionar proveedor
  -> Agregar items manuales
  -> Vincular a OC existente (opcional)
  -> Calcular IVA
  -> Subir PDF adjunto
  -> Guardar
```

### Circuito 6: Gestion de Inventario
```
Registrar compra (ingreso stock)
  -> Verificar weighted average cost actualizado
  -> Consumir desde OT
  -> Verificar stock decrementado
  -> Ver historial de movimientos
  -> Alertas de stock minimo
```

### Circuito 7: Setup Inicial (Onboarding)
```
Nuevo usuario se registra
  -> Clerk crea organizacion
  -> Webhook sincroniza a Prisma
  -> Onboarding wizard: nombre empresa, datos basicos
  -> Seed inicial de catalogos
  -> Redirect a dashboard vacio
  -> Primer vehiculo
  -> Primer template de mantenimiento
```

---

## 5. ESTIMACION DE TIEMPO PARA LANZAMIENTO

### 5.1 Lo que YA esta listo (no necesita trabajo)

- Arquitectura multi-tenant con Clerk
- 82 endpoints API funcionales
- 28 paginas de dashboard
- Schema Prisma con 47 modelos
- Middleware de seguridad
- Financial Watchdog
- Sistema de alertas de mantenimiento
- Smart suggestion de autopartes
- Envio de OC por email con PDF
- 0 errores TypeScript
- Onboarding wizard

### 5.2 Trabajo pendiente antes de lanzar

| Tarea | Estimacion | Prioridad | Depende de |
|-------|-----------|-----------|------------|
| **FASE 1: Testing** | | | |
| Unit tests (logica de negocio) | 2-3 dias | CRITICA | - |
| Integration tests (APIs) | 5-7 dias | CRITICA | Unit tests |
| Seed masivo | 1-2 dias | ALTA | - |
| E2E tests con Playwright | 5-7 dias | ALTA | Integration tests |
| Load testing con k6 | 2-3 dias | MEDIA | Seed masivo |
| **FASE 2: Bugs y polish** | | | |
| Fix 6 TODOs menores | 1 dia | MEDIA | - |
| Fix pre-commit hook (ESLint OOM) | 0.5 dias | BAJA | - |
| Verificar API internal-tickets | 0.5 dias | ALTA | - |
| Review UI responsive / mobile | 1-2 dias | MEDIA | - |
| **FASE 3: Produccion** | | | |
| Configurar entorno staging (Vercel) | 1 dia | CRITICA | - |
| Configurar Resend (email real) | 0.5 dias | ALTA | Staging |
| Configurar UploadThing produccion | 0.5 dias | ALTA | Staging |
| DNS + dominio custom | 0.5 dias | CRITICA | Staging |
| Monitoreo (Sentry o similar) | 1 dia | ALTA | Staging |
| Seed datos reales primer cliente | 1 dia | CRITICA | Todo lo anterior |
| Smoke test en produccion | 1 dia | CRITICA | Deploy |

### 5.3 Timeline Propuesto

```
SEMANA 1-2: Testing automatizado
  Dia 1-3:   Unit tests + seed masivo (en paralelo)
  Dia 4-8:   Integration tests (APIs criticas)
  Dia 9-10:  Setup Playwright + primeros E2E tests

SEMANA 3: E2E + Load + Polish
  Dia 11-14: E2E tests circuitos criticos
  Dia 15-16: Load testing con k6
  Dia 17:    Fix bugs encontrados en testing

SEMANA 4: Staging + Produccion
  Dia 18-19: Deploy staging, configurar servicios externos
  Dia 20:    Smoke test completo en staging
  Dia 21:    DNS + dominio + monitoreo
  Dia 22:    Seed datos primer cliente
  Dia 23:    LANZAMIENTO

Total estimado: 4-5 semanas
```

### 5.4 Ruta Critica (Minimo Absoluto para Lanzar)

Si hay presion de tiempo, este es el minimo necesario:

```
MINIMO VIABLE (2-3 semanas):
  - Integration tests para los 7 circuitos criticos (5 dias)
  - E2E tests para circuitos 1, 2, 3 (3 dias)
  - Deploy staging + smoke test (2 dias)
  - Produccion + seed (2 dias)

Total minimo: 12-15 dias laborables
```

---

## 6. HERRAMIENTAS Y CONFIGURACION NECESARIA

### 6.1 Ya instalado (no requiere setup)
- Vitest + Testing Library (unit + integration)
- Docker Compose para DB de test
- Seed script base
- Husky + lint-staged

### 6.2 Por instalar

```bash
# E2E Testing
pnpm add -D @playwright/test
npx playwright install  # Descarga navegadores

# Load Testing (instalacion global)
# k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
brew install k6  # macOS
# o snap install k6  # Linux

# Monitoreo (cuando deployemos)
pnpm add @sentry/nextjs  # Error tracking
```

### 6.3 Archivos de configuracion a crear

```
playwright.config.ts      -> Configuracion E2E
e2e/                      -> Carpeta tests E2E
load-tests/               -> Scripts k6
prisma/seed-massive.ts    -> Seed datos masivos
.env.test                 -> Variables de entorno para testing (ya existe)
.env.staging              -> Variables para staging
```

---

## 7. CRITERIOS DE ACEPTACION PARA LANZAMIENTO

### 7.1 Quality Gates

| Gate | Criterio | Bloqueante |
|------|----------|------------|
| TypeScript | 0 errores | SI |
| Unit Tests | 100% passing | SI |
| Integration Tests | 100% passing, circuitos 1-7 cubiertos | SI |
| E2E Tests | Circuitos 1, 2, 3 passing | SI |
| E2E Tests | Circuitos 4-7 passing | NO (nice to have) |
| Load Test | p95 < 500ms con 50 usuarios | NO (nice to have) |
| ESLint | < 70 warnings (ya cumple: 42) | SI |
| Staging | Smoke test completo sin errores | SI |
| Seguridad | Multi-tenant isolation verificado | SI |

### 7.2 Definition of Done para Lanzamiento

- [ ] 0 errores TypeScript
- [ ] 7 circuitos criticos probados con integration tests
- [ ] Al menos 3 circuitos con E2E (Playwright)
- [ ] Deploy exitoso en staging
- [ ] Smoke test manual en staging (1 recorrido completo)
- [ ] Email OC funciona en staging (Resend configurado)
- [ ] Upload de archivos funciona en staging (UploadThing)
- [ ] Clerk webhooks funcionan en staging
- [ ] Sentry/monitoreo configurado
- [ ] Primer tenant con datos reales cargados
- [ ] DNS/dominio apuntando a produccion
- [ ] Backup de base de datos automatizado (Neon lo hace)

---

## 8. POST-LANZAMIENTO (Mejoras Futuras)

Una vez en produccion, estas son funcionalidades para agregar iterativamente:

### Corto Plazo (1-2 meses)
- OCR para facturas (Google Vision / Document AI)
- Notificaciones push/email automaticas
- Dashboard financiero con datos reales
- Recepcion parcial de OC
- Reportes exportables (PDF/Excel)

### Mediano Plazo (3-6 meses)
- App mobile para conductores (registro km)
- Multi-currency con conversion
- Aprobaciones multi-nivel automatizadas
- Codigos de labor estandar
- Integracion contable (SIIGO, Alegra)

### Largo Plazo (6-12 meses)
- Prediccion de mantenimiento con ML
- Marketplace de proveedores
- API publica para integraciones
- White-label para distribuidores
- Modulo de combustible y GPS

---

## 9. RESUMEN EJECUTIVO

### Donde estamos
Fleet Care es una aplicacion **funcionalmente completa** con 82 APIs, 28 paginas, 47 modelos de datos, y una arquitectura multi-tenant robusta. El modulo central (OT-OC-Factura) tiene el ciclo completo implementado incluyendo smart suggestion, watchdog financiero, y envio de OC por email.

### Que nos falta
Testing automatizado que reemplace la prueba manual y nos de **certeza** de que todo funciona. Hoy tenemos 7 tests para 82 endpoints - necesitamos al menos 50+ tests cubriendo los 7 circuitos criticos.

### Cuanto tiempo
- **Ruta rapida**: 2-3 semanas (tests criticos + deploy)
- **Ruta completa**: 4-5 semanas (testing exhaustivo + load testing + polish)

### Recomendacion
Ir por la **ruta completa de 4-5 semanas**. Ya invertimos meses construyendo algo robusto - invertir 1 mes mas en testing nos asegura un lanzamiento solido y nos evita incendios en produccion. Es mejor lanzar 1 mes despues con certeza que lanzar manana apagando bugs.

---

*Este documento se actualiza conforme avanza la implementacion del testing.*
