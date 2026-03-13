import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentUser } from '../auth';
import { prisma } from '@/lib/prisma';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  clerkClient: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'dummy_user_id' }),
    },
    tenant: {
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'dummy_tenant_id' }),
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
    (clerkClient as any).mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi.fn().mockResolvedValue({ data: [] }),
      },
    });
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
      id: mockUserId,
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
      id: mockUserId,
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

  it('creates the tenant and user just in time when Clerk session exists but DB sync is missing', async () => {
    (auth as any).mockResolvedValue({
      userId: mockUserId,
      orgId: mockTenantId,
    });
    (currentUser as any).mockResolvedValue({
      id: mockUserId,
      firstName: null,
      lastName: null,
      emailAddresses: [{ emailAddress: mockEmail }],
    });

    // Mock FindFirst to always return null
    (prisma.user.findFirst as any).mockResolvedValue(null);

    const result = await getCurrentUser();

    expect(result).not.toBeNull();
    expect(result?.id).toBe('dummy_user_id');
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: mockTenantId },
    });
    expect(prisma.tenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: mockTenantId,
        slug: mockTenantId.toLowerCase(),
        onboardingStatus: 'PENDING',
      }),
    });
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: mockUserId,
        email: mockEmail,
        tenantId: mockTenantId,
        role: 'OWNER',
        isActive: true,
      }),
    });
  });
});
