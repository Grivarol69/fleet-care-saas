/**
 * Pure maintenance logic functions.
 * Extracted from MaintenanceAlertService for testability.
 */

export type AlertLevelResult = 'NONE' | 'UPCOMING' | 'WARNING' | 'CRITICAL';

/**
 * Determines alert level based on km remaining to maintenance.
 * Thresholds: 2000+ = NONE, 1000-2000 = UPCOMING, 500-1000 = WARNING, <500 = CRITICAL
 */
export function calculateAlertLevel(kmToMaintenance: number): AlertLevelResult {
  if (kmToMaintenance >= 2000) return 'NONE';
  if (kmToMaintenance >= 1000) return 'UPCOMING';
  if (kmToMaintenance >= 500) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Calculates a priority score (0-100) for an alert.
 * Higher score = more urgent.
 */
export function calculatePriorityScore(
  alertLevel: AlertLevelResult,
  mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE',
  daysOverdue: number
): number {
  let score = 0;

  // Base score from alert level
  switch (alertLevel) {
    case 'CRITICAL':
      score += 60;
      break;
    case 'WARNING':
      score += 40;
      break;
    case 'UPCOMING':
      score += 20;
      break;
    case 'NONE':
      score += 0;
      break;
  }

  // Bonus for corrective (more urgent than preventive)
  if (mantType === 'CORRECTIVE') {
    score += 15;
  } else if (mantType === 'PREVENTIVE') {
    score += 5;
  }

  // Bonus for days overdue (max 25 points)
  score += Math.min(25, Math.floor(daysOverdue / 2));

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Gets the estimated cost using a fallback chain:
 * 1. MantItemVehiclePart estimated cost (most specific)
 * 2. VehicleProgramItem estimated cost
 * 3. MaintenanceAlert estimated cost
 * 4. 0 (no estimate available)
 */
export function getEstimatedCost(
  mantItemVehiclePartCost?: number | null,
  programItemCost?: number | null,
  alertCost?: number | null
): number {
  if (mantItemVehiclePartCost != null && mantItemVehiclePartCost > 0) {
    return mantItemVehiclePartCost;
  }
  if (programItemCost != null && programItemCost > 0) {
    return programItemCost;
  }
  if (alertCost != null && alertCost > 0) {
    return alertCost;
  }
  return 0;
}

/**
 * Validates whether a work order can be closed.
 * Returns { canClose, pendingItems } where pendingItems lists
 * any items that are not COMPLETED or CANCELLED.
 */
export function validateWorkOrderClosure(
  items: Array<{ id: number; status: string; description: string }>
): { canClose: boolean; pendingItems: Array<{ id: number; description: string }> } {
  const pendingItems = items.filter(
    item => item.status !== 'COMPLETED' && item.status !== 'CANCELLED'
  );

  return {
    canClose: pendingItems.length === 0,
    pendingItems: pendingItems.map(item => ({
      id: item.id,
      description: item.description,
    })),
  };
}

/**
 * Validates a work order status transition.
 * Returns true if the transition is valid.
 */
export function isValidWorkOrderTransition(
  currentStatus: string,
  targetStatus: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    PENDING: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [], // Terminal state
    CANCELLED: [], // Terminal state
  };

  return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
}
