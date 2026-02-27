import { prisma } from '@/lib/prisma';
import type { Priority } from '@prisma/client';

/**
 * Test Data Factory
 * Creates realistic test data for integration tests.
 * Each factory returns the created object with its ID.
 * Uses timestamp + random suffix for unique slugs/emails.
 */

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ========================================
// TENANT & USER
// ========================================

export async function createTestTenant(
  overrides: Partial<{
    name: string;
    slug: string;
    country: string;
    currency: string;
  }> = {}
) {
  return prisma.tenant.create({
    data: {
      name: overrides.name ?? `Test Tenant ${uid()}`,
      slug: overrides.slug ?? `test-${uid()}`,
      country: overrides.country ?? 'CO',
      currency: overrides.currency ?? 'COP',
      subscriptionStatus: 'ACTIVE',
    },
  });
}

export async function createTestUser(
  tenantId: string,
  overrides: Partial<{
    email: string;
    role:
      | 'OWNER'
      | 'MANAGER'
      | 'TECHNICIAN'
      | 'PURCHASER'
      | 'DRIVER'
      | 'SUPER_ADMIN';
    firstName: string;
    lastName: string;
  }> = {}
) {
  return prisma.user.create({
    data: {
      tenantId,
      email: overrides.email ?? `test-${uid()}@test.com`,
      role: overrides.role ?? 'OWNER',
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
    },
  });
}

// ========================================
// VEHICLE
// ========================================

export async function createTestVehicle(
  tenantId: string,
  overrides: Partial<{
    licensePlate: string;
    year: number;
    mileage: number;
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
    brandName: string;
    lineName: string;
    typeName: string;
  }> = {}
) {
  const brand = await prisma.vehicleBrand.create({
    data: { name: `Brand-${uid()}`, tenantId },
  });
  const line = await prisma.vehicleLine.create({
    data: { name: `Line-${uid()}`, brandId: brand.id, tenantId },
  });
  const type = await prisma.vehicleType.create({
    data: { name: `Type-${uid()}`, tenantId },
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      tenantId,
      licensePlate: overrides.licensePlate ?? `T-${uid()}`.toUpperCase(),
      brandId: brand.id,
      lineId: line.id,
      typeId: type.id,
      year: overrides.year ?? 2024,
      color: 'Black',
      mileage: overrides.mileage ?? 50000,
      status: overrides.status ?? 'ACTIVE',
    },
  });

  return { vehicle, brand, line, type };
}

// ========================================
// MAINTENANCE
// ========================================

export async function createTestMantItem(
  tenantId: string,
  overrides: Partial<{
    name: string;
    mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
    type: 'ACTION' | 'PART' | 'SERVICE';
    categoryName: string;
  }> = {}
) {
  const category = await prisma.mantCategory.create({
    data: { name: `Cat-${uid()}`, tenantId },
  });

  const mantItem = await prisma.mantItem.create({
    data: {
      name: overrides.name ?? `MantItem-${uid()}`,
      mantType: overrides.mantType ?? 'PREVENTIVE',
      type: overrides.type ?? 'ACTION',
      categoryId: category.id,
      tenantId,
    },
  });

  return { mantItem, category };
}

export async function createTestMaintenanceProgram(
  tenantId: string,
  vehicleId: string,
  userId: string,
  overrides: Partial<{
    programName: string;
    packageName: string;
    mantItemId: string;
    scheduledKm: number;
    estimatedCost: number;
    assignmentKm: number;
  }> = {}
) {
  const program = await prisma.vehicleMantProgram.create({
    data: {
      name: overrides.programName ?? `Program-${uid()}`,
      vehicleId,
      tenantId,
      status: 'ACTIVE',
      generatedBy: userId,
      assignmentKm: overrides.assignmentKm ?? 50000,
    },
  });

  const pkg = await prisma.vehicleProgramPackage.create({
    data: {
      programId: program.id,
      name: overrides.packageName ?? `Package-${uid()}`,
      tenantId,
      packageType: 'PREVENTIVE',
      status: 'PENDING',
    },
  });

  // If no mantItemId provided, create one
  let mantItemId = overrides.mantItemId;
  if (!mantItemId) {
    const { mantItem } = await createTestMantItem(tenantId);
    mantItemId = mantItem.id;
  }

  const programItem = await prisma.vehicleProgramItem.create({
    data: {
      packageId: pkg.id,
      mantItemId,
      mantType: 'PREVENTIVE',
      status: 'PENDING',
      tenantId,
      scheduledKm: overrides.scheduledKm ?? 50000,
      estimatedCost: overrides.estimatedCost ?? 100000,
    },
  });

  return { program, package: pkg, programItem, mantItemId };
}

export async function createTestAlert(
  tenantId: string,
  vehicleId: string,
  programItemId: string,
  overrides: Partial<{
    itemName: string;
    packageName: string;
    type: 'PREVENTIVE' | 'OVERDUE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'SNOOZED';
    scheduledKm: number;
    currentKm: number;
    estimatedCost: number;
  }> = {}
) {
  const scheduledKm = overrides.scheduledKm ?? 50000;
  const currentKm = overrides.currentKm ?? 50000;
  const kmToMaintenance = scheduledKm - currentKm;

  return prisma.maintenanceAlert.create({
    data: {
      tenantId,
      vehicleId,
      programItemId,
      itemName: overrides.itemName ?? 'Test Service',
      packageName: overrides.packageName ?? 'Test Package',
      type: overrides.type ?? 'OVERDUE',
      priority: (overrides.priority ?? 'HIGH') as Priority,
      category: 'ROUTINE',
      status: overrides.status ?? 'PENDING',
      scheduledKm,
      currentKmAtCreation: currentKm,
      currentKm,
      kmToMaintenance,
      alertThresholdKm: 0,
      alertLevel: 'CRITICAL',
      estimatedCost: overrides.estimatedCost ?? 120000,
    },
  });
}

// ========================================
// PEOPLE
// ========================================

export async function createTestProvider(
  tenantId: string,
  overrides: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }> = {}
) {
  return prisma.provider.create({
    data: {
      tenantId,
      name: overrides.name ?? `Provider-${uid()}`,
      email: overrides.email ?? `provider-${uid()}@test.com`,
      phone: overrides.phone ?? '+57300000000',
      address: overrides.address ?? 'Calle Test 123',
    },
  });
}

export async function createTestTechnician(
  tenantId: string,
  overrides: Partial<{
    name: string;
    email: string;
    hourlyRate: number;
  }> = {}
) {
  return prisma.technician.create({
    data: {
      tenantId,
      name: overrides.name ?? `Technician-${uid()}`,
      email: overrides.email ?? `tech-${uid()}@test.com`,
      hourlyRate: overrides.hourlyRate ?? 25000,
    },
  });
}

export async function createTestDriver(
  tenantId: string,
  overrides: Partial<{
    name: string;
    email: string;
    licenseNumber: string;
  }> = {}
) {
  return prisma.driver.create({
    data: {
      tenantId,
      name: overrides.name ?? `Driver-${uid()}`,
      email: overrides.email ?? `driver-${uid()}@test.com`,
      licenseNumber: overrides.licenseNumber ?? `LIC-${uid()}`,
    },
  });
}

// ========================================
// INVENTORY & PARTS
// ========================================

export async function createTestMasterPart(
  tenantId: string | null = null,
  overrides: Partial<{
    code: string;
    description: string;
    category: string;
    referencePrice: number;
    unit: string;
  }> = {}
) {
  return prisma.masterPart.create({
    data: {
      tenantId,
      code: overrides.code ?? `MP-${uid()}`,
      description: overrides.description ?? `Test Part ${uid()}`,
      category: overrides.category ?? 'FILTROS',
      unit: overrides.unit ?? 'UNIDAD',
      referencePrice: overrides.referencePrice ?? 50000,
    },
  });
}

export async function createTestInventoryItem(
  tenantId: string,
  masterPartId: string,
  overrides: Partial<{
    quantity: number;
    averageCost: number;
    minStock: number;
    warehouse: string;
  }> = {}
) {
  const quantity = overrides.quantity ?? 100;
  const averageCost = overrides.averageCost ?? 50000;

  return prisma.inventoryItem.create({
    data: {
      tenantId,
      masterPartId,
      quantity,
      averageCost,
      totalValue: quantity * averageCost,
      minStock: overrides.minStock ?? 5,
      warehouse: overrides.warehouse ?? 'PRINCIPAL',
      status: 'ACTIVE',
    },
  });
}

// ========================================
// WORK ORDERS
// ========================================

export async function createTestWorkOrder(
  tenantId: string,
  vehicleId: string,
  requestedBy: string,
  overrides: Partial<{
    title: string;
    mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
    workType: 'EXTERNAL' | 'INTERNAL' | 'MIXED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    estimatedCost: number;
    creationMileage: number;
  }> = {}
) {
  return prisma.workOrder.create({
    data: {
      tenantId,
      vehicleId,
      title: overrides.title ?? `WO-${uid()}`,
      mantType: overrides.mantType ?? 'CORRECTIVE',
      priority: (overrides.priority ?? 'MEDIUM') as Priority,
      status: overrides.status ?? 'PENDING',
      workType: overrides.workType ?? 'EXTERNAL',
      requestedBy,
      estimatedCost: overrides.estimatedCost ?? null,
      creationMileage: overrides.creationMileage ?? 50000,
    },
  });
}

export async function createTestWorkOrderWithItems(
  tenantId: string,
  vehicleId: string,
  requestedBy: string,
  mantItemId: string,
  overrides: Partial<{
    title: string;
    mantType: 'PREVENTIVE' | 'CORRECTIVE';
    itemCount: number;
    unitPrice: number;
    quantity: number;
  }> = {}
) {
  const workOrder = await createTestWorkOrder(
    tenantId,
    vehicleId,
    requestedBy,
    {
      ...(overrides.title ? { title: overrides.title } : {}),
      ...(overrides.mantType ? { mantType: overrides.mantType } : {}),
    }
  );

  const count = overrides.itemCount ?? 1;
  const items = [];

  for (let i = 0; i < count; i++) {
    const unitPrice = overrides.unitPrice ?? 50000;
    const quantity = overrides.quantity ?? 1;
    const item = await prisma.workOrderItem.create({
      data: {
        tenantId: workOrder.tenantId,
        workOrderId: workOrder.id,
        mantItemId,
        description: `Test Item ${i + 1}`,
        supplier: 'Test Supplier',
        unitPrice,
        quantity,
        totalCost: unitPrice * quantity,
        purchasedBy: requestedBy,
        status: 'PENDING',
      },
    });
    items.push(item);
  }

  return { workOrder, items };
}
