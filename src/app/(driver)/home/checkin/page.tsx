import { requireCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { VehicleSelector } from './VehicleSelector';

export default async function CheckinPage() {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) redirect('/home/login');

  const driver = await tenantPrisma.driver.findUnique({
    where: { userId: user.id },
  });

  if (!driver) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-100 text-red-600 p-4 rounded-full mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Perfil no encontrado
        </h2>
        <p className="text-gray-600">
          Tu usuario no tiene un perfil de Conductor asignado. Por favor,
          contacta a tu administrador.
        </p>
      </div>
    );
  }

  // Verificar si ya tiene un turno activo
  const activeShift = await tenantPrisma.driverShift.findFirst({
    where: { driverId: driver.id, status: 'ACTIVE' },
  });

  if (activeShift) {
    redirect('/home');
  }

  // Obtener vehículos activos y disponibles (sin turno activo)
  const vehicles = await tenantPrisma.vehicle.findMany({
    where: {
      status: 'ACTIVE',
      situation: 'AVAILABLE',
      driverShifts: { none: { status: 'ACTIVE' } },
    },
    select: {
      id: true,
      licensePlate: true,
      brand: { select: { name: true } },
      line: { select: { name: true } },
    },
    orderBy: { licensePlate: 'asc' },
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-24">
      <div className="bg-[#1E3A5F] text-white p-6 pt-12 pb-8 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold">Check-in Operativo</h1>
        <p className="text-blue-100 mt-1 text-sm">
          Selecciona el vehículo que conducirás
        </p>
      </div>

      <div className="p-4 mt-2">
        <VehicleSelector vehicles={vehicles} />
      </div>
    </div>
  );
}
