'use server';

import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function startDriverShift(vehicleId: string) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) throw new Error('No estás autenticado');

    // Fix #2: solo DRIVER puede iniciar turnos
    if (user.role !== 'DRIVER')
      throw new Error('Acción no permitida para tu rol.');

    const driver = await tenantPrisma.driver.findUnique({
      where: { userId: user.id },
    });

    if (!driver) {
      throw new Error(
        'No tienes un perfil de Conductor asociado a tu usuario.'
      );
    }

    // Fix #1: comprobaciones + create + vehicle update, todo atómico y serializable.
    await prisma.$transaction(
      async tx => {
        // Fix #6: verificar que el vehículo existe en este tenant
        const vehicle = await tx.vehicle.findFirst({
          where: { id: vehicleId, tenantId: user.tenantId },
          select: { id: true, situation: true },
        });
        if (!vehicle) throw new Error('Vehículo no encontrado.');

        const activeShift = await tx.driverShift.findFirst({
          where: {
            driverId: driver.id,
            status: 'ACTIVE',
            tenantId: user.tenantId,
          },
        });

        if (activeShift) {
          if (activeShift.vehicleId === vehicleId) return;
          throw new Error(
            'Ya tienes un turno activo con otro vehículo. Termínalo primero.'
          );
        }

        const vehicleInUse = await tx.driverShift.findFirst({
          where: { vehicleId, status: 'ACTIVE', tenantId: user.tenantId },
        });

        // Fix #3: sin exponer datos del otro conductor
        if (vehicleInUse) {
          throw new Error('Este vehículo ya está en uso por otro conductor.');
        }

        await tx.driverShift.create({
          data: {
            tenantId: user.tenantId,
            driverId: driver.id,
            vehicleId,
            status: 'ACTIVE',
          },
        });

        // Fix #4: marcar el vehículo como IN_USE
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { situation: 'IN_USE' },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidatePath('/home');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error starting driver shift:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Error interno del servidor',
    };
  }
}

export async function endDriverShift(formData: FormData) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) throw new Error('No estás autenticado');

    // Fix #2: solo DRIVER puede terminar turnos
    if (user.role !== 'DRIVER')
      throw new Error('Acción no permitida para tu rol.');

    const driver = await tenantPrisma.driver.findUnique({
      where: { userId: user.id },
    });

    if (!driver) throw new Error('Perfil de conductor no encontrado');

    const activeShift = await tenantPrisma.driverShift.findFirst({
      where: { driverId: driver.id, status: 'ACTIVE' },
    });

    if (!activeShift) {
      return { success: true, message: 'No hay turno activo' };
    }

    // Fix #10: capturar odómetro de cierre si el conductor lo ingresó
    const rawMileage = formData.get('endMileage');
    const endMileage =
      rawMileage && rawMileage !== ''
        ? parseInt(rawMileage as string, 10)
        : undefined;

    if (endMileage !== undefined && (isNaN(endMileage) || endMileage < 0)) {
      return { success: false, error: 'Kilometraje inválido.' };
    }

    await tenantPrisma.driverShift.update({
      where: { id: activeShift.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        ...(endMileage !== undefined && { endMileage }),
      },
    });

    // Fix #4: liberar el vehículo
    await tenantPrisma.vehicle.update({
      where: { id: activeShift.vehicleId },
      data: { situation: 'AVAILABLE' },
    });

    revalidatePath('/home');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error ending driver shift:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
    };
  }
}
