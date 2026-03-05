'use strict';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyKnowledgeBaseToTenant, type CopyKBOptions } from '@/actions/copy-kb-to-tenant';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    vehicleBrand: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    vehicleLine: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    vehicleType: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    mantCategory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    mantItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    maintenanceTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    maintenancePackage: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    packageItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('copyKnowledgeBaseToTenant', () => {
  const testTenantId = 'test-tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty counts when no options are selected', async () => {
    const options: CopyKBOptions = {
      vehicleMetadata: false,
      maintenanceItems: false,
      lineIds: [],
    };

    const result = await copyKnowledgeBaseToTenant(testTenantId, options);

    expect(result.success).toBe(true);
    expect(result.counts).toEqual({
      brands: 0,
      lines: 0,
      types: 0,
      categories: 0,
      items: 0,
      templates: 0,
      packages: 0,
      packageItems: 0,
    });
  });

  it('returns type CopyKBResult with success true', async () => {
    const options: CopyKBOptions = {
      vehicleMetadata: false,
      maintenanceItems: false,
      lineIds: [],
    };

    const result = await copyKnowledgeBaseToTenant(testTenantId, options);

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('counts');
    expect(result.success).toBe(true);
  });

  it('has correct counts structure when copying vehicle metadata', async () => {
    const mockBrand = { id: 'brand-1', name: 'Toyota', tenantId: null };
    const mockLine = { id: 'line-1', name: 'Hilux', brandId: 'brand-1', brand: mockBrand, tenantId: null };
    const mockType = { id: 'type-1', name: 'Camioneta', tenantId: null };

    const mockTransaction = vi.fn((callback) => callback(prisma));
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(mockTransaction);

    (prisma.vehicleBrand.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockBrand]);
    (prisma.vehicleBrand.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.vehicleBrand.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockBrand, id: 'new-brand-1', tenantId: testTenantId });

    (prisma.vehicleLine.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockLine]);
    (prisma.vehicleLine.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.vehicleLine.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockLine, id: 'new-line-1', tenantId: testTenantId });

    (prisma.vehicleType.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockType]);
    (prisma.vehicleType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.vehicleType.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockType, id: 'new-type-1', tenantId: testTenantId });

    const options: CopyKBOptions = {
      vehicleMetadata: true,
      maintenanceItems: false,
      lineIds: [],
    };

    const result = await copyKnowledgeBaseToTenant(testTenantId, options);

    expect(result.success).toBe(true);
    expect(result.counts).toBeDefined();
    expect(result.counts?.brands).toBeGreaterThan(0);
    expect(result.counts?.lines).toBeGreaterThan(0);
    expect(result.counts?.types).toBeGreaterThan(0);
  });

  it('has correct counts structure when copying maintenance items', async () => {
    const mockCategory = { id: 'cat-1', name: 'Motor', description: 'Oil changes', tenantId: null };
    const mockItem = { 
      id: 'item-1', 
      name: 'Cambio de aceite', 
      description: 'Oil and filter change', 
      mantType: 'PREVENTIVE', 
      categoryId: 'cat-1', 
      type: 'SERVICE', 
      tenantId: null 
    };

    const mockTransaction = vi.fn((callback) => callback(prisma));
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(mockTransaction);

    (prisma.mantCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockCategory]);
    (prisma.mantCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.mantCategory.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockCategory, id: 'new-cat-1', tenantId: testTenantId });

    (prisma.mantItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockItem]);
    (prisma.mantItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.mantItem.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockItem, id: 'new-item-1', tenantId: testTenantId });

    const options: CopyKBOptions = {
      vehicleMetadata: false,
      maintenanceItems: true,
      lineIds: [],
    };

    const result = await copyKnowledgeBaseToTenant(testTenantId, options);

    expect(result.success).toBe(true);
    expect(result.counts).toBeDefined();
    expect(result.counts?.categories).toBeGreaterThan(0);
    expect(result.counts?.items).toBeGreaterThan(0);
  });

  it('returns error object on failure', async () => {
    const mockTransaction = vi.fn((callback) => callback(prisma));
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(mockTransaction);

    (prisma.vehicleBrand.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Database error'));

    const options: CopyKBOptions = {
      vehicleMetadata: true,
      maintenanceItems: false,
      lineIds: [],
    };

    const result = await copyKnowledgeBaseToTenant(testTenantId, options);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
