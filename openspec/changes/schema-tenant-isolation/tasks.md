# Tasks: schema-tenant-isolation

**Change**: Add `tenantId` to 9 child models for direct tenant isolation
**Models affected**: OdometerLog, WorkOrderItem, WorkOrderExpense, WorkOrderApproval, ExpenseAuditLog, InvoiceItem, PurchaseOrderItem, TicketLaborEntry, TicketPartEntry
**Previous artifacts**: Engram #4 (proposal), #5 (explore), #6 (design), #7 (spec)
**Note**: expenses/route.ts GET+POST tenant check is ALREADY APPLIED — not included below.

---

## Phase 1 — Schema Changes (prisma/schema.prisma)

- [ ] 1.1 Add `tenantId String?` field to `OdometerLog`
      **File**: `prisma/schema.prisma`
      Add `tenantId String?` field (nullable, for Phase 1) and a `tenant Tenant? @relation(...)` back-relation on `OdometerLog`. Also add `@@index([tenantId])`.
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.2 Add `tenantId String?` to `WorkOrderItem`
      **File**: `prisma/schema.prisma`
      Add nullable `tenantId` field and corresponding `tenant Tenant? @relation(...)` and `@@index([tenantId])` to `WorkOrderItem`.
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.3 Add `tenantId String?` to `WorkOrderExpense`
      **File**: `prisma/schema.prisma`
      Add nullable `tenantId` field plus relation and index to `WorkOrderExpense`. (Note: this model already has a hotfix-complete GET+POST; the schema field is still missing.)
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.4 Add `tenantId String?` to `WorkOrderApproval`
      **File**: `prisma/schema.prisma`
      Add nullable `tenantId` field plus relation and index to `WorkOrderApproval`.
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.5 Add `tenantId String?` to `ExpenseAuditLog`
      **File**: `prisma/schema.prisma`
      Add nullable `tenantId` field plus relation and index to `ExpenseAuditLog`.
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.6 Add `tenantId String?` to `InvoiceItem`
      **File**: `prisma/schema.prisma`
      Add nullable `tenantId` field plus relation and index to `InvoiceItem`.
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.7 Add `tenantId String?` to `PurchaseOrderItem`
      **File**: `prisma/schema.prisma`
      Add nullable `tenantId` field plus relation and index to `PurchaseOrderItem`.
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.8 Add `tenantId String?` to `TicketLaborEntry`
      **File**: `prisma/schema.prisma`
      Add nullable `tenantId` field plus relation and index to `TicketLaborEntry`.
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.9 Add `tenantId String?` to `TicketPartEntry`
      **File**: `prisma/schema.prisma`
      Add nullable `tenantId` field plus relation and index to `TicketPartEntry`.
      **Complexity**: S
      **Dependencies**: none

- [ ] 1.10 Add 9 new back-relation fields to `Tenant` model
      **File**: `prisma/schema.prisma`
      In the `Tenant` model relations block, add:
      `odometerLogs OdometerLog[]`
      `workOrderItems WorkOrderItem[]`
      `workOrderExpenses WorkOrderExpense[]`
      `workOrderApprovals WorkOrderApproval[]`
      `expenseAuditLogs ExpenseAuditLog[]`
      `invoiceItems InvoiceItem[]`
      `purchaseOrderItems PurchaseOrderItem[]`
      `ticketLaborEntries TicketLaborEntry[]`
      `ticketPartEntries TicketPartEntry[]`
      **Complexity**: S
      **Dependencies**: 1.1–1.9

---

## Phase 2 — Prisma Migration Phase 1 (add nullable columns)

- [ ] 2.1 Generate and apply the "Phase 1 nullable" Prisma migration
      **Command**: `pnpm prisma migrate dev --name add_tenant_id_nullable_child_models`
      This creates and runs SQL that ALTERs the 9 tables to add `tenantId VARCHAR NULL` columns. Verify the generated `migration.sql` contains exactly 9 `ALTER TABLE ... ADD COLUMN "tenantId" TEXT;` statements before committing.
      **File**: `prisma/migrations/<timestamp>_add_tenant_id_nullable_child_models/migration.sql` (auto-generated)
      **Complexity**: S
      **Dependencies**: 1.1–1.10

---

## Phase 3 — Backfill SQL

- [ ] 3.1 Backfill `tenantId` on `OdometerLog` via parent `Vehicle`
      **Execution method**: Run via `pnpm prisma:studio` SQL runner or direct `psql` against the Neon DB (use `DIRECT_URL`).

  ```sql
  UPDATE "OdometerLog" ol
  SET    "tenantId" = v."tenantId"
  FROM   "Vehicle" v
  WHERE  ol."vehicleId" = v.id
    AND  ol."tenantId"  IS NULL;
  ```

  Verify: `SELECT COUNT(*) FROM "OdometerLog" WHERE "tenantId" IS NULL;` → must return 0.
  **Complexity**: S
  **Dependencies**: 2.1

- [ ] 3.2 Backfill `tenantId` on `TicketLaborEntry` and `TicketPartEntry` via parent `InternalWorkTicket`

  ```sql
  UPDATE "TicketLaborEntry" tle
  SET    "tenantId" = iwt."tenantId"
  FROM   "InternalWorkTicket" iwt
  WHERE  tle."ticketId" = iwt.id
    AND  tle."tenantId"  IS NULL;

  UPDATE "TicketPartEntry" tpe
  SET    "tenantId" = iwt."tenantId"
  FROM   "InternalWorkTicket" iwt
  WHERE  tpe."ticketId" = iwt.id
    AND  tpe."tenantId"  IS NULL;
  ```

  Verify both counts are 0.
  **Complexity**: S
  **Dependencies**: 2.1

- [ ] 3.3 Backfill `tenantId` on `PurchaseOrderItem` via parent `PurchaseOrder`

  ```sql
  UPDATE "PurchaseOrderItem" poi
  SET    "tenantId" = po."tenantId"
  FROM   "PurchaseOrder" po
  WHERE  poi."purchaseOrderId" = po.id
    AND  poi."tenantId"        IS NULL;
  ```

  Verify count = 0.
  **Complexity**: S
  **Dependencies**: 2.1

- [ ] 3.4 Backfill `tenantId` on `InvoiceItem` via parent `Invoice`

  ```sql
  UPDATE "InvoiceItem" ii
  SET    "tenantId" = inv."tenantId"
  FROM   "Invoice" inv
  WHERE  ii."invoiceId"  = inv.id
    AND  ii."tenantId"   IS NULL;
  ```

  Verify count = 0.
  **Complexity**: S
  **Dependencies**: 2.1

- [ ] 3.5 Backfill `tenantId` on `WorkOrderItem`, `WorkOrderExpense`, `WorkOrderApproval`, `ExpenseAuditLog` via parent `WorkOrder` (execute last — largest tables)

  ```sql
  UPDATE "WorkOrderItem" woi
  SET    "tenantId" = wo."tenantId"
  FROM   "WorkOrder" wo
  WHERE  woi."workOrderId" = wo.id
    AND  woi."tenantId"    IS NULL;

  UPDATE "WorkOrderExpense" woe
  SET    "tenantId" = wo."tenantId"
  FROM   "WorkOrder" wo
  WHERE  woe."workOrderId" = wo.id
    AND  woe."tenantId"    IS NULL;

  UPDATE "WorkOrderApproval" woa
  SET    "tenantId" = wo."tenantId"
  FROM   "WorkOrder" wo
  WHERE  woa."workOrderId" = wo.id
    AND  woa."tenantId"    IS NULL;

  UPDATE "ExpenseAuditLog" eal
  SET    "tenantId" = wo."tenantId"
  FROM   "WorkOrder" wo
  WHERE  eal."workOrderId" = wo.id
    AND  eal."tenantId"    IS NULL;
  ```

  Verify all 4 counts = 0.
  **Complexity**: M
  **Dependencies**: 2.1

---

## Phase 4 — Prisma Migration Phase 3 (NOT NULL + indexes)

- [ ] 4.1 Update `prisma/schema.prisma`: change all 9 `tenantId String?` to `tenantId String` (NOT NULL)
      **File**: `prisma/schema.prisma`
      Change all 9 newly-added `tenantId String?` fields to `tenantId String` (remove the `?`). Also update the `Tenant?` relation to `Tenant` (non-nullable) on all 9 models.
      **Complexity**: S
      **Dependencies**: 3.1–3.5

- [ ] 4.2 Generate and apply the "Phase 3 NOT NULL + indexes" Prisma migration
      **Command**: `pnpm prisma migrate dev --name add_tenant_id_notnull_indexes_child_models`
      The generated SQL should contain 9 `ALTER TABLE ... ALTER COLUMN "tenantId" SET NOT NULL;` statements and CREATE INDEX statements matching the `@@index([tenantId])` directives.
      **Complexity**: S
      **Dependencies**: 4.1 (and all Phase 3 backfills must be complete; this will fail if any NULL remains)

---

## Phase 5 — API Route Hardening

- [ ] 5.1 Harden `GET /api/vehicles/odometer` — add direct `tenantId` filter
      **File**: `src/app/api/vehicles/odometer/route.ts`
      In the GET handler's `findMany` call, replace the indirect `vehicle: { tenantId: user.tenantId }` filter with a direct `tenantId: user.tenantId` top-level filter (now valid after migration).
      **Complexity**: S
      **Dependencies**: 4.2

- [ ] 5.2 Harden `POST /api/vehicles/odometer` — stamp `tenantId` on create
      **File**: `src/app/api/vehicles/odometer/route.ts`
      In the `prisma.odometerLog.create({ data: { ... } })` call, add `tenantId: user.tenantId` to the `data` object.
      **Complexity**: S
      **Dependencies**: 4.2

- [ ] 5.3 Harden `GET /api/maintenance/work-orders/[id]/items` — add tenant check before query
      **File**: `src/app/api/maintenance/work-orders/[id]/items/route.ts`
      The GET handler currently queries `workOrderItem.findMany` by `workOrderId` alone without authenticating first. Add `getCurrentUser()` call, then add `tenantId: user.tenantId` to the `where` clause of the `findMany`.
      **Complexity**: M
      **Dependencies**: 4.2

- [ ] 5.4 Harden `POST /api/maintenance/work-orders/[id]/items` — stamp `tenantId` on create
      **File**: `src/app/api/maintenance/work-orders/[id]/items/route.ts`
      In the `prisma.workOrderItem.create({ data: { ... } })` call, add `tenantId: user.tenantId` to the `data` object.
      **Complexity**: S
      **Dependencies**: 4.2

- [ ] 5.5 Harden `POST /api/maintenance/work-orders/[id]/expenses` — stamp `tenantId` on create
      **File**: `src/app/api/maintenance/work-orders/[id]/expenses/route.ts`
      The tenant check via parent WorkOrder already exists (hotfix applied). Add `tenantId: user.tenantId` to the `prisma.workOrderExpense.create({ data: { ... } })` call.
      **Complexity**: S
      **Dependencies**: 4.2

- [ ] 5.6 Add `tenantId` stamping for `WorkOrderApproval` and `ExpenseAuditLog` wherever they are created
      **File**: `src/app/api/maintenance/work-orders/[id]/route.ts` (and any other routes that call `workOrderApproval.create` or `expenseAuditLog.create` — confirm via grep)
      Search for all `prisma.workOrderApproval.create` and `prisma.expenseAuditLog.create` calls across the codebase. In each, add `tenantId: user.tenantId` to the data object.
      **Complexity**: M
      **Dependencies**: 4.2

- [ ] 5.7 Harden `POST /api/invoices` — stamp `tenantId` on `InvoiceItem` create
      **File**: `src/app/api/invoices/route.ts`
      Inside the transaction at the `tx.invoiceItem.create({ data: { ... } })` call (line ~224), add `tenantId: user.tenantId` to each `data` object in the `items.map(...)`.
      **Complexity**: S
      **Dependencies**: 4.2

- [ ] 5.8 Harden `POST /api/purchase-orders/[id]/items` — stamp `tenantId` on create
      **File**: `src/app/api/purchase-orders/[id]/items/route.ts`
      In `tx.purchaseOrderItem.create({ data: { ... } })` (line ~112), add `tenantId: user.tenantId` to the data object.
      **Complexity**: S
      **Dependencies**: 4.2

- [ ] 5.9 Harden `POST /api/internal-tickets` — stamp `tenantId` on `TicketLaborEntry` and `TicketPartEntry` creates
      **File**: `src/app/api/internal-tickets/route.ts`
      (a) In the nested `laborEntries: { create: [...] }` inside `tx.internalWorkTicket.create`, add `tenantId: user.tenantId` to each labor entry object.
      (b) In the `tx.ticketPartEntry.create({ data: { ... } })` call (line ~143), add `tenantId: user.tenantId` to the `data` object.
      **Complexity**: M
      **Dependencies**: 4.2

---

## Phase 6 — Seed File Updates

- [ ] 6.1 Update `prisma/seed-multitenancy.ts` — add `tenantId` to WorkOrder child model creates
      **File**: `prisma/seed-multitenancy.ts`
      Locate all calls that create `workOrderItem`, `workOrderExpense`, `workOrderApproval`, `expenseAuditLog` records. Add `tenantId: <parentWorkOrder.tenantId>` to each `data` object. The seed already has tenant IDs available as constants (`TENANT_1_ID`, `TENANT_2_ID`).
      **Complexity**: M
      **Dependencies**: 4.2

- [ ] 6.2 Update `prisma/seed-staging-demo.ts` — add `tenantId` to `WorkOrderItem`, `WorkOrderExpense`, and `OdometerLog` creates
      **File**: `prisma/seed-staging-demo.ts`
      (a) `seedWorkOrderItems` function (~line 1244): add `tenantId: ctx.tenantId` to `prisma.workOrderItem.create({ data: { ... } })`.
      (b) `seedWorkOrderExpenses` function (~line 1351): add `tenantId: ctx.tenantId` to `prisma.workOrderExpense.create({ data: { ... } })`.
      (c) `seedOdometerLogs` function (~line 932): add `tenantId: ctx.tenantId` to `prisma.odometerLog.create({ data: { ... } })`. Note the comment on line 866 says OdometerLog has no tenantId — this is intentional for this seed but will need updating post-migration.
      **Complexity**: M
      **Dependencies**: 4.2

- [ ] 6.3 Update `prisma/seed-financial-demo.ts` — add `tenantId` to `WorkOrderItem` and `InvoiceItem` creates
      **File**: `prisma/seed-financial-demo.ts`
      (a) `prisma.workOrderItem.create({ data: { ... } })` (~line 268): add `tenantId: tenant.id`.
      (b) `prisma.invoiceItem.create({ data: { ... } })` (~line 303): add `tenantId: tenant.id`.
      **Complexity**: S
      **Dependencies**: 4.2

---

## Phase 7 — Verification

- [ ] 7.1 SQL cross-tenant isolation check: verify no child row can be read from a different tenant
      Run the following SQL checks against the production/staging DB:

  ```sql
  -- All 9 models must have zero NULLs after Phase 3 migration
  SELECT 'OdometerLog'       AS model, COUNT(*) AS nulls FROM "OdometerLog"       WHERE "tenantId" IS NULL
  UNION ALL
  SELECT 'WorkOrderItem',              COUNT(*)           FROM "WorkOrderItem"      WHERE "tenantId" IS NULL
  UNION ALL
  SELECT 'WorkOrderExpense',           COUNT(*)           FROM "WorkOrderExpense"   WHERE "tenantId" IS NULL
  UNION ALL
  SELECT 'WorkOrderApproval',          COUNT(*)           FROM "WorkOrderApproval"  WHERE "tenantId" IS NULL
  UNION ALL
  SELECT 'ExpenseAuditLog',            COUNT(*)           FROM "ExpenseAuditLog"    WHERE "tenantId" IS NULL
  UNION ALL
  SELECT 'InvoiceItem',                COUNT(*)           FROM "InvoiceItem"        WHERE "tenantId" IS NULL
  UNION ALL
  SELECT 'PurchaseOrderItem',          COUNT(*)           FROM "PurchaseOrderItem"  WHERE "tenantId" IS NULL
  UNION ALL
  SELECT 'TicketLaborEntry',           COUNT(*)           FROM "TicketLaborEntry"   WHERE "tenantId" IS NULL
  UNION ALL
  SELECT 'TicketPartEntry',            COUNT(*)           FROM "TicketPartEntry"    WHERE "tenantId" IS NULL;
  -- All counts must be 0
  ```

  **Complexity**: S
  **Dependencies**: 3.1–3.5, 4.2

- [ ] 7.2 SQL cross-tenant consistency check: verify `tenantId` on child matches parent

  ```sql
  -- Sample checks (run for each model)
  SELECT COUNT(*) FROM "WorkOrderItem" woi
  JOIN "WorkOrder" wo ON woi."workOrderId" = wo.id
  WHERE woi."tenantId" <> wo."tenantId";
  -- Must return 0 for each model
  ```

  Repeat for all 8 remaining models using their respective parent join.
  **Complexity**: M
  **Dependencies**: 7.1

- [ ] 7.3 Run `pnpm type-check` — TypeScript must pass with zero errors
      **Command**: `pnpm type-check`
      Expected: exit code 0. Common failures: routes that reference `prisma.odometerLog.create` without the now-required `tenantId` field, or Prisma-generated types that now require the field.
      **Complexity**: S
      **Dependencies**: 5.1–5.9, 6.1–6.3

- [ ] 7.4 Run `pnpm build` — Next.js production build must succeed
      **Command**: `pnpm build`
      Expected: exit code 0, no TypeScript or Webpack errors. This validates all pages and API routes compile cleanly with the updated Prisma client types.
      **Complexity**: S
      **Dependencies**: 7.3

- [ ] 7.5 Run existing unit tests to confirm no regressions
      **Command**: `pnpm test` (or `npx jest --testPathPattern="multi-tenant-security|inventory-lifecycle|invoice-lifecycle|work-order-api"`)
      Key test files to pass:
  - `src/app/api/__tests__/multi-tenant-security.test.ts`
  - `src/app/api/invoices/__tests__/invoice-lifecycle.test.ts`
  - `src/app/api/inventory/__tests__/inventory-lifecycle.test.ts`
  - `src/app/api/maintenance/work-orders/__tests__/work-order-api.test.ts`
  - `src/app/api/purchase-orders/__tests__/purchase-order-lifecycle.test.ts`
    **Complexity**: M
    **Dependencies**: 7.4

---

## Summary

| Phase     | Tasks  | Focus                                               |
| --------- | ------ | --------------------------------------------------- |
| Phase 1   | 10     | Schema changes (prisma/schema.prisma)               |
| Phase 2   | 1      | Migration: add nullable columns to DB               |
| Phase 3   | 5      | Backfill SQL: populate tenantId from parents        |
| Phase 4   | 2      | Migration: enforce NOT NULL + indexes               |
| Phase 5   | 9      | API route hardening (where clauses + create stamps) |
| Phase 6   | 3      | Seed file updates                                   |
| Phase 7   | 5      | Verification (SQL + type-check + build + tests)     |
| **Total** | **35** |                                                     |

## Recommended Apply Batches

| Batch   | Tasks          | Notes                                                            |
| ------- | -------------- | ---------------------------------------------------------------- |
| Batch A | 1.1–1.10 + 2.1 | Schema edits + Phase 1 migration — no data risk                  |
| Batch B | 3.1–3.5        | Backfill SQL — run in order, verify each                         |
| Batch C | 4.1–4.2        | NOT NULL enforcement — only after batch B verifies clean         |
| Batch D | 5.1–5.9        | API hardening — can be done in parallel with D but must follow C |
| Batch E | 6.1–6.3        | Seed updates — independent of API changes, just needs schema     |
| Batch F | 7.1–7.5        | Full verification — run after all prior batches                  |
