'use server';

import { requireCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function startDriverShift(vehicleId: string) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) throw new Error('No estás autenticado');

    // Buscar el perfil de Conductor del usuario
    const driver = await tenantPrisma.driver.findUnique({
      where: { userId: user.id }
    });

    if (!driver) {
      throw new Error('No tienes un perfil de Conductor asociado a tu usuario.');
    }

    // Verificar si ya tiene un turno activo
    const activeShift = await tenantPrisma.driverShift.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE',
      }
    });

    if (activeShift) {
      if (activeShift.vehicleId === vehicleId) {
        return { success: true, message: 'Ya estás asignado a este vehículo' };
      }
      throw new Error('Ya tienes un turno activo con otro vehículo. Termínalo primero.');
    }

    // Verificar si el vehículo ya está en uso por otro conductor
    const vehicleInUse = await tenantPrisma.driverShift.findFirst({
      where: {
        vehicleId,
        status: 'ACTIVE'
      },
      include: { driver: { include: { user: true } } }
    });

    if (vehicleInUse) {
      throw new Error(`Este vehículo está siendo usado actualmente por ${vehicleInUse.driver.user?.firstName || 'otro conductor'}.`);
    }

    // Crear el nuevo turno
    await tenantPrisma.driverShift.create({
      data: {
        tenantId: user.tenantId,
        driverId: driver.id,
        vehicleId,
        status: 'ACTIVE',
      }
    });

    revalidatePath('/home');
    return { success: true };
  } catch (error: any) {
    console.error('Error starting driver shift:', error);
    return { success: false, error: error.message || 'Error interno del servidor' };
  }
}

export async function endDriverShift() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) throw new Error('No estás autenticado');

    const driver = await tenantPrisma.driver.findUnique({
      where: { userId: user.id }
    });

    if (!driver) throw new Error('Perfil de conductor no encontrado');

    const activeShift = await tenantPrisma.driverShift.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE',
      }
    });

    if (!activeShift) {
      return { success: true, message: 'No hay turno activo' };
    }

    await tenantPrisma.driverShift.update({
      where: { id: activeShift.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      }
    });

    revalidatePath('/home');
    return { success: true };
  } catch (error: any) {
    console.error('Error ending driver shift:', error);
    return { success: false, error: error.message || 'Error interno' };
  }
}
