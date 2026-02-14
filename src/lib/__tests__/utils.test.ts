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
    it('should format COP by default', () => {
      // Note: non-breaking space might be used by Intl
      const result = formatCurrency(1000);
      // We check for "COP" or "$" and the number format
      expect(result).toMatch(/\$|COP/);
      expect(result).toMatch(/1\.000/);
    });

    it('should format USD if specified', () => {
      // This depends on the locale 'es-CO' implementation of USD which might be "USD 1,000.00" or similar
      const result = formatCurrency(1000, 'USD');
      expect(result).toMatch(/USD|US\$/);
    });
  });
});
