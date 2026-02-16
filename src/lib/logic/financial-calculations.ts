/**
 * Pure financial calculation functions.
 * Extracted from API routes for testability.
 */

export function calculateSubtotal(
  items: Array<{ quantity: number | string; unitPrice: number | string }>
): number {
  return items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

export function calculateTotal(subtotal: number, taxAmount: number): number {
  return subtotal + taxAmount;
}

export function calculatePriceDeviation(
  referencePrice: number,
  actualPrice: number
): { deviationPercent: number; exceedsThreshold: boolean } {
  if (referencePrice === 0) {
    return { deviationPercent: 0, exceedsThreshold: false };
  }

  const deviationPercent = Math.round(
    ((actualPrice - referencePrice) / referencePrice) * 100
  );

  const DEVIATION_TOLERANCE_PERCENT = 10;
  const maxAllowed = referencePrice * (1 + DEVIATION_TOLERANCE_PERCENT / 100);
  const exceedsThreshold = actualPrice > maxAllowed;

  return { deviationPercent, exceedsThreshold };
}

export function calculateWeightedAverageCost(
  currentStock: number,
  currentAvgCost: number,
  newQuantity: number,
  newUnitCost: number
): number {
  if (newQuantity === 0) return currentAvgCost;

  const totalStock = currentStock + newQuantity;
  if (totalStock === 0) return 0;

  return (
    (currentStock * currentAvgCost + newQuantity * newUnitCost) / totalStock
  );
}

export function generateOrderNumber(
  year: number,
  sequentialNumber: number
): string {
  return `OC-${year}-${sequentialNumber.toString().padStart(6, '0')}`;
}

export function calculateBudgetOverrun(
  estimatedCost: number,
  actualExpenses: number
): { overrun: number; overrunPercent: number } {
  if (estimatedCost === 0) {
    return { overrun: actualExpenses, overrunPercent: 0 };
  }

  const overrun = Math.max(0, actualExpenses - estimatedCost);
  const overrunPercent =
    overrun > 0 ? Math.round((overrun / estimatedCost) * 100) : 0;

  return { overrun, overrunPercent };
}
