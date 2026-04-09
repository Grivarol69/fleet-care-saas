# Exploration: siigo-integration

**Fecha:** 2026-03-02
**Status:** complete

---

## Current State

Fleet Care tiene toda la data financiera necesaria (Invoice, InvoiceItem, Provider, MasterPart, WorkOrder) pero le faltan **17 campos fiscales críticos** para poder sincronizar con Siigo. No existe capa de integración con APIs externas en el proyecto.

La infra disponible:
- `Tenant.settings: Json?` — puede almacenar credenciales Siigo por tenant sin migración adicional
- `MasterPart.code: String @unique` — mapea directamente al código de producto en Siigo
- `Invoice` con ciclo de vida limpio (PENDING → APPROVED → PAID) — trigger natural para sync
- `src/lib/services/` — directorio de servicios, sin integración externa actualmente

---

## Siigo API — Características Técnicas

### Autenticación
- **OAuth2 Client Credentials**: `POST https://api.siigo.com/auth` con `username` + `access_key`
- Devuelve Bearer JWT válido **24 horas** — debe cachearse por tenant y refrescarse proactivamente
- **Sin webhooks outbound** — integración push unidireccional (Fleet Care → Siigo)

### Endpoints clave
| Endpoint | Descripción |
|---|---|
| `POST /v1/customers` | Crear/actualizar Tercero (proveedor o cliente) |
| `POST /v1/products` | Crear/actualizar Producto (repuesto/servicio) |
| `POST /v1/purchase-invoices` | Crear Factura de Compra (gastos de Fleet Care) |
| `GET /v1/cost-centers` | Centros de costo (bootstrap de config) |
| `GET /v1/payment-types` | Tipos de pago (bootstrap) |
| `GET /v1/document-types` | Tipos de documento (bootstrap) |

### Rate limits
- **300 requests/minuto por tenant**
- Cada sincronización de factura cuesta ~3 llamadas (proveedor + productos + factura)
- Throttling requerido en sincronización masiva inicial

### Países soportados
- Colombia (principal, DIAN FE certificado), Ecuador (SRI), Uruguay (DGI)
- `Tenant.country = "CO"` alinea correctamente

### Sandbox
- Disponible con credenciales de prueba vía programa de partners de Siigo

---

## Affected Areas

### Modelos con campos faltantes (17 campos críticos)

**Provider** (8 campos):
- `nit` — identificación fiscal
- `idType` — "31"=NIT, "13"=CC
- `personType` — "Person" / "Company"
- `stateCode` — código DANE departamento
- `cityCode` — código DANE ciudad
- `fiscalResponsibilities[]` — responsabilidades fiscales DIAN
- `vatResponsible` — boolean régimen IVA
- `siigoId` — ID asignado por Siigo al crear el tercero

**Invoice** (5 campos):
- `siigoId` — ID de la factura en Siigo
- `siigoSyncStatus` — PENDING / SYNCED / FAILED
- `siigoSyncedAt` — timestamp del último sync exitoso
- `siigoError` — mensaje de error del último intento
- `paymentMeanSiigo` — ID del medio de pago en Siigo

**MasterPart** (4 campos):
- `siigoId` — ID del producto en Siigo
- `accountGroup` — integer, grupo contable en plan de cuentas Siigo
- `taxClassification` — "Taxed" / "Exempt" / "Excluded"
- `siigoUnit` — código numérico de unidad de medida Siigo

### Archivos del proyecto afectados
- `prisma/schema.prisma` — 3 modelos a extender
- `src/app/api/invoices/[id]/route.ts` — trigger de sync en transición APPROVED
- `src/app/api/people/providers/route.ts` — sync al crear/actualizar proveedor
- `src/app/api/inventory/parts/route.ts` — sync al crear/actualizar MasterPart
- `src/lib/services/` — nuevo SiigoApiClient + SiigoSyncService
- `src/app/api/integrations/siigo/` — nuevos endpoints: config, webhook-status, manual-sync

---

## Mapeo de Datos Fleet Care → Siigo

| Fleet Care | Siigo | Dirección | Trigger |
|---|---|---|---|
| `Provider` | `Customer` (type=Supplier) | FC → Siigo | Crear/actualizar Provider |
| `MasterPart` | `Product` | FC → Siigo | Crear/actualizar MasterPart |
| `Invoice` (APPROVED) | `PurchaseInvoice` | FC → Siigo | Invoice.status → APPROVED |
| `InvoiceItem` | `PurchaseInvoice.items[]` | FC → Siigo | Junto con Invoice |
| `InvoicePayment` | Payment on PurchaseInvoice | FC → Siigo | Invoice.status → PAID |
| `Tenant.settings.siigo` | Config ref data | Siigo → FC | Bootstrap inicial por tenant |

---

## Approaches

### Approach 1 — Next.js `after()` (Recomendado MVP)
Usar el API `after()` de Next.js 15 para disparar el sync de Siigo después de retornar la respuesta HTTP. Zero infraestructura adicional.

- **Pros:** Sin Redis/BullMQ, nativo de Next.js 15, simple de implementar, transparente al usuario
- **Cons:** Sin persistencia de cola — si el proceso muere, el sync se pierde. Requiere manejo robusto de retry
- **Esfuerzo:** Bajo-Medio

### Approach 2 — Queue con BullMQ + Redis
Cola de trabajos para sync asíncrono con persistencia garantizada.

- **Pros:** Retries persistentes, rate limiting nativo, visibilidad de jobs
- **Cons:** Infraestructura adicional (Redis en prod), complejidad de deploy
- **Esfuerzo:** Alto

### Approach 3 — Cron / Batch sync
Job periódico que sincroniza todas las facturas pendientes.

- **Pros:** Simple, tolerante a fallos de red transitorios
- **Cons:** Latencia alta (minutos entre sync), no cumple expectativa de "sync al aprobar"
- **Esfuerzo:** Bajo

---

## Recommendation

**Approach 1 (Next.js `after()`)** para MVP con las siguientes garantías:
- Token cache per-tenant en memoria con refresh automático
- `SiigoApiClient` con 3 reintentos + backoff exponencial
- Error escrito en `Invoice.siigoError` para visibilidad en UI
- Flag `siigoSyncStatus: PENDING | SYNCING | SYNCED | FAILED` en Invoice
- Batch sync inicial throttleado (no `Promise.all`) para migración de datos históricos

Escalar a Approach 2 si el volumen de facturas supera 1000/día por tenant.

---

## Risks

1. **Colisión con schema-id-normalization** (CRÍTICO) — Esa migración toca 24 modelos / 62 archivos. Iniciar cambios de schema de Siigo antes de que merge crea un conflicto de rebase grave. **Confirmar merge antes de iniciar.**
2. **Confusión DIAN FE** (ALTO) — Fleet Care registra facturas de COMPRA (gastos), no de VENTA. Solo usar endpoint `purchase-invoices`. No se genera CUFE ni FE en el lado de Fleet Care.
3. **Migración de datos de Provider** (MEDIO) — Providers existentes no tienen NIT/datos fiscales. Campos nullable (safe), pero UX debe guiar al usuario a completarlos antes de activar sync. Requiere flujo de "completar perfil fiscal".
4. **Seguridad de credenciales Siigo** (MEDIO) — `Tenant.settings` es JSON plano en Postgres. El `access_key` debe cifrarse a nivel de aplicación antes de almacenar.
5. **Rate limit en sync masivo inicial** (MEDIO) — 300 req/min se alcanza fácilmente en bulk sync de Providers + MasterParts existentes. Job de migración inicial necesita throttling (ej: 1 req/200ms).

---

## Ready for Proposal

**Sí** — con la condición de confirmar primero el estado de `schema-id-normalization`. Si está mergeado, se puede proceder directamente a proposal + spec + design.
