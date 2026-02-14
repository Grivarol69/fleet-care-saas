import { describe, it, expect } from 'vitest';
import { WorkOrderStatus, UserRole } from '@prisma/client';

// Mock logic functions - In a real scenario these would be imported from src/lib/logic/...
// For this Level 1 test, we'll define the logic here or import if it existed.
// Since the user asked for "Level 1: Unit Logic", I assume we might need to CREATE the logic file too if it doesn't exist.
// Let's assume we are testing pure functions.

// --- Logic to Test (To be moved to src/lib/logic/work-order.ts) ---
export function canTransitionStatus(
  current: WorkOrderStatus,
  target: WorkOrderStatus,
  role: UserRole
): boolean {
  if (role === 'OWNER' || role === 'MANAGER') return true; // Simplified for Owner/Manager

  // Technician rules
  if (role === 'TECHNICIAN') {
    if (current === 'PENDING' && target === 'IN_PROGRESS') return true;
    if (current === 'IN_PROGRESS' && target === 'PENDING_APPROVAL') return true;
    if (current === 'IN_PROGRESS' && target === 'COMPLETED') return false; // Needs approval or specific flow
    return false;
  }

  return false;
}

export function calculateWorkOrderTotal(
  items: { unitPrice: number; quantity: number }[],
  taxRate = 0.19
): number {
  const subtotal = items.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  );
  return subtotal * (1 + taxRate);
}
// ------------------------------------------------------------------

describe('Work Order Logic - Unit Level', () => {
  describe('Status Transitions', () => {
    it('should allow Manager to transition anywhere', () => {
      expect(canTransitionStatus('PENDING', 'COMPLETED', 'MANAGER')).toBe(true);
    });

    it('should allow Technician to start work', () => {
      expect(canTransitionStatus('PENDING', 'IN_PROGRESS', 'TECHNICIAN')).toBe(
        true
      );
    });

    it('should NOT allow Technician to complete without approval logic', () => {
      expect(
        canTransitionStatus('IN_PROGRESS', 'COMPLETED', 'TECHNICIAN')
      ).toBe(false);
    });
  });

  describe('Financial Calculations', () => {
    it('should calculate total with tax correctly', () => {
      const items = [
        { unitPrice: 100, quantity: 2 }, // 200
        { unitPrice: 50, quantity: 1 }, // 50 -> Subtotal 250
      ];
      // 250 * 1.19 = 297.5
      expect(calculateWorkOrderTotal(items, 0.19)).toBe(297.5);
    });

    it('should handle empty items', () => {
      expect(calculateWorkOrderTotal([], 0.19)).toBe(0);
    });
  });
});
