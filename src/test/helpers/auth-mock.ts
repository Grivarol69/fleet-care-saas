import { vi } from 'vitest';
import { getCurrentUser } from '@/lib/auth';

/**
 * Auth mock helpers for integration tests.
 *
 * IMPORTANT: The test file must call vi.mock('@/lib/auth') BEFORE using these helpers.
 * Example:
 *   vi.mock('@/lib/auth', () => ({
 *     getCurrentUser: vi.fn(),
 *     isSuperAdmin: vi.fn().mockResolvedValue(false),
 *   }));
 */

type MockUser = {
  id: string;
  tenantId: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isSuperAdmin?: boolean;
  isActive?: boolean;
};

/**
 * Mock getCurrentUser to return a specific user.
 */
export function mockAuthAsUser(user: MockUser) {
  const mockUser = {
    id: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email ?? 'test@test.com',
    firstName: user.firstName ?? 'Test',
    lastName: user.lastName ?? 'User',
    isSuperAdmin: user.isSuperAdmin ?? false,
    isActive: user.isActive ?? true,
    avatar: null,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
  return mockUser;
}

/**
 * Mock getCurrentUser to return null (unauthenticated).
 */
export function mockAuthAsUnauthenticated() {
  (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

/**
 * Mock getCurrentUser to return a super admin user.
 */
export function mockAuthAsSuperAdmin(user: Omit<MockUser, 'isSuperAdmin'>) {
  return mockAuthAsUser({ ...user, isSuperAdmin: true, role: 'SUPER_ADMIN' });
}
