import { prisma } from '@/lib/prisma';

/**
 * Centralized cleanup for integration tests.
 * Deletes all data for a given tenant in the correct FK dependency order.
 * Call this in afterEach() to ensure test isolation.
 */
export async function cleanupTenant(tenantId: string) {
  // Order matters: delete children before parents to respect FK constraints.

  // 1. Financial & Invoice system
  await prisma.invoicePayment.deleteMany({ where: { invoice: { tenantId } } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId } } });
  await prisma.invoice.deleteMany({ where: { tenantId } });

  // 2. Purchase Orders
  await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { tenantId } } });
  await prisma.purchaseOrder.deleteMany({ where: { tenantId } });

  // 3. Inventory
  await prisma.inventoryMovement.deleteMany({ where: { tenantId } });
  await prisma.inventoryItem.deleteMany({ where: { tenantId } });

  // 4. Internal Workshop
  await prisma.ticketPartEntry.deleteMany({ where: { ticket: { tenantId } } });
  await prisma.ticketLaborEntry.deleteMany({ where: { ticket: { tenantId } } });
  await prisma.internalWorkTicket.deleteMany({ where: { tenantId } });

  // 5. Work Orders
  await prisma.expenseAuditLog.deleteMany({ where: { workOrder: { tenantId } } });
  await prisma.workOrderApproval.deleteMany({ where: { workOrder: { tenantId } } });
  await prisma.workOrderExpense.deleteMany({ where: { workOrder: { tenantId } } });
  await prisma.workOrderItem.deleteMany({ where: { workOrder: { tenantId } } });
  await prisma.workOrder.deleteMany({ where: { tenantId } });

  // 6. Financial Alerts
  await prisma.financialAlert.deleteMany({ where: { tenantId } });

  // 7. Maintenance Alerts
  await prisma.maintenanceAlert.deleteMany({ where: { tenantId } });

  // 8. Vehicle Programs
  await prisma.vehicleProgramItem.deleteMany({ where: { tenantId } });
  await prisma.vehicleProgramPackage.deleteMany({ where: { tenantId } });
  await prisma.vehicleMantProgram.deleteMany({ where: { tenantId } });

  // 9. Price History
  await prisma.partPriceHistory.deleteMany({ where: { tenantId } });

  // 10. Knowledge Base & Maintenance Items
  await prisma.mantItemVehiclePart.deleteMany({ where: { tenantId } });
  await prisma.mantItemPart.deleteMany({ where: { mantItem: { tenantId } } });
  await prisma.mantItemRequest.deleteMany({ where: { tenantId } });
  await prisma.mantItem.deleteMany({ where: { tenantId } });
  await prisma.mantCategory.deleteMany({ where: { tenantId } });

  // 11. Master Parts (tenant-specific only)
  await prisma.masterPart.deleteMany({ where: { tenantId } });

  // 12. Templates & Packages
  await prisma.packageItem.deleteMany({ where: { package: { template: { tenantId } } } });
  await prisma.maintenancePackage.deleteMany({ where: { template: { tenantId } } });
  await prisma.maintenanceTemplate.deleteMany({ where: { tenantId } });

  // 13. Vehicle Documents & Odometer
  await prisma.document.deleteMany({ where: { tenantId } });
  await prisma.odometerLog.deleteMany({ where: { vehicle: { tenantId } } });

  // 14. Vehicle Drivers
  await prisma.vehicleDriver.deleteMany({ where: { tenantId } });

  // 15. Vehicles
  await prisma.vehicle.deleteMany({ where: { tenantId } });

  // 16. Vehicle Catalog
  await prisma.vehicleLine.deleteMany({ where: { tenantId } });
  await prisma.vehicleBrand.deleteMany({ where: { tenantId } });
  await prisma.vehicleType.deleteMany({ where: { tenantId } });

  // 17. People
  await prisma.provider.deleteMany({ where: { tenantId } });
  await prisma.technician.deleteMany({ where: { tenantId } });
  await prisma.driver.deleteMany({ where: { tenantId } });

  // 18. Document Type Configs
  await prisma.documentTypeConfig.deleteMany({ where: { tenantId } });

  // 19. Users
  await prisma.user.deleteMany({ where: { tenantId } });

  // 20. Tenant
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

/**
 * Cleanup multiple tenants at once.
 */
export async function cleanupTenants(tenantIds: string[]) {
  for (const tenantId of tenantIds) {
    await cleanupTenant(tenantId);
  }
}
