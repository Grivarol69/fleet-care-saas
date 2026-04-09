import { describe, it, expect } from 'vitest';
import { cn, formatCurrency } from '../utils';

describe('Shared Utils', () => {
  describe('cn (Tailwind Merge)', () => {
    it('should merge classes correctly', () => {
      expect(cn('p-4', 'bg-red-500')).toBe('p-4 bg-red-500');
    });

    it('should handle conditional classes', () => {
      expect(cn('p-4', true && 'bg-red-500', false && 'hidden')).toBe(
        'p-4 bg-red-500'
      );
    });

    it('should resolve conflicts (tailwind-merge)', () => {
      expect(cn('p-4 p-2')).toBe('p-2'); // Last one wins
    });
  });

  describe('formatCurrency', () => {
    it('formats COP with the project locale defaults', () => {
      expect(formatCurrency(1000)).toBe(
        new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(1000)
      );
    });

    it('formats the requested currency instead of always using COP', () => {
      expect(formatCurrency(1000, 'USD')).toBe(
        new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(1000)
      );
    });
  });
});
