import { describe, it, expect } from 'vitest';
import {
  calculateAlertLevel,
  calculatePriorityScore,
  getEstimatedCost,
  validateWorkOrderClosure,
  isValidWorkOrderTransition,
} from '../maintenance-logic';

describe('calculateAlertLevel', () => {
  it('returns NONE for 5000 km', () => {
    expect(calculateAlertLevel(5000)).toBe('NONE');
  });

  it('returns NONE for exactly 2000 km', () => {
    expect(calculateAlertLevel(2000)).toBe('NONE');
  });

  it('returns UPCOMING for 1500 km', () => {
    expect(calculateAlertLevel(1500)).toBe('UPCOMING');
  });

  it('returns UPCOMING for exactly 1000 km', () => {
    expect(calculateAlertLevel(1000)).toBe('UPCOMING');
  });

  it('returns WARNING for 800 km', () => {
    expect(calculateAlertLevel(800)).toBe('WARNING');
  });

  it('returns WARNING for exactly 500 km', () => {
    expect(calculateAlertLevel(500)).toBe('WARNING');
  });

  it('returns CRITICAL for 200 km', () => {
    expect(calculateAlertLevel(200)).toBe('CRITICAL');
  });

  it('returns CRITICAL for 0 km', () => {
    expect(calculateAlertLevel(0)).toBe('CRITICAL');
  });

  it('returns CRITICAL for negative km (overdue)', () => {
    expect(calculateAlertLevel(-500)).toBe('CRITICAL');
  });
});

describe('calculatePriorityScore', () => {
  it('CRITICAL + CORRECTIVE + 30 days overdue = high score', () => {
    const score = calculatePriorityScore('CRITICAL', 'CORRECTIVE', 30);
    expect(score).toBeGreaterThan(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('UPCOMING + PREVENTIVE + 0 days = low score', () => {
    const score = calculatePriorityScore('UPCOMING', 'PREVENTIVE', 0);
    expect(score).toBeLessThan(30);
  });

  it('NONE + PREVENTIVE + 0 days = very low score', () => {
    const score = calculatePriorityScore('NONE', 'PREVENTIVE', 0);
    expect(score).toBeLessThan(10);
  });

  it('score is always between 0 and 100', () => {
    // Test extreme values
    const highScore = calculatePriorityScore('CRITICAL', 'CORRECTIVE', 1000);
    expect(highScore).toBeLessThanOrEqual(100);

    const lowScore = calculatePriorityScore('NONE', 'PREVENTIVE', 0);
    expect(lowScore).toBeGreaterThanOrEqual(0);
  });

  it('CORRECTIVE has higher score than PREVENTIVE (same level)', () => {
    const corrective = calculatePriorityScore('WARNING', 'CORRECTIVE', 5);
    const preventive = calculatePriorityScore('WARNING', 'PREVENTIVE', 5);
    expect(corrective).toBeGreaterThan(preventive);
  });
});

describe('getEstimatedCost - fallback chain', () => {
  it('uses MantItemVehiclePart cost when available (level 1)', () => {
    expect(getEstimatedCost(75000, 100000, 120000)).toBe(75000);
  });

  it('falls back to ProgramItem cost (level 2)', () => {
    expect(getEstimatedCost(null, 100000, 120000)).toBe(100000);
    expect(getEstimatedCost(0, 100000, 120000)).toBe(100000);
  });

  it('falls back to Alert cost (level 3)', () => {
    expect(getEstimatedCost(null, null, 120000)).toBe(120000);
    expect(getEstimatedCost(null, 0, 120000)).toBe(120000);
  });

  it('returns 0 when no cost available', () => {
    expect(getEstimatedCost(null, null, null)).toBe(0);
    expect(getEstimatedCost(0, 0, 0)).toBe(0);
    expect(getEstimatedCost(undefined, undefined, undefined)).toBe(0);
  });
});

describe('validateWorkOrderClosure', () => {
  it('allows closure when all items are COMPLETED', () => {
    const items = [
      { id: 1, status: 'COMPLETED', description: 'Item 1' },
      { id: 2, status: 'COMPLETED', description: 'Item 2' },
    ];
    const result = validateWorkOrderClosure(items);
    expect(result.canClose).toBe(true);
    expect(result.pendingItems).toHaveLength(0);
  });

  it('allows closure when items are COMPLETED or CANCELLED', () => {
    const items = [
      { id: 1, status: 'COMPLETED', description: 'Item 1' },
      { id: 2, status: 'CANCELLED', description: 'Item 2' },
    ];
    expect(validateWorkOrderClosure(items).canClose).toBe(true);
  });

  it('blocks closure when items are PENDING', () => {
    const items = [
      { id: 1, status: 'COMPLETED', description: 'Completed item' },
      { id: 2, status: 'PENDING', description: 'Pending item' },
    ];
    const result = validateWorkOrderClosure(items);
    expect(result.canClose).toBe(false);
    expect(result.pendingItems).toHaveLength(1);
    expect(result.pendingItems[0]!.id).toBe(2);
  });

  it('allows closure with no items (empty WO)', () => {
    expect(validateWorkOrderClosure([]).canClose).toBe(true);
  });

  it('blocks closure when items are IN_PROGRESS', () => {
    const items = [
      { id: 1, status: 'IN_PROGRESS', description: 'Working item' },
    ];
    const result = validateWorkOrderClosure(items);
    expect(result.canClose).toBe(false);
    expect(result.pendingItems).toHaveLength(1);
  });
});

describe('isValidWorkOrderTransition', () => {
  it('PENDING -> IN_PROGRESS is valid', () => {
    expect(isValidWorkOrderTransition('PENDING', 'IN_PROGRESS')).toBe(true);
  });

  it('PENDING -> CANCELLED is valid', () => {
    expect(isValidWorkOrderTransition('PENDING', 'CANCELLED')).toBe(true);
  });

  it('PENDING -> COMPLETED is invalid (cannot skip IN_PROGRESS)', () => {
    expect(isValidWorkOrderTransition('PENDING', 'COMPLETED')).toBe(false);
  });

  it('IN_PROGRESS -> COMPLETED is valid', () => {
    expect(isValidWorkOrderTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
  });

  it('IN_PROGRESS -> CANCELLED is valid', () => {
    expect(isValidWorkOrderTransition('IN_PROGRESS', 'CANCELLED')).toBe(true);
  });

  it('COMPLETED -> any is invalid (terminal state)', () => {
    expect(isValidWorkOrderTransition('COMPLETED', 'PENDING')).toBe(false);
    expect(isValidWorkOrderTransition('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(isValidWorkOrderTransition('COMPLETED', 'CANCELLED')).toBe(false);
  });

  it('CANCELLED -> any is invalid (terminal state)', () => {
    expect(isValidWorkOrderTransition('CANCELLED', 'PENDING')).toBe(false);
    expect(isValidWorkOrderTransition('CANCELLED', 'IN_PROGRESS')).toBe(false);
    expect(isValidWorkOrderTransition('CANCELLED', 'COMPLETED')).toBe(false);
  });
});
