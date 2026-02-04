
import { prisma } from "@/lib/prisma";
import { AlertType, AlertLevel, AlertStatus } from "@prisma/client";

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
        workOrderId?: number,
        description?: string // For context in message
    ) {
        // 1. Get Master Part Reference Price
        const masterPart = await prisma.masterPart.findUnique({
            where: { id: masterPartId }
        });

        if (!masterPart || !masterPart.referencePrice) {
            return; // No reference to compare against
        }

        const referencePrice = Number(masterPart.referencePrice);
        const proposedPrice = Number(unitPrice);

        // 2. Define Threshold (e.g., 10% tolerance)
        const DEVIATION_TOLERANCE_PERCENT = 10;
        const maxAllowedPrice = referencePrice * (1 + (DEVIATION_TOLERANCE_PERCENT / 100));

        // 3. Compare
        if (proposedPrice > maxAllowedPrice) {
            const deviationPercent = Math.round(((proposedPrice - referencePrice) / referencePrice) * 100);

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
                        itemDescription: description || masterPart.description
                    },
                    masterPartId,
                    invoiceId: invoiceId ?? null,
                    workOrderId: workOrderId ?? null,
                }
            });

            console.log(`[WATCHDOG] Alert created: Price deviation of ${deviationPercent}% for part ${masterPart.code}`);
        }
    }

    /**
     * Checks if a Work Order's total cost is exceeding its estimated budget.
     */
    static async checkBudgetOverrun(
        tenantId: string,
        workOrderId: number,
        newExpenseAmount: number
    ) {
        const workOrder = await prisma.workOrder.findUnique({
            where: { id: workOrderId },
            include: {
                workOrderExpenses: true,
                workOrderItems: true
            }
        });

        if (!workOrder || !workOrder.estimatedCost) return;

        // Calculate current total cost (Existing Expenses + Existing Items + New Expense)
        // Note: This logic assumes we are migrating away from workOrderItems cost, but for safety we check both
        const expensesSum = workOrder.workOrderExpenses.reduce((sum: number, e: { amount: unknown }) => sum + Number(e.amount), 0);

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
                    status: AlertStatus.PENDING
                }
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
                            overrun: overrun
                        },
                        workOrderId
                    }
                });
                console.log(`[WATCHDOG] Alert created: Budget overrun for WO #${workOrderId}`);
            }
        }
    }
}
