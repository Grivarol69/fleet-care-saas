
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
        tenant: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        user: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
    },
}));

describe('Auth Service (Multi-tenancy)', () => {
    const mockTenantId = 'org_123';
    const mockUserId = 'user_456';
    const mockEmail = 'test@example.com';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should sync new tenant from Clerk if not exists in Prisma', async () => {
        // 1. Arrange - Simulate Clerk auth returning an Org that doesn't exist in DB
        (auth as any).mockResolvedValue({ userId: mockUserId, orgId: mockTenantId, orgRole: 'org:admin' });

        (currentUser as any).mockResolvedValue({
            id: mockUserId,
            emailAddresses: [{ emailAddress: mockEmail }],
            firstName: 'Guille',
            lastName: 'Riva',
            organizationMemberships: [{
                organization: { id: mockTenantId, name: 'Fleet Care' }
            }]
        });

        (prisma.tenant.findUnique as any).mockResolvedValue(null); // Tenant not found in DB
        (prisma.tenant.create as any).mockResolvedValue({ id: mockTenantId, name: 'Fleet Care' });
        (prisma.user.findFirst as any).mockResolvedValue({ id: 'db_user_1', tenantId: mockTenantId });

        // 2. Act
        await getCurrentUser();

        // 3. Assert
        expect(prisma.tenant.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                id: mockTenantId,
                name: 'Fleet Care',
            }),
        });
    });

    it('should return null if user has no active organization in Clerk', async () => {
        // 1. Arrange - Clerk auth returns no orgId
        (auth as any).mockResolvedValue({ userId: mockUserId, orgId: null });

        // 2. Act
        const result = await getCurrentUser();

        // 3. Assert
        expect(result).toBeNull();
        expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    });

    it('should auto-create user mapped to the correct tenant', async () => {
        // 1. Arrange - Tenant exists, but User doesn't
        (auth as any).mockResolvedValue({ userId: mockUserId, orgId: mockTenantId, orgRole: 'org:driver' });

        (currentUser as any).mockResolvedValue({
            id: mockUserId,
            emailAddresses: [{ emailAddress: mockEmail }],
        });

        (prisma.tenant.findUnique as any).mockResolvedValue({ id: mockTenantId });
        (prisma.user.findFirst as any).mockResolvedValue(null); // User not found

        (prisma.user.create as any).mockResolvedValue({
            id: 'new_user',
            email: mockEmail,
            tenantId: mockTenantId,
            role: 'DRIVER'
        });

        // 2. Act
        const user = await getCurrentUser();

        // 3. Assert
        expect(prisma.user.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                email: mockEmail,
                tenantId: mockTenantId, // CRITICAL: Ensure user is created in the correct tenant
                role: 'DRIVER', // Mapped from 'org:driver'
            }),
        });
        expect(user?.tenantId).toBe(mockTenantId);
    });
});
