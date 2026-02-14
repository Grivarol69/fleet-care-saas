import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaintenanceAlertService } from '../MaintenanceAlertService';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    vehicleMantProgram: {
      findFirst: vi.fn(),
    },
    maintenanceAlert: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('MaintenanceAlertService', () => {
  const mockVehicleId = 123;
  const mockTenantId = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndGenerateAlerts', () => {
    it('should generate an EARLY_WARNING alert when maintenance is approaching', async () => {
      // 1. Arrange
      const currentKm = 13500;
      const scheduledKm = 15000; // 1500 diff -> < 2000 (EARLY_WARNING)

      const mockProgram = {
        id: 1,
        packages: [
          {
            name: 'Mantenimiento 15K',
            items: [
              {
                id: 10,
                mantItem: { id: 5, name: 'Cambio Aceite' },
                scheduledKm: scheduledKm,
                estimatedCost: 100,
                estimatedTime: 1.5,
                status: 'PENDING',
              },
            ],
          },
        ],
      };

      (prisma.vehicleMantProgram.findFirst as any).mockResolvedValue(
        mockProgram
      );
      (prisma.maintenanceAlert.findFirst as any).mockResolvedValue(null); // No previous alert

      // 2. Act
      await MaintenanceAlertService.checkAndGenerateAlerts(
        mockVehicleId,
        currentKm,
        mockTenantId
      );

      // 3. Assert
      expect(prisma.maintenanceAlert.create).toHaveBeenCalledTimes(1);
      const createCall = (prisma.maintenanceAlert.create as any).mock
        .calls[0][0];

      expect(createCall.data).toMatchObject({
        vehicleId: mockVehicleId,
        tenantId: mockTenantId,
        programItemId: 10,
        type: 'EARLY_WARNING', // 1500km left > 1000km (Medium) but < 2000km
        itemName: 'Cambio Aceite',
        kmToMaintenance: 1500,
        alertLevel: 'LOW',
      });
    });

    it('should generate a CRITICAL (OVERDUE) alert when maintenance is overdue', async () => {
      // 1. Arrange
      const currentKm = 15500;
      const scheduledKm = 15000; // -500 diff -> Overdue

      const mockProgram = {
        id: 1,
        packages: [
          {
            name: 'Mantenimiento 15K',
            items: [
              {
                id: 10,
                mantItem: { id: 5, name: 'Frenos Delanteros' }, // Safety Critical
                scheduledKm: scheduledKm,
                status: 'PENDING',
              },
            ],
          },
        ],
      };

      (prisma.vehicleMantProgram.findFirst as any).mockResolvedValue(
        mockProgram
      );
      (prisma.maintenanceAlert.findFirst as any).mockResolvedValue(null);

      // 2. Act
      await MaintenanceAlertService.checkAndGenerateAlerts(
        mockVehicleId,
        currentKm,
        mockTenantId
      );

      // 3. Assert
      expect(prisma.maintenanceAlert.create).toHaveBeenCalled();
      const createCall = (prisma.maintenanceAlert.create as any).mock
        .calls[0][0];

      expect(createCall.data).toMatchObject({
        type: 'OVERDUE',
        alertLevel: 'CRITICAL',
        kmToMaintenance: -500,
        priority: 'URGENT', // Critical Safety + Overdue = URGENT
      });
    });

    it('should update existing alert instead of creating duplicate', async () => {
      // 1. Arrange
      const currentKm = 14500;
      const scheduledKm = 15000;

      const mockProgram = {
        id: 1,
        packages: [
          {
            name: 'Mantenimiento 15K',
            items: [
              {
                id: 10,
                mantItem: { id: 5, name: 'Cambio Aceite' },
                scheduledKm: scheduledKm,
                status: 'PENDING',
              },
            ],
          },
        ],
      };

      const mockExistingAlert = {
        id: 999,
        programItemId: 10,
        status: 'PENDING',
      };

      (prisma.vehicleMantProgram.findFirst as any).mockResolvedValue(
        mockProgram
      );
      (prisma.maintenanceAlert.findFirst as any).mockResolvedValue(
        mockExistingAlert
      );

      // 2. Act
      await MaintenanceAlertService.checkAndGenerateAlerts(
        mockVehicleId,
        currentKm,
        mockTenantId
      );

      // 3. Assert
      expect(prisma.maintenanceAlert.create).not.toHaveBeenCalled();
      expect(prisma.maintenanceAlert.update).toHaveBeenCalledTimes(1);

      const updateCall = (prisma.maintenanceAlert.update as any).mock
        .calls[0][0];
      expect(updateCall.where.id).toBe(999);
      expect(updateCall.data.currentKm).toBe(currentKm);
    });

    it('should NOT generate alert if maintenance is far away', async () => {
      // 1. Arrange
      const currentKm = 10000;
      const scheduledKm = 15000; // 5000 diff -> Too far (> 2000)

      const mockProgram = {
        id: 1,
        packages: [
          {
            name: 'Mantenimiento 15K',
            items: [
              {
                id: 10,
                mantItem: { id: 5, name: 'Cambio Aceite' },
                scheduledKm: scheduledKm,
                status: 'PENDING',
              },
            ],
          },
        ],
      };

      (prisma.vehicleMantProgram.findFirst as any).mockResolvedValue(
        mockProgram
      );

      // 2. Act
      await MaintenanceAlertService.checkAndGenerateAlerts(
        mockVehicleId,
        currentKm,
        mockTenantId
      );

      // 3. Assert
      expect(prisma.maintenanceAlert.create).not.toHaveBeenCalled();
    });
  });
});
