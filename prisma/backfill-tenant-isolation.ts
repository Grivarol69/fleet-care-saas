/**
 * Backfill script: schema-tenant-isolation — Batch B
 *
 * Populates tenantId on 9 child models by joining through their parent models.
 * Run with: npx tsx prisma/backfill-tenant-isolation.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillResult {
  model: string;
  rowsUpdated: number;
  nullsAfter: number;
}

async function countNulls(tableName: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) AS count FROM "${tableName}" WHERE "tenantId" IS NULL`
  );
  return Number(result[0]?.count ?? 0n);
}

async function backfillModel(
  label: string,
  sql: string
): Promise<BackfillResult> {
  const nullsBefore = await countNulls(label);
  console.log(`[${label}] nulls before: ${nullsBefore}`);

  if (nullsBefore === 0) {
    console.log(`[${label}] nothing to do, skipping.`);
    return { model: label, rowsUpdated: 0, nullsAfter: 0 };
  }

  // executeRawUnsafe returns the number of affected rows
  const rowsUpdated = await prisma.$executeRawUnsafe(sql);
  const nullsAfter = await countNulls(label);

  console.log(`[${label}] updated: ${rowsUpdated}, nulls after: ${nullsAfter}`);
  return { model: label, rowsUpdated, nullsAfter };
}

async function main() {
  console.log('=== Backfill: schema-tenant-isolation — Batch B ===\n');

  const results: BackfillResult[] = [];

  // 1. OdometerLog — via Vehicle
  results.push(
    await backfillModel(
      'OdometerLog',
      `UPDATE "OdometerLog" ol SET "tenantId" = v."tenantId"
       FROM "Vehicle" v
       WHERE ol."vehicleId" = v.id AND ol."tenantId" IS NULL`
    )
  );

  // 2. WorkOrderItem — via WorkOrder
  results.push(
    await backfillModel(
      'WorkOrderItem',
      `UPDATE "WorkOrderItem" wi SET "tenantId" = wo."tenantId"
       FROM "WorkOrder" wo
       WHERE wi."workOrderId" = wo.id AND wi."tenantId" IS NULL`
    )
  );

  // 3. WorkOrderExpense — via WorkOrder
  results.push(
    await backfillModel(
      'WorkOrderExpense',
      `UPDATE "WorkOrderExpense" we SET "tenantId" = wo."tenantId"
       FROM "WorkOrder" wo
       WHERE we."workOrderId" = wo.id AND we."tenantId" IS NULL`
    )
  );

  // 4. WorkOrderApproval — via WorkOrder
  results.push(
    await backfillModel(
      'WorkOrderApproval',
      `UPDATE "WorkOrderApproval" wa SET "tenantId" = wo."tenantId"
       FROM "WorkOrder" wo
       WHERE wa."workOrderId" = wo.id AND wa."tenantId" IS NULL`
    )
  );

  // 5. ExpenseAuditLog — via WorkOrder
  results.push(
    await backfillModel(
      'ExpenseAuditLog',
      `UPDATE "ExpenseAuditLog" ea SET "tenantId" = wo."tenantId"
       FROM "WorkOrder" wo
       WHERE ea."workOrderId" = wo.id AND ea."tenantId" IS NULL`
    )
  );

  // 6. InvoiceItem — via Invoice
  results.push(
    await backfillModel(
      'InvoiceItem',
      `UPDATE "InvoiceItem" ii SET "tenantId" = inv."tenantId"
       FROM "Invoice" inv
       WHERE ii."invoiceId" = inv.id AND ii."tenantId" IS NULL`
    )
  );

  // 7. PurchaseOrderItem — via PurchaseOrder
  results.push(
    await backfillModel(
      'PurchaseOrderItem',
      `UPDATE "PurchaseOrderItem" poi SET "tenantId" = po."tenantId"
       FROM "PurchaseOrder" po
       WHERE poi."purchaseOrderId" = po.id AND poi."tenantId" IS NULL`
    )
  );

  // 8. TicketLaborEntry — via InternalWorkTicket
  results.push(
    await backfillModel(
      'TicketLaborEntry',
      `UPDATE "TicketLaborEntry" tle SET "tenantId" = iwt."tenantId"
       FROM "InternalWorkTicket" iwt
       WHERE tle."ticketId" = iwt.id AND tle."tenantId" IS NULL`
    )
  );

  // 9. TicketPartEntry — via InternalWorkTicket
  results.push(
    await backfillModel(
      'TicketPartEntry',
      `UPDATE "TicketPartEntry" tpe SET "tenantId" = iwt."tenantId"
       FROM "InternalWorkTicket" iwt
       WHERE tpe."ticketId" = iwt.id AND tpe."tenantId" IS NULL`
    )
  );

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n=== Backfill Summary ===');
  console.log(
    `${'Model'.padEnd(22)} ${'Rows Updated'.padStart(13)} ${'Nulls After'.padStart(12)}`
  );
  console.log('-'.repeat(50));

  let failed = false;
  for (const r of results) {
    const status = r.nullsAfter === 0 ? 'OK' : 'FAIL';
    console.log(
      `${r.model.padEnd(22)} ${String(r.rowsUpdated).padStart(13)} ${String(r.nullsAfter).padStart(12)}  [${status}]`
    );
    if (r.nullsAfter > 0) failed = true;
  }

  console.log('\n=== Verification ===');
  if (failed) {
    console.error(
      'FAILED: One or more models still have NULL tenantId rows after backfill.'
    );
    process.exit(1);
  } else {
    console.log('PASSED: All models have 0 NULL tenantId rows.');
  }
}

main()
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
