/**
 * Fuel Analytics Engine
 *
 * Pure computation functions for per-vehicle fuel efficiency (L/100 km)
 * and anomaly detection. No classes — all standalone exported functions.
 *
 * Data source: FuelVoucher.odometer (primary), OdometerLog fallback (±3 days).
 * No schema changes required.
 */

// ============================================================
// TYPES
// ============================================================

export type FuelVoucherInput = {
  id: string;
  date: Date;
  odometer: number;
  /** quantity in liters (Decimal stored as number/string) */
  quantity: number | string;
  /** totalAmount (Decimal stored as number/string, nullable) */
  totalAmount: number | string | null;
};

export type OdometerLogInput = {
  id: string;
  vehicleId: string;
  recordedAt: Date;
  kilometers: number | null;
};

/**
 * A consecutive pair of FuelVoucher records used to compute interval efficiency.
 */
export type FuelPair = {
  fromVoucherId: string;
  toVoucherId: string;
  fromDate: Date;
  toDate: Date;
  /** Resolved odometer at the previous (from) voucher */
  fromOdometer: number;
  /** Resolved odometer at the current (to) voucher */
  toOdometer: number;
  /** km driven between the two fills */
  km: number;
  /** liters filled at the current (to) voucher */
  liters: number;
  /** cost of the current (to) voucher (0 if not recorded) */
  cost: number;
  /** L/100 km = (liters / km) * 100 */
  efficiency: number;
  /** Month string YYYY-MM of the current (to) voucher */
  month: string;
  anomaly?: AnomalyKind;
};

export type AnomalyKind = 'HIGH_CONSUMPTION' | 'INCONSISTENT_ODOMETER';

export type MonthlyEfficiency = {
  month: string; // YYYY-MM
  avgEfficiency: number; // avg L/100km
  totalLiters: number;
  totalCost: number;
  pairCount: number;
  anomaly: AnomalyFlag | null;
};

export type AnomalyFlag = {
  kind: AnomalyKind;
  message: string;
  /** For HIGH_CONSUMPTION: how much % above baseline */
  percentAbove?: number;
};

export type FuelAnalyticsResult = {
  vehicleId: string;
  vehiclePlate: string;
  vehicleBrand: string;
  from: string;
  to: string;
  /** Average L/100km across the whole period */
  avgEfficiency: number | null;
  totalLiters: number;
  totalCost: number;
  /** Baseline L/100km (rolling 90-day average) — null if < 3 pairs */
  baseline: number | null;
  monthly: MonthlyEfficiency[];
  anomalies: AnomalyFlag[];
  /** How many pairs were skipped due to missing odometer */
  skippedPairs: number;
};

// ============================================================
// CONSTANTS
// ============================================================

const ANOMALY_THRESHOLD = 0.20; // 20% above baseline
const BASELINE_DAYS = 90;
const MAX_KM_BETWEEN_FILLS = 5000;
const ODOMETER_FALLBACK_DAYS = 3;

// ============================================================
// HELPERS
// ============================================================

function toYYYYMM(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'string' ? parseFloat(v) : v;
}

// ============================================================
// TASK 1.3 — resolveOdometer
// ============================================================

/**
 * Resolves the effective odometer value for a voucher.
 * Returns voucher.odometer if > 0, else looks for the nearest OdometerLog
 * within ±ODOMETER_FALLBACK_DAYS for the same vehicle.
 * Returns null if no usable value found (pair will be skipped).
 */
export function resolveOdometer(
  voucher: FuelVoucherInput,
  odometerLogs: OdometerLogInput[]
): number | null {
  if (voucher.odometer > 0) return voucher.odometer;

  // Find nearest OdometerLog within ±3 days
  let best: { log: OdometerLogInput; diffDays: number } | null = null;
  for (const log of odometerLogs) {
    if (log.kilometers === null || log.kilometers <= 0) continue;
    const diff = daysBetween(log.recordedAt, voucher.date);
    if (diff <= ODOMETER_FALLBACK_DAYS) {
      if (!best || diff < best.diffDays) {
        best = { log, diffDays: diff };
      }
    }
  }

  return best ? best.log.kilometers : null;
}

// ============================================================
// TASK 1.2 — computePairs
// ============================================================

/**
 * Builds consecutive FuelPair records from a sorted list of vouchers.
 * - Skips the first voucher (no prior reference).
 * - Skips pairs where km ≤ 0 (flags INCONSISTENT_ODOMETER).
 * - Skips pairs where km > MAX_KM_BETWEEN_FILLS (flags INCONSISTENT_ODOMETER).
 * - Skips pairs where either odometer resolves to null.
 *
 * Returns [validPairs, skippedCount].
 */
export function computePairs(
  vouchers: FuelVoucherInput[],
  odometerLogs: OdometerLogInput[]
): { pairs: FuelPair[]; skippedPairs: number } {
  // Sort by date ASC
  const sorted = [...vouchers].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const pairs: FuelPair[] = [];
  let skippedPairs = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const fromOdometer = resolveOdometer(prev, odometerLogs);
    const toOdometer = resolveOdometer(curr, odometerLogs);

    if (fromOdometer === null || toOdometer === null) {
      skippedPairs++;
      continue;
    }

    const km = toOdometer - fromOdometer;
    const liters = toNumber(curr.quantity);
    const cost = toNumber(curr.totalAmount);

    // INCONSISTENT_ODOMETER check
    if (km <= 0 || km > MAX_KM_BETWEEN_FILLS) {
      // Still record as a pair with anomaly flag for reference, but exclude from efficiency calcs
      pairs.push({
        fromVoucherId: prev.id,
        toVoucherId: curr.id,
        fromDate: new Date(prev.date),
        toDate: new Date(curr.date),
        fromOdometer,
        toOdometer,
        km,
        liters,
        cost,
        efficiency: 0, // invalid
        month: toYYYYMM(new Date(curr.date)),
        anomaly: 'INCONSISTENT_ODOMETER',
      });
      continue;
    }

    const efficiency = liters > 0 ? (liters / km) * 100 : 0;

    pairs.push({
      fromVoucherId: prev.id,
      toVoucherId: curr.id,
      fromDate: new Date(prev.date),
      toDate: new Date(curr.date),
      fromOdometer,
      toOdometer,
      km,
      liters,
      cost,
      efficiency,
      month: toYYYYMM(new Date(curr.date)),
    });
  }

  return { pairs, skippedPairs };
}

// ============================================================
// TASK 1.4 — aggregateByMonth
// ============================================================

/**
 * Groups valid pairs (no INCONSISTENT_ODOMETER anomaly) by calendar month.
 * Computes avg L/100km, total liters, total cost per month.
 * Months with only INCONSISTENT_ODOMETER pairs get pairCount=0 and avgEfficiency=0.
 */
export function aggregateByMonth(pairs: FuelPair[]): MonthlyEfficiency[] {
  const monthMap = new Map<
    string,
    { efficiencies: number[]; totalLiters: number; totalCost: number }
  >();

  for (const pair of pairs) {
    const key = pair.month;
    if (!monthMap.has(key)) {
      monthMap.set(key, { efficiencies: [], totalLiters: 0, totalCost: 0 });
    }
    const entry = monthMap.get(key)!;
    entry.totalLiters += pair.liters;
    entry.totalCost += pair.cost;

    // Only include valid pairs in efficiency average
    if (!pair.anomaly) {
      entry.efficiencies.push(pair.efficiency);
    }
  }

  const months: MonthlyEfficiency[] = [];
  for (const [month, data] of monthMap.entries()) {
    const avgEfficiency =
      data.efficiencies.length > 0
        ? data.efficiencies.reduce((s, e) => s + e, 0) / data.efficiencies.length
        : 0;

    months.push({
      month,
      avgEfficiency,
      totalLiters: data.totalLiters,
      totalCost: data.totalCost,
      pairCount: data.efficiencies.length,
      anomaly: null, // detectAnomalies fills this in
    });
  }

  // Sort chronologically
  return months.sort((a, b) => a.month.localeCompare(b.month));
}

// ============================================================
// TASK 1.5 — detectAnomalies
// ============================================================

/**
 * Computes a 90-day rolling baseline (average L/100km from valid pairs in last N days
 * relative to the last pair date). Requires ≥ 3 valid pairs to activate.
 *
 * Flags months where avgEfficiency > baseline * (1 + ANOMALY_THRESHOLD).
 * Also flags INCONSISTENT_ODOMETER if any pair in that month had km ≤ 0 or > MAX_KM.
 *
 * NOTE: IMPOSSIBLE_REFUEL check skipped — Vehicle has no tankCapacity field in schema.
 * TODO: IMPOSSIBLE_REFUEL — add check once Vehicle.tankCapacity is added to schema.
 */
export function detectAnomalies(
  monthly: MonthlyEfficiency[],
  pairs: FuelPair[]
): { monthly: MonthlyEfficiency[]; baseline: number | null; anomalies: AnomalyFlag[] } {
  // Valid pairs (non-anomaly) for baseline computation
  const validPairs = pairs.filter((p) => !p.anomaly && p.efficiency > 0);

  if (validPairs.length < 3) {
    // Mark INCONSISTENT_ODOMETER months only
    const anomalyMonths = new Set(
      pairs.filter((p) => p.anomaly === 'INCONSISTENT_ODOMETER').map((p) => p.month)
    );
    const updatedMonthly = monthly.map((m) => ({
      ...m,
      anomaly: anomalyMonths.has(m.month)
        ? ({ kind: 'INCONSISTENT_ODOMETER' as AnomalyKind, message: 'Odómetro inconsistente: km negativo o excesivo en este período' })
        : null,
    }));
    const collectedAnomalies = updatedMonthly
      .filter((m) => m.anomaly !== null)
      .map((m) => m.anomaly as AnomalyFlag);
    return { monthly: updatedMonthly, baseline: null, anomalies: collectedAnomalies };
  }

  // Compute baseline: rolling 90-day average relative to last pair date
  const lastPairDate = validPairs[validPairs.length - 1].toDate;
  const cutoff = new Date(lastPairDate);
  cutoff.setDate(cutoff.getDate() - BASELINE_DAYS);

  const baselinePairs = validPairs.filter((p) => p.toDate >= cutoff);
  const baseline =
    baselinePairs.length > 0
      ? baselinePairs.reduce((s, p) => s + p.efficiency, 0) / baselinePairs.length
      : validPairs.reduce((s, p) => s + p.efficiency, 0) / validPairs.length;

  // Build set of months with inconsistent odometer
  const inconsistentMonths = new Set(
    pairs.filter((p) => p.anomaly === 'INCONSISTENT_ODOMETER').map((p) => p.month)
  );

  const updatedMonthly = monthly.map((m) => {
    if (m.pairCount === 0) {
      // Month only has inconsistent pairs
      if (inconsistentMonths.has(m.month)) {
        return {
          ...m,
          anomaly: {
            kind: 'INCONSISTENT_ODOMETER' as AnomalyKind,
            message: 'Odómetro inconsistente: km negativo o excesivo en este período',
          } satisfies AnomalyFlag,
        };
      }
      return m;
    }

    const percentAbove = (m.avgEfficiency - baseline) / baseline;
    if (percentAbove > ANOMALY_THRESHOLD) {
      return {
        ...m,
        anomaly: {
          kind: 'HIGH_CONSUMPTION' as AnomalyKind,
          message: `Consumo ${Math.round(percentAbove * 100)}% por encima del promedio histórico`,
          percentAbove: Math.round(percentAbove * 100),
        } satisfies AnomalyFlag,
      };
    }

    if (inconsistentMonths.has(m.month)) {
      return {
        ...m,
        anomaly: {
          kind: 'INCONSISTENT_ODOMETER' as AnomalyKind,
          message: 'Odómetro inconsistente: km negativo o excesivo en este período',
        } satisfies AnomalyFlag,
      };
    }

    return m;
  });

  const anomalies = updatedMonthly
    .filter((m) => m.anomaly !== null)
    .map((m) => m.anomaly as AnomalyFlag);

  return { monthly: updatedMonthly, baseline, anomalies };
}

// ============================================================
// TASK 1.6 — analyzeFuelEfficiency (top-level composer)
// ============================================================

/**
 * Composes computePairs → aggregateByMonth → detectAnomalies into a single result.
 */
export function analyzeFuelEfficiency(
  vehicleId: string,
  vehiclePlate: string,
  vehicleBrand: string,
  from: string,
  to: string,
  vouchers: FuelVoucherInput[],
  odometerLogs: OdometerLogInput[]
): FuelAnalyticsResult {
  const { pairs, skippedPairs } = computePairs(vouchers, odometerLogs);
  const monthly = aggregateByMonth(pairs);
  const { monthly: monthlyWithAnomalies, baseline, anomalies } = detectAnomalies(monthly, pairs);

  const validPairs = pairs.filter((p) => !p.anomaly);
  const totalLiters = validPairs.reduce((s, p) => s + p.liters, 0);
  const totalCost = validPairs.reduce((s, p) => s + p.cost, 0);
  const avgEfficiency =
    validPairs.length > 0
      ? validPairs.reduce((s, p) => s + p.efficiency, 0) / validPairs.length
      : null;

  return {
    vehicleId,
    vehiclePlate,
    vehicleBrand,
    from,
    to,
    avgEfficiency,
    totalLiters,
    totalCost,
    baseline,
    monthly: monthlyWithAnomalies,
    anomalies,
    skippedPairs,
  };
}
