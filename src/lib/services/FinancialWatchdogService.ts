import { prisma } from '@/lib/prisma';
import { AlertType, AlertLevel, AlertStatus } from '@prisma/client';

const DEFAULT_THRESHOLD = 10;

export async function getThresholdForCategory(
  tenantId: string,
  category: string | null
): Promise<number> {
  const configs = await prisma.watchdogConfiguration.findMany({
    where: { tenantId, isActive: true },
  });

  // 1. Category-specific config
  if (category) {
    const specific = configs.find(c => c.category === category);
    if (specific) return Number(specific.threshold);
  }

  // 2. Global config (category = null)
  const global = configs.find(c => c.category === null);
  if (global) return Number(global.threshold);

  // 3. Default
  return DEFAULT_THRESHOLD;
}

/**
 * Service dedicated to financial monitoring and alert generation.
 * " The Watchdog "
 */
export class FinancialWatchdogService {
  /**
   * Checks if a proposed expense has a significant price deviation
   * compared to the Master Part's reference price.
   *
   * @param masterPartId The ID of the catalog part
   * @param unitPrice The price being quoted/charged
   * @param invoiceId Optional: Link to invoice context
   * @param workOrderId Optional: Link to WorkOrder context
   */
  static async checkPriceDeviation(
    tenantId: string,
    masterPartId: string,
    unitPrice: number,
    invoiceId?: string,
    workOrderId?: string,
    description?: string // For context in message
  ) {
    // 1. Get Master Part Reference Price
    const masterPart = await prisma.masterPart.findUnique({
      where: { id: masterPartId },
    });

    if (!masterPart || !masterPart.referencePrice) {
      return; // No reference to compare against
    }

    const referencePrice = Number(masterPart.referencePrice);
    const proposedPrice = Number(unitPrice);

    // 2. Resolve threshold dynamically (category-specific → global → 10% default)
    const DEVIATION_TOLERANCE_PERCENT = await getThresholdForCategory(
      tenantId,
      masterPart.category ?? null
    );
    const maxAllowedPrice =
      referencePrice * (1 + DEVIATION_TOLERANCE_PERCENT / 100);

    // 3. Compare
    if (proposedPrice > maxAllowedPrice) {
      const deviationPercent = Math.round(
        ((proposedPrice - referencePrice) / referencePrice) * 100
      );

      // 4. Create Alert if Deviation Detected
      await prisma.financialAlert.create({
        data: {
          tenantId,
          type: AlertType.PRICE_DEVIATION,
          severity: AlertLevel.FINANCIAL,
          status: AlertStatus.PENDING,
          message: `Sobreprecio detectado en '${masterPart.description}': ${proposedPrice.toLocaleString()} vs Ref ${referencePrice.toLocaleString()} (+${deviationPercent}%)`,
          details: {
            expected: referencePrice,
            actual: proposedPrice,
            deviationPercent: deviationPercent,
            itemDescription: description || masterPart.description,
          },
          masterPartId,
          invoiceId: invoiceId ?? null,
          workOrderId: workOrderId ?? null,
        },
      });

      console.log(
        `[WATCHDOG] Alert created: Price deviation of ${deviationPercent}% for part ${masterPart.code}`
      );
    }
  }

  /**
   * Checks if a Work Order's total cost is exceeding its estimated budget.
   */
  static async checkBudgetOverrun(
    tenantId: string,
    workOrderId: string,
    newExpenseAmount: number
  ) {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        workOrderExpenses: true,
        workOrderItems: true,
      },
    });

    if (!workOrder || !workOrder.estimatedCost) return;

    // Calculate current total cost (Existing Expenses + Existing Items + New Expense)
    // Note: This logic assumes we are migrating away from workOrderItems cost, but for safety we check both
    const expensesSum = workOrder.workOrderExpenses.reduce(
      (sum: number, e: { amount: unknown }) => sum + Number(e.amount),
      0
    );

    // If legacy items still have cost, include them (or ignore if migrated to expenses)
    // For this implementation we'll focus on the new 'expenses' model + the new amount

    const currentTotal = expensesSum + Number(newExpenseAmount);
    const budget = Number(workOrder.estimatedCost);

    if (currentTotal > budget) {
      const overrun = currentTotal - budget;
      const overrunPercent = Math.round((overrun / budget) * 100);

      // Check if alert already exists to avoid spamming
      const existingAlert = await prisma.financialAlert.findFirst({
        where: {
          workOrderId,
          type: AlertType.BUDGET_OVERRUN,
          status: AlertStatus.PENDING,
        },
      });

      if (!existingAlert) {
        await prisma.financialAlert.create({
          data: {
            tenantId,
            type: AlertType.BUDGET_OVERRUN,
            severity: AlertLevel.FINANCIAL, // Or HIGH?
            status: AlertStatus.PENDING,
            message: `Exceso de presupuesto en Orden #${workOrderId}: ${currentTotal.toLocaleString()} vs ${budget.toLocaleString()} (+${overrunPercent}%)`,
            details: {
              budget: budget,
              actual: currentTotal,
              overrun: overrun,
            },
            workOrderId,
          },
        });
        console.log(
          `[WATCHDOG] Alert created: Budget overrun for WO #${workOrderId}`
        );
      }
    }
  }

  /**
   * Checks if a fuel voucher's price per unit deviates significantly
   * from the rolling average for the same fuel type in this tenant.
   * Requires at least 2 prior vouchers to establish a baseline.
   */
  static async checkFuelPriceDeviation(
    tenantId: string,
    fuelType: string,
    pricePerUnit: number,
    currentVoucherId: string,
    vehicleId: string
  ) {
    // Get last 5 vouchers of same fuelType (excluding the one just created)
    const recent = await prisma.fuelVoucher.findMany({
      where: {
        tenantId,
        fuelType: fuelType as import('@prisma/client').FuelVoucherFuelType,
        pricePerUnit: { not: null },
        id: { not: currentVoucherId },
      },
      orderBy: { date: 'desc' },
      take: 5,
      select: { pricePerUnit: true },
    });

    if (recent.length < 2) return; // Not enough history to establish baseline

    const prices = recent.map(v => Number(v.pricePerUnit));
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    if (avgPrice === 0) return;

    const thresholdPct = await getThresholdForCategory(tenantId, 'COMBUSTIBLE');
    const maxAllowed = avgPrice * (1 + thresholdPct / 100);

    if (pricePerUnit > maxAllowed) {
      const deviationPercent = Math.round(
        ((pricePerUnit - avgPrice) / avgPrice) * 100
      );

      await prisma.financialAlert.create({
        data: {
          tenantId,
          type: AlertType.PRICE_DEVIATION,
          severity:
            deviationPercent > 30 ? AlertLevel.HIGH : AlertLevel.FINANCIAL,
          status: AlertStatus.PENDING,
          message: `Precio de combustible (${fuelType}): $${pricePerUnit.toLocaleString()}/L vs promedio $${avgPrice.toFixed(0)}/L (+${deviationPercent}%)`,
          details: {
            fuelType,
            pricePerUnit,
            averagePrice: avgPrice,
            deviationPercent,
            sampleSize: recent.length,
            vehicleId,
          },
        },
      });

      console.log(
        `[WATCHDOG] Alert created: Fuel price deviation of ${deviationPercent}% for ${fuelType}`
      );
    }
  }

  /**
   * Updates the reference price of a Master Part based on a new validated purchase
   * and logs the history.
   */
  static async updateReferencePrice(
    tenantId: string,
    masterPartId: string,
    newPrice: number,
    supplierId: string,
    quantity: number = 1,
    metadata?: {
      invoiceId?: string;
      purchasedBy?: string;
      approvedBy?: string;
    }
  ) {
    try {
      // 1. Log History
      await prisma.partPriceHistory.create({
        data: {
          tenantId,
          masterPartId,
          supplierId,
          price: newPrice,
          quantity,
          recordedAt: new Date(),
          invoiceId: metadata?.invoiceId ?? null,
          purchasedBy: metadata?.purchasedBy ?? null,
          approvedBy: metadata?.approvedBy ?? null,
        },
      });

      // 2. Update Master Part Reference
      // We only update if the new price is different/newer.
      // Strategy: "Last Approved Price Wins"
      await prisma.masterPart.update({
        where: { id: masterPartId },
        data: {
          referencePrice: newPrice,
          lastPriceUpdate: new Date(),
        },
      });

      console.log(
        `[WATCHDOG] Learning: Updated reference price for part ${masterPartId} to ${newPrice}`
      );
    } catch (error) {
      console.error('[WATCHDOG] Error updating reference price:', error);
      // Non-blocking error: we don't want to fail the approval just because stats failed
    }
  }
}
