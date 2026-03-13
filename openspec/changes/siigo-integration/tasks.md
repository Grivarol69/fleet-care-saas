# Implementation Tasks: Siigo Integration

**Total tasks:** 32
**Estimated effort:** 7-10 days

---

## Phase 1 — Foundation (Schema + API Client)
*Prerequisite for all other phases. No Phase 2 work should begin until the migration is applied and
the API client tests pass. Can be reviewed with sdd-reviewer before Phase 2.*

- [x] **1.1** `prisma/schema.prisma` — Add 4 new enums: `SiigoSyncStatus` (PENDING / SYNCING / SYNCED / FAILED / SKIPPED), `SiigoTaxClassification` (TAXED / EXEMPT / EXCLUDED), `SiigoIdType` (NIT / CC / CE / PASSPORT), `SiigoPersonType` (PERSON / COMPANY)

- [x] **1.2** `prisma/schema.prisma` — Add 9 nullable fields to `Provider` model: `nit String?`, `siigoIdType SiigoIdType?`, `siigoPersonType SiigoPersonType?`, `stateCode String?`, `cityCode String?`, `fiscalResponsibilities String[]`, `vatResponsible Boolean?`, `siigoId String?`, `siigoSyncedAt DateTime?`

- [x] **1.3** `prisma/schema.prisma` — Add 6 nullable fields to `Invoice` model: `siigoId String?`, `siigoSyncStatus SiigoSyncStatus?`, `siigoSyncedAt DateTime?`, `siigoError String? @db.Text`, `paymentMeanSiigo Int?`, `siigoSyncedBy String?`

- [x] **1.4** `prisma/schema.prisma` — Add 5 nullable fields to `MasterPart` model: `siigoProductId String?`, `accountGroup Int?`, `siigoTaxClassification SiigoTaxClassification?`, `siigoUnit Int?`, `siigoSyncedAt DateTime?`

- [x] **1.5** Run `pnpm prisma:migrate` — generate migration file `YYYYMMDD_add_siigo_fields`. Verify migration is purely additive (all nullable / with defaults). Confirm `fiscalResponsibilities String[]` maps to `TEXT[] DEFAULT '{}'` in the generated SQL.

- [x] **1.6** `src/lib/services/siigo/siigo-types.ts` — Define all TypeScript interfaces matching Siigo API shapes: `SiigoAuthRequest`, `SiigoAuthResponse`, `SiigoCustomerRequest`, `SiigoCustomerResponse`, `SiigoProductRequest`, `SiigoProductResponse`, `SiigoPurchaseInvoiceRequest`, `SiigoPurchaseInvoiceItem`, `SiigoPurchaseInvoiceResponse`, `SiigoCostCenter`, `SiigoPaymentType`, `SiigoDocumentType`, `SiigoTax`, `SiigoPaymentInput`, `SiigoProviderInput`, `SiigoProductInput`, `SiigoPurchaseInvoiceInput`, `TenantSiigoConfig`, `BatchSyncResult`, `SiigoClientConfig`

- [x] **1.7** `src/lib/services/siigo/siigo-errors.ts` — Implement error types using discriminated union pattern (per CLAUDE.md rules — no `extends Error` class hierarchy):
  - `SiigoErrorKind`: discriminated union with `kind: 'auth' | 'rate_limit' | 'validation' | 'api'` and relevant fields per variant
  - `SiigoError = SiigoErrorKind & { message: string }` — flat intersection type
  - `throwSiigoError(error: SiigoError): never` — throws `Object.assign(new Error(msg), error)` preserving stack trace and allowing `err.kind` narrowing after catch
  - `isSiigoError(err: unknown): err is Error & SiigoError` — type guard for catch blocks

- [x] **1.8** `src/lib/services/siigo/siigo-api-client.ts` — Full implementation as factory function `createSiigoClient(tenantId, config)` (per CLAUDE.md rules — no class):
  - Module-level `tokenCache = new Map<string, SiigoTokenCache>()` keyed by tenantId (shared across calls)
  - `createSiigoClient(tenantId: string, config: SiigoClientConfig)` — factory function returning a plain object with methods
  - Inner `authenticate()`: POST `/auth` → cache token with 23h TTL (1h proactive buffer); throws via `throwSiigoError({ kind: 'auth' })` on failure
  - Inner `getToken()`: returns cached if >60 min remaining, else calls `authenticate()`
  - Inner `fetchWithRetry()`: AbortController per-request (10s timeout); retry on 5xx/429/network errors up to 3 times with exponential backoff (1000ms → 2000ms → 4000ms); respects `Retry-After` header on 429; no retry on 4xx (except 401)
  - Exposed methods: `ensureProvider(input)`, `ensureProduct(input)`, `createPurchaseInvoice(input)`, `addPayment(siigoInvoiceId, payment)`, `getCostCenters()`, `getPaymentTypes()`, `getDocumentTypes()`, `getTaxes()`
  - NIT dígito verificador: module-level helper `calcCheckDigit(nit: string): string` (DIAN módulo-11)
  - Items without linked MasterPart use fallback code `"MISC-" + invoiceItem.id.slice(-8)`
  - Exported type: `SiigoClient = ReturnType<typeof createSiigoClient>`

- [x] **1.9** `src/lib/services/siigo/siigo-crypto.ts` — AES-256-GCM implementation:
  - `encryptAccessKey(plaintext: string): string` — reads `SIIGO_ENCRYPTION_KEY` (64-char hex), generates 12-byte random IV via `crypto.randomBytes`, returns `"enc:v1:" + base64url(IV || ciphertext || authTag)`
  - `decryptAccessKey(encrypted: string): string` — validates `"enc:v1:"` prefix, decodes, splits IV/ciphertext/authTag, returns plaintext
  - `validateSiigoEncryptionKey(): void` — throws descriptive error if env var is missing or not 64-char hex; intended to be called at top of config route handler
  - Never log or expose the key value in error messages

- [x] **1.10** `src/lib/services/siigo/index.ts` — Barrel export (implemented with factory function pattern per CLAUDE.md rules — no classes for services):
  - `export { createSiigoClient } from './siigo-api-client'` — factory function (NOT a class)
  - `export type { SiigoClient } from './siigo-api-client'` — derived type via `ReturnType<typeof createSiigoClient>`
  - `export { encryptAccessKey, decryptAccessKey, validateSiigoEncryptionKey } from './siigo-crypto'`
  - `export { throwSiigoError, isSiigoError } from './siigo-errors'` — discriminated union helpers (NOT class hierarchy)
  - `export type { SiigoError, SiigoErrorKind } from './siigo-errors'`
  - `export * from './siigo-types'`
  - Note: `SiigoSyncService` export is deferred to Phase 2 (placeholder comment in index.ts)

- [x] **1.11** `src/lib/services/siigo/__tests__/siigo-api-client.test.ts` — Unit tests using `vi.fn()` to mock `fetch`:
  - Token is cached on second `authenticate()` call
  - Token is refreshed when less than 60 min remaining
  - Retry fires 3 times on 5xx then throws `SiigoApiError`
  - No retry on 400/422
  - `SiigoRateLimitError` thrown and Retry-After respected on 429
  - `AbortController` fires on timeout (mock with fake timers)
  - `ensureProvider` maps Provider fields to `SiigoCustomerRequest` correctly including dígito verificador

- [x] **1.12** `src/lib/services/siigo/__tests__/siigo-crypto.test.ts` — Unit tests:
  - Round-trip: encrypt then decrypt returns original plaintext
  - Different IVs produce different ciphertexts for same plaintext
  - `decryptAccessKey` throws on tampered ciphertext (auth tag failure)
  - `validateSiigoEncryptionKey` throws when env var is absent
  - `validateSiigoEncryptionKey` throws when env var is not 64-char hex

---

## Phase 2 — Sync Engine + Triggers
*Requires Phase 1 complete (migration applied, client tests passing). sdd-reviewer after this phase.*

- [x] **2.1** `src/lib/services/siigo/siigo-sync-service.ts` — Static class following the `FinancialWatchdogService` pattern:
  - `private static async getClient(tenantId: string): Promise<SiigoApiClient | null>` — reads `Tenant.settings.siigo`, returns null if `!config.enabled`; calls `decryptAccessKey` to build client config
  - `static async syncProvider(providerId: string, tenantId: string): Promise<void>` — skip if `provider.nit` is null (log informativo, no state change); call `client.ensureProvider()`; update `{ siigoId, siigoSyncedAt }`; on error log `[SIIGO_SYNC] { operation, entityId, tenantId, statusCode, message }` — never log credentials
  - `static async syncPart(partId: string, tenantId: string): Promise<void>` — skip global parts (`part.tenantId === null`); skip if `accountGroup` is null (SKIPPED); skip if `siigoProductId` already set; call `client.ensureProduct()`; update `{ siigoProductId, siigoSyncedAt }`
  - `static async syncInvoiceApproved(invoiceId: string, tenantId: string): Promise<void>` — full 9-step flow from spec section 6.1: SYNCING → ensureProvider → ensureProduct per item → createPurchaseInvoice → SYNCED or SKIPPED or FAILED
  - `static async syncInvoicePaid(invoiceId: string, tenantId: string): Promise<void>` — load invoice + last payment → `client.addPayment(siigoId, payment)` → log result; no status field update (invoice stays SYNCED)
  - `static async batchSync(tenantId, options): Promise<BatchSyncResult>` — sync Providers → Parts → Invoices in order with 250ms throttle between requests (stays under 300 req/min); respects `limit` (default 50); filter by `statusFilter` (default PENDING + FAILED)

- [x] **2.2** `src/app/api/integrations/siigo/config/route.ts` — Dual handler:
  - `GET`: role OWNER or MANAGER; read `Tenant.settings.siigo`; decrypt accessKey in memory, expose only last 4 chars as `accessKeyMasked`; never serialize raw `Tenant.settings` in response
  - `POST`: role OWNER only; call `validateSiigoEncryptionKey()`; encrypt `accessKey` via `encryptAccessKey()`; merge into `Tenant.settings.siigo` via `prisma.tenant.update({ data: { settings: { ...existing, siigo: { ...body, accessKeyEncrypted: encrypted } } } })`; respond `200 { success: true }`

- [x] **2.3** `src/app/api/integrations/siigo/test-connection/route.ts` — `POST` handler:
  - Role: OWNER or MANAGER
  - Decrypt credentials, construct `SiigoApiClient`, call `authenticate()`
  - Always respond `200 { success: boolean, error?: string }` — never propagate 5xx to caller
  - On success: update `Tenant.settings.siigo.lastTestAt` to ISO timestamp

- [x] **2.4** `src/app/api/integrations/siigo/sync/route.ts` — Two handlers:
  - `POST`: role OWNER; body `{ entityTypes, statusFilter?, limit? }`; call `SiigoSyncService.batchSync()`; respond `202 { message, counts: { invoices, providers, parts } }`
  - `GET`: role OWNER or MANAGER; query DB for counts per `siigoSyncStatus` on Invoice, Provider (with/without siigoId/nit), MasterPart; respond with status summary object matching spec section 5.5

- [x] **2.5** `src/app/api/integrations/siigo/bootstrap/route.ts` — `GET` handler:
  - Role: OWNER or MANAGER
  - `Promise.all` with 15s timeout: `getCostCenters()`, `getPaymentTypes()`, `getDocumentTypes()`, `getTaxes()`
  - Respond `{ costCenters, paymentTypes, documentTypes, taxes }`
  - Used by SiigoConfigPanel to populate select inputs on first setup

- [x] **2.6** `src/app/api/invoices/[id]/route.ts` — Modify PATCH handler:
  - Add `export const maxDuration = 60` at file top
  - Fix pre-existing bug: change `supplierId: z.number()` to `z.string()` in the Zod schema (post UUID migration)
  - After `prisma.invoice.update()`, before `NextResponse.json()`, inject two conditional `after()` blocks:
    1. `if (newStatus === 'APPROVED' && existingStatus !== 'APPROVED')`: set `siigoSyncStatus: 'PENDING'` in update data, then `after(() => SiigoSyncService.syncInvoiceApproved(id, tenantId))`
    2. `if (newStatus === 'PAID' && existingStatus !== 'PAID' && existingInvoice.siigoId)`: `after(() => SiigoSyncService.syncInvoicePaid(id, tenantId))`
  - Use dynamic import inside `after()`: `const { SiigoSyncService } = await import('@/lib/services/siigo')`

- [x] **2.7** `src/app/api/people/providers/route.ts` — Modify POST handler:
  - Add `export const maxDuration = 60` at file top
  - After `prisma.provider.create()`, inject `after(() => SiigoSyncService.syncProvider(provider.id, user.tenantId))` with dynamic import

- [x] **2.8** `src/app/api/people/providers/[id]/route.ts` — Modify PUT handler:
  - Add `export const maxDuration = 60` at file top
  - After `prisma.provider.update()`, inject `after(() => SiigoSyncService.syncProvider(provider.id, user.tenantId))` with dynamic import

- [x] **2.9** `src/app/api/inventory/parts/route.ts` — Modify POST handler:
  - Add `export const maxDuration = 60` at file top
  - After `prisma.masterPart.create()`, inject `after(() => SiigoSyncService.syncPart(part.id, user.tenantId))` with dynamic import

- [x] **2.10** `src/app/api/inventory/parts/[id]/route.ts` — Modify PATCH handler:
  - Add `export const maxDuration = 60` at file top
  - After `prisma.masterPart.update()`, inject `after(() => SiigoSyncService.syncPart(part.id, user.tenantId))` with dynamic import

- [x] **2.11** `src/lib/services/siigo/__tests__/siigo-sync-service.test.ts` — Unit tests using `vi.spyOn` on `SiigoApiClient` methods:
  - `syncProvider` skips (no DB write) when `provider.nit` is null
  - `syncProvider` calls `client.ensureProvider()` and updates `Provider.siigoId` on success
  - `syncPart` skips global parts (`tenantId === null`)
  - `syncPart` skips when `accountGroup` is null → logs SKIPPED
  - `syncInvoiceApproved` sets SYNCING → SYNCED on happy path
  - `syncInvoiceApproved` sets FAILED and writes error message on `SiigoApiError`
  - `syncInvoiceApproved` sets SKIPPED when provider NIT is null
  - `getClient` returns null when `config.enabled === false` (no Siigo calls made)
  - `batchSync` respects throttle delay between items (use fake timers)

---

## Phase 3 — UI + Configuration
*Requires Phase 2 complete. sdd-reviewer after this phase, then sdd-verify for end-to-end.*

- [x] **3.1** `src/components/siigo/SiigoSyncStatusBadge/SiigoSyncStatusBadge.tsx` — Shadcn `Badge`-based component:
  - Props: `status: SiigoSyncStatus | null`, `siigoId?: string | null`, `error?: string | null`, `showTooltip?: boolean`
  - When `status === null`: render nothing (`return null`)
  - State map (variant / label / icon): PENDING → warning / "Pendiente sync" / Clock icon; SYNCING → warning+animate-spin / "Sincronizando..." / Loader2 icon; SYNCED → success / "En Siigo" / CheckCircle2 icon; FAILED → destructive / "Error Siigo" / XCircle icon; SKIPPED → secondary / "Sin datos DIAN" / AlertCircle icon
  - When `showTooltip && error && status === 'FAILED'`: wrap in Shadcn `Tooltip` showing `error` text
  - When `status === 'SYNCED' && siigoId`: render `siigoId` as secondary text next to badge

- [x] **3.2** `src/components/siigo/SiigoSyncStatusBadge/index.ts` — Barrel export: `export { SiigoSyncStatusBadge } from './SiigoSyncStatusBadge'`

- [x] **3.3** `src/app/dashboard/empresa/integraciones/siigo/page.tsx` — `SiigoConfigPanel` page component:
  - Section 1 — Credenciales: form with `username` (text) + `accessKey` (type="password"), `enabled` toggle; POST to `/api/integrations/siigo/config`; show current `accessKeyMasked` as hint text
  - Section 2 — Test y Bootstrap: "Probar conexión" button → POST `/test-connection` → show result toast; "Cargar desde Siigo" button → GET `/bootstrap` → populates selects in Section 3
  - Section 3 — Valores por defecto: selects for `defaultCostCenterId`, `defaultPaymentTypeId`, `defaultDocumentTypeId` (populated by bootstrap); saved via the same POST `/config`
  - Section 4 — Estado de sync: show counts from GET `/sync` (total / synced / pending / failed per entity type); "Sincronizar pendientes" button → POST `/sync/batch`
  - Use `react-hook-form` + `zod` for form validation; use `SWR` for status polling

- [x] **3.4** Modify Provider form (locate at `src/app/dashboard/people/providers/components/`) — Add collapsible fieldset "Datos DIAN (requeridos para Siigo)" containing: `nit` (text), `siigoIdType` (select: NIT/CC/CE/Pasaporte), `siigoPersonType` (radio: Natural/Jurídica), `stateCode` (text, DANE código), `cityCode` (text, DANE código), `fiscalResponsibilities` (multi-select with common DIAN codes: R-99-PN, O-13, etc.), `vatResponsible` (Switch). Add these fields to the Provider Zod schema in the corresponding `.form.ts` file.

- [x] **3.5** Modify MasterPart form (locate at `src/app/dashboard/inventory/parts/components/`) — Add collapsible fieldset "Datos contables (requeridos para Siigo)" containing: `accountGroup` (number input), `siigoTaxClassification` (select: Gravado/Exento/Excluido), `siigoUnit` (number input). Add these fields to the MasterPart Zod schema in the corresponding `.form.ts` file.

- [x] **3.6** Modify Invoice list table (locate at `src/app/dashboard/invoices/components/`) — Add `SiigoSyncStatusBadge` as a new column in the `@tanstack/react-table` column definition. Column header: "Siigo". Column accessor: `siigoSyncStatus`. Pass `showTooltip={false}` (no room for tooltip in list). Column is hidden when `status === null` for all rows (or hide per row).

- [x] **3.7** Modify Invoice detail page (locate at `src/app/dashboard/invoices/[id]/`) — Add `SiigoSyncStatusBadge` component in the invoice header or metadata section. Pass `status`, `siigoId`, `error={invoice.siigoError}`, `showTooltip={true}`. When `status === 'FAILED'` also render the full `siigoError` text in a collapsible `Alert` component (destructive variant) below the badge.

- [x] **3.8** `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts` — Add "Integraciones" link entry under the "Empresa" sidebar section: `{ label: 'Integraciones', href: '/dashboard/empresa/integraciones/siigo', icon: Plug2, roles: [UserRole.OWNER, UserRole.MANAGER] }`. Verify the icon import is available in lucide-react.

- [x] **3.9** `.env.example` — Add entry:
  ```
  # Siigo Integration — AES-256-GCM encryption key for storing Siigo access keys
  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  SIIGO_ENCRYPTION_KEY=
  ```

- [ ] **3.10** Manual end-to-end test with Siigo sandbox — Acceptance checklist (not automated):
  - Configure credentials in `/dashboard/empresa/integraciones/siigo` → Test Connection succeeds
  - Bootstrap loads cost centers / payment types / document types into selects
  - Create a Provider with full NIT/DIAN data → verify `Provider.siigoId` is populated in DB
  - Create a MasterPart with `accountGroup` set → verify `MasterPart.siigoProductId` is populated
  - Create an Invoice linked to that Provider and MasterPart; transition to APPROVED → verify `Invoice.siigoSyncStatus = SYNCED` and `siigoId` set
  - Transition Invoice to PAID → verify payment registered in Siigo (no status change expected, only log)
  - Create a Provider without NIT → approve an Invoice from that Provider → verify `siigoSyncStatus = SKIPPED`
  - Disable integration (`enabled: false`) → create another Provider → verify no `siigoId` is set (sync skipped)

---

## Review Checkpoints

- **After Phase 1:** `sdd-reviewer` (schema correctness, API client retry logic, crypto implementation, test coverage)
- **After Phase 2:** `sdd-reviewer` (sync engine state machine, after() injection pattern, security — no credentials in logs)
- **After Phase 3:** `sdd-reviewer` (UI completeness, form fields, badge states) + `sdd-verify` (success criteria from proposal.md)
