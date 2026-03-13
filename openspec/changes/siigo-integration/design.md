# Technical Design: Siigo Integration

**Fecha:** 2026-03-02
**Status:** draft
**Change:** siigo-integration

---

## 1. Directory Structure

```
src/lib/services/siigo/
├── siigo-api-client.ts      — HTTP client OAuth2, retry, token management
├── siigo-sync-service.ts    — Orchestrator: Provider / MasterPart / Invoice / Payment sync
├── siigo-crypto.ts          — AES-256-GCM encrypt/decrypt para accessKey
├── siigo-errors.ts          — Error classes jerarquicos
├── siigo-types.ts           — Todos los TypeScript interfaces (API shapes + internos)
└── index.ts                 — Barrel exports

src/app/api/integrations/siigo/
├── config/route.ts          — GET (masked) + POST (save+encrypt) tenant config
├── test-connection/route.ts — Validate credentials against Siigo sandbox/prod
├── sync/route.ts            — POST batch sync + GET sync status
└── bootstrap/route.ts       — GET reference data (cost centers, taxes, etc.)
```

---

## 2. SiigoApiClient — Diseño de Clase

```typescript
// src/lib/services/siigo/siigo-api-client.ts

const SIIGO_BASE_URL = 'https://api.siigo.com';

// Token cache: module-level singleton, persiste entre requests en el mismo proceso
const tokenCache = new Map<string, { accessToken: string; expiresAt: Date }>();

export class SiigoApiClient {
  private readonly config: Required<SiigoClientConfig>;
  private readonly tenantCacheKey: string;

  constructor(tenantId: string, config: SiigoClientConfig) {
    this.tenantCacheKey = tenantId;
    this.config = {
      baseUrl: SIIGO_BASE_URL,
      timeoutMs: 10_000,
      maxRetries: 3,
      ...config,
    };
  }

  // Token management: proactive refresh 60min antes de expirar
  private async getToken(): Promise<string> {
    const cached = tokenCache.get(this.tenantCacheKey);
    const bufferMs = 60 * 60 * 1000; // 60 min
    if (cached && cached.expiresAt.getTime() - Date.now() > bufferMs) {
      return cached.accessToken;
    }
    return this.authenticate();
  }

  // Retry: exponential backoff solo en 5xx/429/network errors
  private async fetchWithRetry(url: string, init: RequestInit, attempt = 1): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.ok) return res;

      if (res.status === 429 && attempt <= this.config.maxRetries) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '2') * 1000;
        await new Promise(r => setTimeout(r, retryAfter));
        return this.fetchWithRetry(url, init, attempt + 1);
      }

      if (res.status >= 500 && attempt <= this.config.maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        return this.fetchWithRetry(url, init, attempt + 1);
      }

      return res; // 4xx — no retry, caller maneja el error
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

---

## 3. SiigoSyncService — Diseño de Clase Estática

Sigue el patrón de `FinancialWatchdogService` ya existente en el proyecto.

```typescript
// src/lib/services/siigo/siigo-sync-service.ts

export class SiigoSyncService {

  static async syncProvider(providerId: string, tenantId: string): Promise<void>
  static async syncPart(partId: string, tenantId: string): Promise<void>
  static async syncInvoiceApproved(invoiceId: string, tenantId: string): Promise<void>
  static async syncInvoicePaid(invoiceId: string, tenantId: string): Promise<void>
  static async batchSync(
    tenantId: string,
    options: { entityTypes: string[]; statusFilter?: string[]; limit?: number }
  ): Promise<BatchSyncResult>

  // Helper privado: obtiene config y construye client
  private static async getClient(tenantId: string): Promise<SiigoApiClient | null>
}
```

### Flujo de syncInvoiceApproved (crítico)

```
1. getClient(tenantId) → null si Siigo no configurado → return
2. prisma.invoice.update({ siigoSyncStatus: 'SYNCING' })
3. cargar invoice con { supplier, items: { masterPart } }
4. syncProvider(invoice.supplierId) → siigoCustomerId
5. for item of items where item.masterPart:
     syncPart(item.masterPartId) → siigoProductId
6. client.createPurchaseInvoice(invoice) → siigoInvoiceId
7. SUCCESS: update { siigoId, siigoSyncStatus: 'SYNCED', siigoSyncedAt }
   NIT null: update { siigoSyncStatus: 'SKIPPED', siigoError: 'Proveedor sin NIT...' }
   ERROR:    update { siigoSyncStatus: 'FAILED', siigoError: err.message }
```

---

## 4. next/after() — Patrón de Integración

```typescript
// Patrón estándar para todos los 6 trigger points

import { after } from 'next/server';

// Agregar al top de cada route modificado:
export const maxDuration = 60; // Override del default 10s de Vercel

// Dentro del handler, DESPUÉS del prisma.update() y ANTES del return:
after(async () => {
  const { SiigoSyncService } = await import('@/lib/services/siigo');
  await SiigoSyncService.syncXxx(entityId, user.tenantId);
});
```

**Por qué dynamic import:** evita que el bundle de Siigo se incluya en rutas que no lo usan.

### Los 6 puntos de inyección

| Archivo | Handler | Condición | Método |
|---|---|---|---|
| `invoices/[id]/route.ts` | PATCH | `newStatus === 'APPROVED'` | `syncInvoiceApproved` |
| `invoices/[id]/route.ts` | PATCH | `newStatus === 'PAID' && siigoId` | `syncInvoicePaid` |
| `providers/route.ts` | POST | siempre | `syncProvider` |
| `providers/[id]/route.ts` | PUT | siempre | `syncProvider` |
| `parts/route.ts` | POST | siempre | `syncPart` |
| `parts/[id]/route.ts` | PATCH | siempre | `syncPart` |

---

## 5. SiigoCrypto — Diseño

```typescript
// src/lib/services/siigo/siigo-crypto.ts

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;    // bytes
const TAG_LENGTH = 16;   // bytes
const PREFIX = 'enc:v1:';

export function encryptAccessKey(plaintext: string): string {
  // Valida SIIGO_ENCRYPTION_KEY (debe ser 64-char hex = 32 bytes)
  // crypto.randomBytes(12) → IV
  // createCipheriv → encrypt
  // Returns: `enc:v1:${base64url(IV + ciphertext + authTag)}`
}

export function decryptAccessKey(encrypted: string): string {
  // Valida prefix 'enc:v1:'
  // base64url decode → split IV / ciphertext / authTag
  // createDecipheriv → decrypt
  // Returns: plaintext accessKey
}

export function validateSiigoEncryptionKey(): void {
  // Throws if SIIGO_ENCRYPTION_KEY missing or wrong length
  // Called at startup from config route handler
}
```

---

## 6. Tenant Configuration Storage

```json
// Tenant.settings (JSON column — fragmento del campo siigo)
{
  "siigo": {
    "username": "contabilidad@empresa.com",
    "accessKeyEncrypted": "enc:v1:dGVzdA==",
    "defaultCostCenterId": 123,
    "defaultPaymentTypeId": 5765,
    "defaultDocumentTypeId": "44721",
    "enabled": true,
    "lastTestAt": "2026-03-02T15:00:00.000Z"
  }
}
```

**GET /config response (sanitizada):**
```json
{
  "configured": true,
  "enabled": true,
  "username": "contabilidad@empresa.com",
  "accessKeyMasked": "...abc4",
  "defaultCostCenterId": 123,
  "defaultPaymentTypeId": 5765,
  "defaultDocumentTypeId": "44721"
}
```

---

## 7. UI Components

### SiigoSyncStatusBadge

```
src/components/siigo/SiigoSyncStatusBadge/
├── SiigoSyncStatusBadge.tsx
└── index.ts
```

```typescript
// Mapeo de estado → variante Shadcn Badge
const STATE_MAP = {
  PENDING:  { variant: 'warning',   label: 'Pendiente sync',  icon: Clock },
  SYNCING:  { variant: 'warning',   label: 'Sincronizando...', icon: Spinner },
  SYNCED:   { variant: 'success',   label: 'En Siigo',        icon: CheckCircle2 },
  FAILED:   { variant: 'destructive', label: 'Error Siigo',   icon: XCircle },
  SKIPPED:  { variant: 'secondary', label: 'Sin datos DIAN',  icon: AlertCircle },
};

// Props:
interface SiigoSyncStatusBadgeProps {
  status: SiigoSyncStatus | null;
  siigoId?: string | null;
  error?: string | null;
  showTooltip?: boolean;
}
```

### SiigoConfigPanel
Nueva página en `src/app/dashboard/empresa/integraciones/siigo/page.tsx` con:
- Sección 1: Credenciales (username, accessKey — input type="password")
- Sección 2: Bootstrap — botón "Cargar configuración desde Siigo" → GET /bootstrap → popula selects
- Sección 3: Valores por defecto (cost center, tipo pago, tipo documento, IVA)
- Sección 4: Acciones — Test conexión, Batch sync, Estado de sincronización

### Modificaciones a formularios existentes

**ProviderForm:** Agregar fieldset "Datos DIAN (requeridos para Siigo)" con:
- NIT (text input), Tipo ID (select: NIT/CC/CE/Pasaporte), Tipo persona (radio: Natural/Jurídica)
- Código departamento DANE, Código ciudad DANE
- Responsabilidades fiscales (multi-select DIAN codes), Responsable IVA (toggle)

**MasterPartForm:** Agregar fieldset "Datos contables (requeridos para Siigo)" con:
- Grupo de cuenta (número), Clasificación impuesto (select: Gravado/Exento/Excluido), Unidad Siigo (número)

**InvoiceDetail/InvoiceList:** Agregar columna/sección `SiigoSyncStatusBadge`

---

## 8. Batch Sync — Throttling Strategy

```typescript
// 250ms delay = max 240 req/min (well under 300 req/min limit)
// Orden de sync: Providers → Parts → Invoices → Payments

async function batchSyncWithThrottle<T>(
  items: T[],
  syncFn: (item: T) => Promise<void>,
  delayMs = 250
): Promise<BatchResult> {
  const results: BatchResult = { success: 0, failed: 0, skipped: 0 };
  for (const item of items) {
    await syncFn(item);
    await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}
```

---

## 9. Decisiones de Arquitectura

| Decisión | Elegida | Alternativa rechazada | Razón |
|---|---|---|---|
| **Sync mechanism** | `next/after()` | BullMQ + Redis | Sin infraestructura adicional; escalar a BullMQ si > 1000 facturas/día |
| **Credential storage** | AES-256-GCM en `Tenant.settings` | Tabla separada `TenantSiigoCredential` | Reutiliza JSON column existente; evita JOIN; menor complejidad |
| **siigoId location** | Campo en entidad (Provider.siigoId) | Tabla de mapeo separada | Simpler queries; el costo es 1 campo nullable por entidad |
| **Sync direction** | Push unidireccional FC → Siigo | Bidireccional | Siigo no provee webhooks; bidireccional requeriría polling periódico |
| **Class pattern** | Static class (`SiigoSyncService`) | Instancia singleton | Consistente con `FinancialWatchdogService`; testeable con vi.spyOn |
| **HTTP client** | Native `fetch` de Next.js 15 | axios | Sin dependencia adicional; fetch nativo tiene mejor soporte en Edge |

---

## 10. Testing Strategy

### Unit tests

```
src/lib/services/siigo/__tests__/
├── siigo-api-client.test.ts   — mock fetch, test retry/backoff, token cache
├── siigo-sync-service.test.ts — mock SiigoApiClient, test state transitions
└── siigo-crypto.test.ts       — round-trip encrypt/decrypt, invalid key handling
```

### Integration tests (Siigo sandbox)

- `POST /api/integrations/siigo/test-connection` con credenciales sandbox
- Crear Provider → verificar `siigoId` persistido
- Crear MasterPart con accountGroup → verificar `siigoProductId`
- Aprobar Invoice → verificar `siigoSyncStatus: SYNCED`

---

## 11. Consideraciones de Seguridad

- `SIIGO_ENCRYPTION_KEY` solo en variables de entorno del servidor (Vercel/Neon) — nunca en `.env.local` commiteado
- Bearer token de Siigo nunca llega al cliente browser
- `Tenant.settings.siigo` nunca serializado en respuestas de API sin sanitizar
- Logs de Siigo sanitizados: solo `entityId`, `tenantId`, `statusCode`, mensaje de error — nunca credenciales
- Aislamiento multi-tenant: cada operación usa `user.tenantId` — imposible cross-tenant por diseño

---

## Revision History

| Fecha | Autor | Cambio |
|---|---|---|
| 2026-03-02 | sdd-design agent + orchestrator | Design inicial |
