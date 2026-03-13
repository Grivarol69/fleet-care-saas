# Technical Specification: Siigo Integration

**Fecha:** 2026-03-02
**Status:** draft
**Change:** siigo-integration
**Depends on:** schema-id-normalization (MERGED ✅ commit 95fc719)
**Phases:** Phase 1 (Foundation) · Phase 2 (Sync Engine) · Phase 3 (UI + Batch Migration)

---

## 1. Schema Changes (Prisma)

### 1.1 New Enums

Add to `prisma/schema.prisma`:

```prisma
enum SiigoSyncStatus {
  PENDING  // Queued for sync, not yet attempted
  SYNCING  // In-flight (set just before after() fires)
  SYNCED   // Successfully pushed to Siigo
  FAILED   // All retries exhausted, error in siigoError
  SKIPPED  // Lacks required fiscal data (e.g. no NIT)
}

enum SiigoTaxClassification {
  TAXED    // Gravado — IVA applies
  EXEMPT   // Exento — IVA explicitly 0%
  EXCLUDED // Excluido — outside IVA scope
}

enum SiigoIdType {
  NIT      // "31" — Empresa con NIT
  CC       // "13" — Cedula ciudadania
  CE       // "22" — Cedula extranjeria
  PASSPORT // "41" — Pasaporte
}

enum SiigoPersonType {
  PERSON   // Persona natural
  COMPANY  // Persona juridica
}
```

### 1.2 Provider — 9 new fields (all nullable)

```prisma
nit                    String?
siigoIdType            SiigoIdType?
siigoPersonType        SiigoPersonType?
stateCode              String?
cityCode               String?
fiscalResponsibilities String[]
vatResponsible         Boolean?
siigoId                String?
siigoSyncedAt          DateTime?
```

### 1.3 Invoice — 6 new fields (all nullable)

```prisma
siigoId          String?
siigoSyncStatus  SiigoSyncStatus?
siigoSyncedAt    DateTime?
siigoError       String?          @db.Text
paymentMeanSiigo Int?
siigoSyncedBy    String?
```

### 1.4 MasterPart — 5 new fields (all nullable)

```prisma
siigoProductId         String?
accountGroup           Int?
siigoTaxClassification SiigoTaxClassification?
siigoUnit              Int?
siigoSyncedAt          DateTime?
```

### 1.5 Tenant.settings JSON shape

```typescript
interface TenantSiigoConfig {
  username: string;
  accessKeyEncrypted: string;  // "enc:v1:<base64url(IV || ciphertext || tag)>" — never plaintext
  defaultCostCenterId: number;
  defaultPaymentTypeId: number;
  defaultDocumentTypeId: string;
  enabled: boolean;
  lastTestAt?: string;         // ISO string
}
```

### 1.6 Migration

- Purely additive — all new columns are nullable
- `fiscalResponsibilities String[]` → PostgreSQL `TEXT[] DEFAULT '{}'`
- No data backfill required
- Rollback: `ALTER TABLE DROP COLUMN` — no data loss

---

## 2. SiigoApiClient Contract

**File:** `src/lib/services/siigo/siigo-api-client.ts`

### 2.1 Error Classes (`src/lib/services/siigo/siigo-errors.ts`)

```typescript
class SiigoApiError extends Error {
  constructor(message: string, readonly statusCode: number, readonly responseBody?: unknown) {}
}
class SiigoAuthError extends SiigoApiError { /* 401/403 */ }
class SiigoRateLimitError extends SiigoApiError {
  constructor(readonly retryAfterMs: number, responseBody?: unknown) {}
}
class SiigoValidationError extends SiigoApiError {
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string[]>,
    responseBody?: unknown
  ) {}
}
```

### 2.2 Token Cache

```typescript
interface SiigoTokenCache {
  accessToken: string;
  expiresAt: Date;    // now() + 23h (24h TTL minus 1h buffer)
  tenantId: string;
}
// Storage: module-level Map<string, SiigoTokenCache> keyed by tenantId
```

### 2.3 Constructor

```typescript
interface SiigoClientConfig {
  username: string;
  accessKey: string;   // decrypted plaintext — never stored encrypted in this object
  baseUrl?: string;    // default: "https://api.siigo.com"
  timeoutMs?: number;  // default: 10_000
  maxRetries?: number; // default: 3
}
```

### 2.4 Method Signatures

```typescript
async authenticate(): Promise<string>
async ensureProvider(provider: SiigoProviderInput): Promise<string>       // returns siigoId
async ensureProduct(part: SiigoProductInput): Promise<string>             // returns siigoProductId
async createPurchaseInvoice(invoice: SiigoPurchaseInvoiceInput): Promise<string>  // returns siigoId
async addPayment(siigoInvoiceId: string, payment: SiigoPaymentInput): Promise<void>
async getCostCenters(): Promise<SiigoCostCenter[]>
async getPaymentTypes(): Promise<SiigoPaymentType[]>
async getDocumentTypes(): Promise<SiigoDocumentType[]>
async getTaxes(): Promise<SiigoTax[]>
```

### 2.5 Retry Logic (internal)

- Max retries: 3 (configurable)
- Backoff: 1000ms → 2000ms → 4000ms
- Retry on: network errors, 5xx, 429 (respects Retry-After header)
- No retry on: 401, 400/422, 404
- Per-request timeout: 10s (AbortController)

---

## 3. Siigo API Request/Response Shapes

**File:** `src/lib/services/siigo/siigo-types.ts`

### 3.1 Auth

```typescript
// POST https://api.siigo.com/auth
interface SiigoAuthRequest {
  username: string;
  access_key: string;
}
interface SiigoAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
```

### 3.2 Customer (Tercero)

```typescript
// POST https://api.siigo.com/v1/customers
interface SiigoCustomerRequest {
  type: 'Supplier';
  person_type: 'Person' | 'Company';
  id_type: { code: '13' | '22' | '31' | '41' };
  identification: string;     // NIT sin dígito verificador
  check_digit?: string;       // calculado con algoritmo DIAN módulo-11
  name: [{ first_name?: string; last_name?: string; business_name?: string }];
  address: {
    address: string;
    city: { country_code: 'Co'; state_code: string; city_code: string };
  };
  phones: [{ number: string }];
  contacts: [{ first_name: string; last_name: string; email: string }];
  fiscal_responsibilities: [{ code: string }];
  vat_responsible: boolean;
}
interface SiigoCustomerResponse {
  id: string;  // → Provider.siigoId
}
```

**Mapeo Provider → SiigoCustomerRequest:**

| Provider field | Siigo field |
|---|---|
| `name` | `name[0].business_name` (COMPANY) / `first_name`+`last_name` (PERSON) |
| `nit` | `identification` (strip espacios/guiones) |
| `siigoIdType` | `id_type.code` |
| `siigoPersonType` | `person_type` |
| `stateCode` | `address.city.state_code` |
| `cityCode` | `address.city.city_code` |
| `address` | `address.address` |
| `phone` | `phones[0].number` |
| `email` | `contacts[0].email` |
| `fiscalResponsibilities` | `fiscal_responsibilities[*].code` |
| `vatResponsible` | `vat_responsible` |

### 3.3 Product

```typescript
// POST https://api.siigo.com/v1/products
interface SiigoProductRequest {
  code: string;           // MasterPart.code
  name: string;           // MasterPart.description
  account_group: { id: number };
  type: 'Product';
  stock_control: false;
  tax_classification: 'Taxed' | 'Exempt' | 'Excluded';
  taxes: [{ id: number }];   // ID del IVA obtenido de GET /v1/taxes
  unit: { id: number };      // MasterPart.siigoUnit
}
interface SiigoProductResponse { id: string }  // id → MasterPart.siigoProductId
```

### 3.4 Purchase Invoice

```typescript
// POST https://api.siigo.com/v1/purchase-invoices
interface SiigoPurchaseInvoiceRequest {
  document: { id: number };
  date: string;                            // "YYYY-MM-DD"
  supplier: { identification: string; branch_office: 0 };
  cost_center?: { id: number };
  currency?: { code: string; exchange_rate?: number };
  observations?: string;                   // max 255 chars
  items: SiigoPurchaseInvoiceItem[];
  payments: [{ id: number; value: number; due_date: string }];
}
interface SiigoPurchaseInvoiceItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  discount?: number;
  taxes?: [{ id: number; percentage: number }];
}
interface SiigoPurchaseInvoiceResponse { id: string }  // id → Invoice.siigoId
```

> Items sin MasterPart vinculado usan: `code = "MISC-" + invoiceItem.id.slice(-8)`

---

## 4. Sync State Machine

### 4.1 Estados

| Estado | Significado | UI |
|---|---|---|
| `null` | Siigo no configurado o invoice anterior a la integración | Oculto |
| `PENDING` | Encolado en after() | Badge amarillo |
| `SYNCING` | En vuelo (set al inicio del after()) | Badge amarillo animado |
| `SYNCED` | Éxito, siigoId presente | Badge verde + link |
| `FAILED` | Reintentos agotados | Badge rojo + tooltip con error |
| `SKIPPED` | Faltan datos fiscales (NIT null, etc.) | Badge gris + info |

### 4.2 Transiciones

| Trigger | Desde | Hacia |
|---|---|---|
| Invoice → APPROVED | `null` | `PENDING` |
| Invoice → APPROVED | `FAILED` | `PENDING` (reset para retry) |
| after() inicia | `PENDING` | `SYNCING` |
| Llamada Siigo exitosa | `SYNCING` | `SYNCED` |
| Todos los reintentos fallan | `SYNCING` | `FAILED` |
| Provider NIT null | `SYNCING` | `SKIPPED` |
| Siigo no configurado | cualquiera | sin cambio (early return) |
| Invoice → PAID (siigoId presente) | `SYNCED` | `SYNCED` (sync pago en paralelo) |
| Batch sync disparado | `FAILED`/`PENDING` | `PENDING` → `SYNCING` → `SYNCED`/`FAILED` |

### 4.3 Retry Manual

- POST `/api/integrations/siigo/sync/batch` re-encola FAILED como PENDING
- Útil cuando Siigo estuvo caído o el proveedor no tenía NIT

---

## 5. New API Endpoints

Todos bajo `/api/integrations/siigo/`. Auth via `getCurrentUser()`. OWNER para escrituras, OWNER o MANAGER para lecturas.

### 5.1 `POST /api/integrations/siigo/config`
- Rol: OWNER
- Body: `{ username, accessKey (plaintext), defaultCostCenterId, defaultPaymentTypeId, defaultDocumentTypeId, enabled }`
- Acción: cifrar accessKey, merge en `Tenant.settings.siigo`
- Response: `200 { success: true }`

### 5.2 `GET /api/integrations/siigo/config`
- Rol: OWNER o MANAGER
- Response: `{ configured, enabled, username, accessKeyMasked, defaultCostCenterId, ... }`
- **Nunca** devuelve el accessKey cifrado ni en texto plano

### 5.3 `POST /api/integrations/siigo/test-connection`
- Rol: OWNER o MANAGER
- Body: `{}`
- Acción: descifrar clave, llamar `SiigoApiClient.authenticate()`
- Response (siempre 200): `{ success: boolean, error?: string }`

### 5.4 `POST /api/integrations/siigo/sync/batch`
- Rol: OWNER
- Body: `{ entityTypes: ('invoices'|'providers'|'parts')[], statusFilter?: ('PENDING'|'FAILED')[], limit?: number }`
- Acción: sync secuencial con delay de 200ms entre requests, limit default 50
- Response: `202 { message: string, counts: { invoices: N, providers: N, parts: N } }`

### 5.5 `GET /api/integrations/siigo/sync/status`
- Rol: OWNER o MANAGER
- Response: `{ invoices: { total, synced, pending, failed, skipped }, providers: { total, withSiigoId, withNit, withoutNit }, parts: { total, withSiigoId }, integration: { configured, enabled, lastError } }`

### 5.6 `GET /api/integrations/siigo/bootstrap`
- Rol: OWNER o MANAGER
- Acción: `Promise.all([getCostCenters, getPaymentTypes, getDocumentTypes, getTaxes])`, timeout 15s
- Response: `{ costCenters, paymentTypes, documentTypes, taxes }`
- Usado al configurar la integración por primera vez para poblar los selects

---

## 6. Sync Trigger Specification

### 6.1 Invoice APPROVED
**Archivo:** `src/app/api/invoices/[id]/route.ts`, PATCH handler

```typescript
// After invoice.update() resolves, before NextResponse.json():
if (validatedData.status === 'APPROVED' && existingInvoice.status !== 'APPROVED') {
  // Include siigoSyncStatus: 'PENDING' in updateData
  after(async () => {
    const { SiigoSyncService } = await import('@/lib/services/siigo/siigo-sync-service');
    await SiigoSyncService.syncInvoiceApproved(updatedInvoice.id, user.tenantId);
  });
}
```

**Pasos de `syncInvoiceApproved`:**
1. Cargar config tenant → early return si `!config.enabled`
2. Set `siigoSyncStatus = 'SYNCING'`
3. Cargar invoice con supplier + items.masterPart
4. `ensureProvider(supplier)` → siigoCustomerId
5. Por cada item con masterPart: `ensureProduct(part)`
6. `createPurchaseInvoice(invoice)`
7. Éxito: `{ siigoId, siigoSyncStatus: 'SYNCED', siigoSyncedAt: now() }`
8. NIT faltante: `{ siigoSyncStatus: 'SKIPPED', siigoError: msg }`
9. Otro error: `{ siigoSyncStatus: 'FAILED', siigoError: error.message }`

### 6.2 Invoice PAID
**Archivo:** mismo, condición separada de APPROVED:

```typescript
if (validatedData.status === 'PAID' && existingInvoice.status !== 'PAID' && existingInvoice.siigoId) {
  after(async () => {
    const { SiigoSyncService } = await import('@/lib/services/siigo/siigo-sync-service');
    await SiigoSyncService.syncInvoicePaid(updatedInvoice.id, user.tenantId);
  });
}
```

**Pasos de `syncInvoicePaid`:** cargar invoice + último pago → `addPayment(siigoId, payment)` → log resultado.

### 6.3 Provider CREATE
**Archivo:** `src/app/api/people/providers/route.ts`, POST handler

```typescript
after(async () => {
  const { SiigoSyncService } = await import('@/lib/services/siigo/siigo-sync-service');
  await SiigoSyncService.syncProvider(provider.id, user.tenantId);
});
```

### 6.4 Provider UPDATE
**Archivo:** `src/app/api/people/providers/[id]/route.ts`, PUT handler — mismo after() que POST.

### 6.5 MasterPart CREATE
**Archivo:** `src/app/api/inventory/parts/route.ts`, POST handler

```typescript
after(async () => {
  const { SiigoSyncService } = await import('@/lib/services/siigo/siigo-sync-service');
  await SiigoSyncService.syncPart(part.id, user.tenantId);
});
```

**Pasos de `syncPart`:** check config.enabled → skip global parts (`tenantId = null`) → check accountGroup (skip si null) → check siigoProductId (skip si ya existe) → `ensureProduct` → update `{ siigoProductId, siigoSyncedAt }`.

### 6.6 MasterPart UPDATE
**Archivo:** `src/app/api/inventory/parts/[id]/route.ts`, PATCH handler — mismo after() que POST.

---

## 7. Error Handling Protocol

### 7.1 Decisiones por escenario

| Escenario | ¿Reintento? | Estado final |
|---|---|---|
| Error de red | 3x | FAILED |
| 5xx Siigo | 3x | FAILED |
| 429 rate limit | 3x con Retry-After | FAILED |
| 401 token expirado | 1x (re-auth) | FAILED si re-auth falla |
| 400/422 validación | No | FAILED |
| NIT null | No intentado | SKIPPED |
| MasterPart global | No intentado | sin cambio (solo log) |
| Siigo no configurado | No intentado | sin cambio |
| accountGroup null | No intentado | SKIPPED |
| Moneda != COP (Fase 1) | No intentado | SKIPPED |

### 7.2 Visibilidad para el usuario

| Canal | Qué se muestra |
|---|---|
| Respuesta HTTP | Nada (sync invisible al caller inmediato) |
| Invoice detail/list | `SiigoSyncStatusBadge` con tooltip |
| Config panel | Conteos de FAILED por entidad |
| Server logs | `[SIIGO_SYNC] { operation, entityId, tenantId, statusCode, siigoMessage }` |

---

## 8. Security Specification

### 8.1 Cifrado de credenciales

- Algoritmo: AES-256-GCM
- Clave: 32 bytes (hex 64 chars) desde `process.env.SIIGO_ENCRYPTION_KEY`
- IV: 12 bytes aleatorios por cifrado (`crypto.randomBytes(12)`)
- Auth tag: 16 bytes
- Formato almacenado: `enc:v1:<base64url(IV || ciphertext || authTag)>`

### 8.2 Variable de entorno

```bash
SIIGO_ENCRYPTION_KEY=<64-char hex>
# Generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

La app debe lanzar error al arrancar si esta var está ausente cuando se invocan rutas de Siigo.

### 8.3 Qué NUNCA se loguea

- `accessKey` en texto plano
- `SIIGO_ENCRYPTION_KEY`
- `SiigoAuthRequest.access_key` (body enviado a Siigo)
- `SiigoTokenCache.accessToken` (Bearer token)
- `error.responseBody` completo de Siigo

### 8.4 Sanitización de respuestas API

`GET /config` debe:
- Descifrar accessKey en memoria, tomar últimos 4 chars únicamente
- Devolver `accessKeyMasked: "...XXXX"` con los últimos 4
- Descartar inmediatamente el texto plano
- **Nunca** serializar `Tenant.settings` directamente en la respuesta

---

## 9. Files Summary

```
Phase 1 — Schema + Client
  prisma/schema.prisma                                        MODIFIED
  prisma/migrations/YYYYMMDD_add_siigo_fields/migration.sql  NEW
  src/lib/services/siigo/siigo-api-client.ts                 NEW
  src/lib/services/siigo/siigo-types.ts                      NEW
  src/lib/services/siigo/siigo-errors.ts                     NEW

Phase 2 — Sync Engine + Triggers
  src/lib/services/siigo/siigo-sync-service.ts               NEW
  src/lib/services/siigo/siigo-crypto.ts                     NEW
  src/app/api/integrations/siigo/config/route.ts             NEW
  src/app/api/integrations/siigo/test-connection/route.ts    NEW
  src/app/api/integrations/siigo/sync/route.ts               NEW
  src/app/api/integrations/siigo/bootstrap/route.ts          NEW
  src/app/api/invoices/[id]/route.ts                         MODIFIED
  src/app/api/people/providers/route.ts                      MODIFIED
  src/app/api/people/providers/[id]/route.ts                 MODIFIED
  src/app/api/inventory/parts/route.ts                       MODIFIED
  src/app/api/inventory/parts/[id]/route.ts                  MODIFIED

Phase 3 — UI
  src/app/dashboard/empresa/integraciones/siigo/page.tsx     NEW
  src/components/siigo/SiigoSyncStatusBadge/                 NEW
  src/app/dashboard/invoices/ (badge en lista y detalle)     MODIFIED
  src/components/providers/ProviderForm (campos DIAN)        MODIFIED
  src/components/parts/PartForm (campos contables)           MODIFIED
```

---

## 10. Riesgos Abiertos

| # | Issue | Severidad |
|---|---|---|
| 1 | MasterPart global no puede compartir `siigoProductId` entre tenants → Fase 1: skip globals, Fase 2: tabla join `TenantMasterPartSiigo` | ALTO |
| 2 | Siigo no soporta PUT en customers — sync de Provider es idempotente en Fase 1; actualización a spec en Fase 2 | MEDIO |
| 3 | Cálculo de dígito verificador NIT (módulo-11 DIAN) en `SiigoSyncService`, sin campo adicional en DB | MEDIO |
| 4 | Vercel `after()` tiene budget de 10s por defecto → agregar `export const maxDuration = 60` en rutas modificadas | MEDIO |
| 5 | Bug pre-existente: `supplierId: z.number()` en invoice route.ts debe ser `z.string()` post UUID migration → fix en mismo PR | BUG |

---

## Revision History

| Fecha | Autor | Cambio |
|---|---|---|
| 2026-03-02 | sdd-spec agent | Spec inicial creada |
