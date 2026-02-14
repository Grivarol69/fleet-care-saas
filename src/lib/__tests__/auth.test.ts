import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentUser } from '../auth';
import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Auth Service (Multi-tenancy)', () => {
  const mockTenantId = 'org_123';
  const mockUserId = 'user_456';
  const mockEmail = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null if no user logged in (no userId)', async () => {
    (auth as any).mockResolvedValue({ userId: null });
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it('should return null if user has no active organization', async () => {
    (auth as any).mockResolvedValue({ userId: mockUserId, orgId: null });
    (currentUser as any).mockResolvedValue({
      emailAddresses: [{ emailAddress: mockEmail }],
    });
    // Mock DB returning null for SuperAdmin check
    (prisma.user.findFirst as any).mockResolvedValue(null);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it('should return user if found in DB', async () => {
    (auth as any).mockResolvedValue({
      userId: mockUserId,
      orgId: mockTenantId,
    });
    (currentUser as any).mockResolvedValue({
      emailAddresses: [{ emailAddress: mockEmail }],
    });

    const mockUser = {
      id: 'db_user_1',
      email: mockEmail,
      tenantId: mockTenantId,
      role: 'DRIVER',
    };
    // First call for SuperAdmin (returns null)
    // Second call for regular user (returns user)
    (prisma.user.findFirst as any)
      .mockResolvedValueOnce(null) // Not super admin
      .mockResolvedValueOnce(mockUser); // Found user

    const result = await getCurrentUser();
    expect(result).toEqual(
      expect.objectContaining({ id: 'db_user_1', isSuperAdmin: false })
    );
  });

  it('should retry once and return null if user NOT found in DB (Webhook latency)', async () => {
    (auth as any).mockResolvedValue({
      userId: mockUserId,
      orgId: mockTenantId,
    });
    (currentUser as any).mockResolvedValue({
      emailAddresses: [{ emailAddress: mockEmail }],
    });

    // Mock FindFirst to always return null
    (prisma.user.findFirst as any).mockResolvedValue(null);

    // Start the promise
    const promise = getCurrentUser();

    // Fast-forward time to skip the 1.5s delay
    await vi.advanceTimersByTimeAsync(1600);

    const result = await promise;

    expect(result).toBeNull();
    // Should be called 3 times:
    // 1. SuperAdmin check
    // 2. Initial check
    // 3. Retry check
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(3);
  });
});
