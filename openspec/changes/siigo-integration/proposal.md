# Proposal: Siigo Integration

**Fecha:** 2026-03-02
**Status:** draft
**Change:** siigo-integration
**Blockers:** schema-id-normalization — MERGED ✅ (commit 95fc719)

---

## Intent

Integración push unidireccional Fleet Care → Siigo para sincronizar automáticamente:

- **Terceros** (Provider records → Siigo Customers)
- **Productos** (MasterPart records → Siigo Products)
- **Facturas de Compra** (Invoice APPROVED → Siigo PurchaseInvoice)
- **Pagos** (Invoice PAID → Siigo PurchaseInvoice payment)

Los 3 primeros clientes del SaaS usan Siigo como sistema contable. El Cliente 2 requiere que **todos** los movimientos financieros queden registrados en Siigo — condición no negociable para su adopción.

Esta integración es un requisito de lanzamiento (launch-day), no un feature opcional.

---

## Problem Statement

Fleet Care tiene toda la data financiera necesaria pero carece de:

1. **17 campos fiscales** en los modelos Provider, Invoice y MasterPart que Siigo requiere para crear sus entidades
2. **Capa de integración con APIs externas** — no existe ningún cliente HTTP hacia sistemas de terceros en el proyecto
3. **Configuración por tenant** para credenciales Siigo (username + access_key)
4. **Visibilidad de estado de sync** en la UI — el usuario no puede saber si una factura está sincronizada

La arquitectura existente facilita la integración:
- `Tenant.settings: Json?` puede almacenar credenciales Siigo sin nueva migración
- `MasterPart.code: String @unique` mapea directamente al código de producto en Siigo
- `Invoice` tiene ciclo de vida limpio (PENDING → APPROVED → PAID) — trigger natural
- `src/lib/services/` existe como directorio de servicios, actualmente vacío de integraciones externas
- `schema-id-normalization` ya mergeado — todos los IDs son UUID/String, sin fricción de tipo

---

## Proposed Solution

### Arquitectura: Next.js `after()` para sync asíncrono

Usar el API nativo `after()` de Next.js 15 para disparar el sync de Siigo **después** de retornar la respuesta HTTP al cliente. Zero infraestructura adicional, transparente al usuario final.

```
Fleet Care API Route
  │
  ├─ Ejecuta operación principal (update Invoice status, create Provider, etc.)
  ├─ Retorna 200/201 al cliente  ← usuario no espera el sync
  └─ after() → SiigoSyncService → SiigoApiClient → Siigo API
                    │
                    └─ Actualiza Invoice.siigoSyncStatus en background
```

**SiigoApiClient** — Servicio HTTP con:
- OAuth2 Client Credentials (token válido 24h, cacheado por tenant en memoria)
- Refresh automático proactivo antes del vencimiento
- 3 reintentos con backoff exponencial (1s, 2s, 4s)
- Timeout de 10s por request

**SiigoSyncService** — Orquestador que conoce la lógica de negocio:
- `syncProvider(provider)` → POST /v1/customers
- `syncProduct(part)` → POST /v1/products
- `syncPurchaseInvoice(invoice)` → POST /v1/purchase-invoices (con items + proveedor)
- `syncPayment(invoice, payment)` → PATCH /v1/purchase-invoices/{id}/payments
- Error escrito en `Invoice.siigoError` para visibilidad en UI
- No bloquea el flujo principal — fallos son silenciosos para el usuario pero visibles en logs

### Datos Fiscales Requeridos

Los 17 campos nuevos son **todos nullable** → migración segura, compatible con providers existentes.

**Provider** (8 campos nuevos):
```
nit                  String?   — identificación fiscal (NIT o cédula)
taxIdType            String?   — "31"=NIT empresa, "13"=CC persona natural
personType           String?   — "Person" | "Company"
stateCode            String?   — código DANE departamento (ej: "11" = Cundinamarca)
cityCode             String?   — código DANE ciudad (ej: "11001" = Bogotá)
fiscalResponsibilities String[] — responsabilidades fiscales DIAN (ej: ["R-99-PN"])
vatResponsible       Boolean?  — true = responsable de IVA
siigoId              String?   — ID asignado por Siigo al crear el tercero (para updates)
```

**Invoice** (5 campos nuevos):
```
siigoId              String?   — ID de la factura en Siigo
siigoSyncStatus      SiigoSyncStatus? — PENDING | SYNCING | SYNCED | FAILED
siigoSyncedAt        DateTime? — timestamp del último sync exitoso
siigoError           String?   — mensaje de error del último intento fallido
paymentMeanSiigo     Int?      — ID del medio de pago en Siigo (de GET /v1/payment-types)
```

**MasterPart** (4 campos nuevos):
```
siigoId              String?   — ID del producto en Siigo
accountGroup         Int?      — grupo contable en plan de cuentas Siigo
taxClassification    String?   — "Taxed" | "Exempt" | "Excluded"
siigoUnit            Int?      — código numérico de unidad de medida Siigo
```

**Nuevo enum:**
```prisma
enum SiigoSyncStatus {
  PENDING
  SYNCING
  SYNCED
  FAILED
}
```

### Configuración Siigo por Tenant

Almacenada en `Tenant.settings.siigo` (JSON existente, sin nueva columna):

```json
{
  "siigo": {
    "username": "api@empresa.com",
    "accessKey": "<encrypted>",
    "defaultCostCenterId": 123,
    "defaultPaymentTypeId": 4567,
    "defaultDocumentTypeId": "FCC",
    "enabled": true
  }
}
```

El `accessKey` se cifra con AES-256-GCM usando `SIIGO_ENCRYPTION_KEY` de las variables de entorno antes de persistir. Se descifra en memoria al inicializar `SiigoApiClient`.

---

## Scope

### In Scope — Phase 1 (Foundation)

- `prisma/schema.prisma` — Extender Provider (8), Invoice (5), MasterPart (4) con nuevos campos fiscales
- Nuevo enum `SiigoSyncStatus`
- Migración Prisma (additive, nullable fields — sin reset)
- `src/lib/services/siigo/siigo-api-client.ts` — HTTP client con OAuth2, token cache, retry
- `src/lib/services/siigo/siigo-types.ts` — Tipos TypeScript del API de Siigo
- Variables de entorno: `SIIGO_ENCRYPTION_KEY`

### In Scope — Phase 2 (Sync Engine)

- `src/lib/services/siigo/siigo-sync-service.ts` — Orquestador de sync
- `src/lib/services/siigo/siigo-crypto.ts` — Cifrado/descifrado de accessKey
- Integración `after()` en:
  - `src/app/api/invoices/[id]/route.ts` — sync en transición APPROVED y PAID
  - `src/app/api/people/providers/route.ts` — sync en create/update
  - `src/app/api/people/providers/[id]/route.ts` — sync en update
  - `src/app/api/inventory/parts/route.ts` — sync en create/update
  - `src/app/api/inventory/parts/[id]/route.ts` — sync en update
- `src/app/api/integrations/siigo/config/route.ts` — CRUD de configuración Siigo por tenant
- `src/app/api/integrations/siigo/sync/route.ts` — Trigger de batch sync manual
- `src/app/api/integrations/siigo/status/route.ts` — Estado de sync (cuántos pendientes, fallidos)
- `src/app/api/integrations/siigo/bootstrap/route.ts` — GET cost-centers/payment-types/document-types para configuración inicial

### In Scope — Phase 3 (UI + Batch Migration)

- `src/app/dashboard/empresa/integraciones/siigo/` — Panel de configuración Siigo
  - Formulario de credenciales (username + accessKey)
  - Selects de centro de costo, tipo de pago, tipo de documento (cargados desde Siigo)
  - Toggle de activación/desactivación
  - Indicadores de sync: últimas N facturas, estado, errores
- Provider form — campos fiscales DIAN (NIT, tipo, ciudad/departamento)
- Invoice detail — badge `siigoSyncStatus` con tooltip de último error si FAILED
- `src/app/api/integrations/siigo/batch-sync/route.ts` — Endpoint de migración histórica throttleada
- Componente `SiigoSyncStatusBadge` reutilizable
- Sidebar: link a Integraciones bajo módulo Empresa

### Out of Scope

- Siigo → Fleet Care (lectura/pull) — la API de Siigo no tiene webhooks outbound
- Facturas de venta / DIAN FE / CUFE — Fleet Care registra solo facturas de COMPRA
- Otros software contables (World Office, Contabol, SAP)
- Notificaciones en tiempo real de fallos de sync (se muestra en UI al refrescar)
- Reconciliación automática de discrepancias
- Multi-country fiscal data (Ecuador SRI, Uruguay DGI) — se diseña para CO, extensible

---

## Mapeo de Datos

| Fleet Care | Siigo API | Trigger |
|---|---|---|
| `Provider` | `POST /v1/customers` (type=Supplier) | create/update Provider |
| `MasterPart` | `POST /v1/products` | create/update MasterPart |
| `Invoice` (APPROVED) | `POST /v1/purchase-invoices` | Invoice.status → APPROVED |
| `InvoiceItem[]` | `purchase_invoices.items[]` | junto con Invoice |
| `InvoicePayment` | `PATCH /v1/purchase-invoices/{id}/payments` | Invoice.status → PAID |

---

## Phased Implementation

### Phase 1 — Schema + API Client (Foundation)
**Objetivo:** Dejar el schema listo y el cliente HTTP validado contra sandbox de Siigo.

Entregables:
1. Migración Prisma con 17 campos nuevos + enum `SiigoSyncStatus`
2. `SiigoApiClient` con auth OAuth2, token cache, retry 3x backoff
3. `SiigoSyncService` con los 4 métodos de sync (sin wiring aún)
4. Test unitario de `SiigoApiClient` con Siigo sandbox
5. Variables de entorno documentadas

Duración estimada: 2-3 días de implementación

### Phase 2 — Sync Engine + Triggers (Core)
**Objetivo:** Activar sync automático en las transiciones de Invoice, Provider y MasterPart.

Entregables:
1. Integración `after()` en los 5 endpoints trigger
2. Endpoints de integración (config, sync, status, bootstrap)
3. `siigo-crypto.ts` para cifrado de accessKey
4. Tests de integración contra Siigo sandbox
5. sdd-review de Phase 2

Duración estimada: 3-4 días de implementación

### Phase 3 — UI + Batch Migration (Completion)
**Objetivo:** Visibilidad completa en la UI y migración de datos históricos.

Entregables:
1. Panel de configuración Siigo en `/dashboard/empresa/integraciones/siigo/`
2. Campos fiscales en Provider form
3. `SiigoSyncStatusBadge` en Invoice detail
4. Endpoint de batch sync throttleado (1 req/200ms, respeta 300 req/min)
5. sdd-review de Phase 3

Duración estimada: 2-3 días de implementación

---

## Risks

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|--------------|---------|------------|
| 1 | **schema-id-normalization colisión** | ELIMINADO | — | ✅ Mergeado en commit 95fc719 |
| 2 | **Confusión DIAN FE** (usar endpoint equivocado) | BAJO | ALTO | Solo usar `POST /v1/purchase-invoices`. Documentar explícitamente en spec que Fleet Care nunca genera CUFE ni FE. |
| 3 | **Migración datos Provider existentes** | MEDIO | MEDIO | Campos nullable (safe). UX guía al usuario a completar NIT/datos fiscales antes de activar sync. Sin datos fiscales, el Provider se omite del sync (no falla). |
| 4 | **Seguridad de accessKey en Tenant.settings** | MEDIO | ALTO | Cifrado AES-256-GCM con `SIIGO_ENCRYPTION_KEY` antes de persistir. Nunca loguear ni exponer el key en API responses. |
| 5 | **Rate limit 300 req/min en bulk sync** | MEDIO | MEDIO | Batch sync throttleado: 1 req/200ms (= 300/min exacto). Batchear en grupos de 50 con pausa entre grupos. |
| 6 | **`after()` sin persistencia** — si el proceso muere, sync se pierde | BAJO | MEDIO | `siigoSyncStatus = PENDING` persiste antes de llamar `after()`. El batch sync endpoint puede recuperar todos los PENDING manualmente. Para v1 es aceptable. |
| 7 | **Sandbox Siigo requiere credenciales de partners** | MEDIO | BAJO | Obtener credenciales sandbox desde el inicio. Diseñar tests para poder mockear el API si el sandbox no está disponible. |

---

## Rollback Plan

Todos los campos nuevos en schema son **nullable y additive** — sin `prisma migrate reset`, solo `prisma migrate dev`.

Rollback por fase:
- **Phase 1:** `git revert` + `prisma migrate deploy` (revierte campos fiscales). Sin impacto en operaciones actuales.
- **Phase 2:** Desactivar `after()` calls (1 línea por endpoint). El core de Fleet Care no depende del sync.
- **Phase 3:** Rollback de UI solamente. No afecta datos ni API.

El `SiigoSyncService` falla silenciosamente desde la perspectiva del usuario — los errores van a `Invoice.siigoError` y logs, nunca al response HTTP del usuario. El core de Fleet Care es inmune a fallos de Siigo.

---

## Dependencies

- **schema-id-normalization** — MERGEADO ✅ (commit 95fc719, branch develop)
- **schema-tenant-isolation** — Debe estar aplicado antes de Phase 2 (todos los modelos afectados deben tener `tenantId`)
- **Variable de entorno** `SIIGO_ENCRYPTION_KEY` — debe generarse y configurarse en Vercel/Neon antes de Phase 1
- **Credenciales Siigo sandbox** — necesarias para tests de integración en Phase 1

---

## Success Criteria

- [ ] Providers con NIT completo se sincronizan a Siigo como Terceros (tipo Supplier)
- [ ] MasterParts con datos contables se sincronizan como Productos
- [ ] Invoice que transiciona a APPROVED dispara creación de PurchaseInvoice en Siigo dentro de ~1 segundo
- [ ] Invoice que transiciona a PAID sincroniza el pago en Siigo
- [ ] `siigoSyncStatus` visible en Invoice detail (badge SYNCED/FAILED/PENDING)
- [ ] Tenant puede configurar credenciales Siigo desde el panel de empresa
- [ ] Tenant puede bootstrapear centros de costo, tipos de pago y tipos de documento desde Siigo
- [ ] Batch sync migra datos históricos sin exceder 300 req/min
- [ ] Providers sin NIT no rompen el sync — se omiten con log informativo
- [ ] Fallo en sync Siigo no afecta la operación principal de Fleet Care (respuesta HTTP al usuario)
- [ ] `accessKey` de Siigo nunca aparece en plaintext en base de datos ni en API responses
- [ ] Tests unitarios de `SiigoApiClient` pasan con mocks (y contra sandbox cuando esté disponible)

---

## New Files Summary

```
prisma/schema.prisma                                  MODIFIED — 17 campos + 1 enum
prisma/migrations/YYYYMMDD_add_siigo_fields/          NEW — migración additive
src/lib/services/siigo/siigo-api-client.ts            NEW — HTTP client OAuth2
src/lib/services/siigo/siigo-sync-service.ts          NEW — orquestador sync
src/lib/services/siigo/siigo-types.ts                 NEW — tipos Siigo API
src/lib/services/siigo/siigo-crypto.ts                NEW — cifrado accessKey
src/app/api/integrations/siigo/config/route.ts        NEW — CRUD configuración
src/app/api/integrations/siigo/sync/route.ts          NEW — trigger sync manual
src/app/api/integrations/siigo/status/route.ts        NEW — estado de sync
src/app/api/integrations/siigo/bootstrap/route.ts     NEW — bootstrap ref data
src/app/api/integrations/siigo/batch-sync/route.ts    NEW — migración histórica
src/app/api/invoices/[id]/route.ts                    MODIFIED — after() sync triggers
src/app/api/people/providers/route.ts                 MODIFIED — after() sync trigger
src/app/api/people/providers/[id]/route.ts            MODIFIED — after() sync trigger
src/app/api/inventory/parts/route.ts                  MODIFIED — after() sync trigger
src/app/api/inventory/parts/[id]/route.ts             MODIFIED — after() sync trigger
src/app/dashboard/empresa/integraciones/siigo/        NEW — panel configuración UI
src/components/siigo/SiigoSyncStatusBadge/            NEW — badge reutilizable
```

---

## Decision Required

**¿Apruebas esta propuesta?**

1. **Aprobar completo** — Procedemos con spec + design en paralelo, luego tasks
2. **Aprobar Phase 1 solamente** — Iniciar con schema + API client, revisar antes de Phase 2
3. **Modificar alcance** — Indicar qué agregar o quitar del scope
4. **Bloquear** — Indicar el motivo

**Recomendación:** Aprobar Phase 1 primero para validar la integración con Siigo sandbox antes de comprometer tiempo en UI y batch sync.
