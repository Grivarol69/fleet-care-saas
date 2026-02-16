import { describe, it, expect } from 'vitest';
import {
  calculateSubtotal,
  calculateTax,
  calculateTotal,
  calculatePriceDeviation,
  calculateWeightedAverageCost,
  generateOrderNumber,
  calculateBudgetOverrun,
} from '../financial-calculations';

describe('calculateSubtotal', () => {
  it('returns 0 for empty items', () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  it('calculates single item correctly', () => {
    expect(calculateSubtotal([{ quantity: 2, unitPrice: 50000 }])).toBe(100000);
  });

  it('calculates multiple items correctly', () => {
    const items = [
      { quantity: 2, unitPrice: 50000 },
      { quantity: 1, unitPrice: 100000 },
      { quantity: 3, unitPrice: 30000 },
    ];
    expect(calculateSubtotal(items)).toBe(290000);
  });

  it('handles string values (from form inputs)', () => {
    expect(calculateSubtotal([{ quantity: '2', unitPrice: '50000' }])).toBe(100000);
  });
});

describe('calculateTax', () => {
  it('calculates 19% IVA correctly', () => {
    expect(calculateTax(100000, 19)).toBe(19000);
  });

  it('returns 0 for 0% rate', () => {
    expect(calculateTax(100000, 0)).toBe(0);
  });
});

describe('calculateTotal', () => {
  it('sums subtotal and tax', () => {
    expect(calculateTotal(100000, 19000)).toBe(119000);
  });
});

describe('calculatePriceDeviation', () => {
  it('reports no deviation within 10%', () => {
    const result = calculatePriceDeviation(100000, 109000);
    expect(result.deviationPercent).toBe(9);
    expect(result.exceedsThreshold).toBe(false);
  });

  it('reports exactly 10% as within threshold', () => {
    const result = calculatePriceDeviation(100000, 110000);
    expect(result.deviationPercent).toBe(10);
    expect(result.exceedsThreshold).toBe(false);
  });

  it('reports 11% as exceeding threshold', () => {
    const result = calculatePriceDeviation(100000, 111000);
    expect(result.deviationPercent).toBe(11);
    expect(result.exceedsThreshold).toBe(true);
  });

  it('reports 20% deviation correctly', () => {
    const result = calculatePriceDeviation(100000, 120000);
    expect(result.deviationPercent).toBe(20);
    expect(result.exceedsThreshold).toBe(true);
  });

  it('handles price lower than reference (no threshold exceeded)', () => {
    const result = calculatePriceDeviation(100000, 80000);
    expect(result.deviationPercent).toBe(-20);
    expect(result.exceedsThreshold).toBe(false);
  });

  it('handles reference price of 0', () => {
    const result = calculatePriceDeviation(0, 50000);
    expect(result.deviationPercent).toBe(0);
    expect(result.exceedsThreshold).toBe(false);
  });
});

describe('calculateWeightedAverageCost', () => {
  it('calculates correct WAC for mixed stock', () => {
    // 100 units at $50, add 50 units at $80
    // WAC = (100*50 + 50*80) / 150 = (5000+4000)/150 = 60
    const result = calculateWeightedAverageCost(100, 50, 50, 80);
    expect(result).toBeCloseTo(60, 2);
  });

  it('first purchase sets average cost to unit cost', () => {
    const result = calculateWeightedAverageCost(0, 0, 50, 80);
    expect(result).toBe(80);
  });

  it('adding 0 units does not change average cost', () => {
    const result = calculateWeightedAverageCost(100, 50, 0, 80);
    expect(result).toBe(50);
  });

  it('handles equal costs (no change)', () => {
    const result = calculateWeightedAverageCost(100, 50, 50, 50);
    expect(result).toBe(50);
  });
});

describe('generateOrderNumber', () => {
  it('generates correct format OC-YYYY-000001', () => {
    expect(generateOrderNumber(2026, 1)).toBe('OC-2026-000001');
  });

  it('pads number to 6 digits', () => {
    expect(generateOrderNumber(2026, 42)).toBe('OC-2026-000042');
    expect(generateOrderNumber(2026, 999)).toBe('OC-2026-000999');
  });

  it('handles large numbers', () => {
    expect(generateOrderNumber(2026, 999999)).toBe('OC-2026-999999');
  });
});

describe('calculateBudgetOverrun', () => {
  it('returns 0 overrun when within budget', () => {
    const result = calculateBudgetOverrun(500000, 400000);
    expect(result.overrun).toBe(0);
    expect(result.overrunPercent).toBe(0);
  });

  it('calculates overrun correctly', () => {
    const result = calculateBudgetOverrun(500000, 600000);
    expect(result.overrun).toBe(100000);
    expect(result.overrunPercent).toBe(20);
  });

  it('handles exact budget match', () => {
    const result = calculateBudgetOverrun(500000, 500000);
    expect(result.overrun).toBe(0);
    expect(result.overrunPercent).toBe(0);
  });

  it('handles 0 estimated cost', () => {
    const result = calculateBudgetOverrun(0, 100000);
    expect(result.overrun).toBe(100000);
    expect(result.overrunPercent).toBe(0);
  });
});
