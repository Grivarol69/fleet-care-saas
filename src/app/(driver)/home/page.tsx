import { requireCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardCheck,
  AlertCircle,
  History,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { VehicleCard } from '../_components/VehicleCard';
import { endDriverShift } from '@/actions/driver';
import { VehicleSituation } from '@prisma/client';

async function getDriverData(userId: string, tenantId: string) {
  const tp = getTenantPrisma(tenantId);

  const driver = await tp.driver.findUnique({ where: { userId } });
  if (!driver)
    return {
      driver: null,
      vehicle: null,
      todayChecklist: null,
      activeIncidents: [],
    };

  const assignment = await tp.driverShift.findFirst({
    where: { driverId: driver.id, status: 'ACTIVE' },
    orderBy: { startTime: 'desc' },
    include: {
      vehicle: {
        include: {
          brand: true,
          line: true,
          odometerLogs: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  const vehicle = assignment?.vehicle ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayChecklist = vehicle
    ? await tp.dailyChecklist.findFirst({
        where: {
          driverId: driver.id,
          vehicleId: vehicle.id,
          createdAt: { gte: today },
        },
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  const activeIncidents = vehicle
    ? await tp.incidentAlert.findMany({
        where: {
          vehicleId: vehicle.id,
          status: { in: ['REPORTED', 'REVIEWED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          description: true,
          severity: true,
          status: true,
          createdAt: true,
        },
      })
    : [];

  return { driver, vehicle, todayChecklist, activeIncidents };
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'text-blue-600',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-orange-600',
  CRITICAL: 'text-red-600',
};

export default async function HomeScreen() {
  const { user } = await requireCurrentUser();
  if (!user) redirect('/home/login');

  const { driver, vehicle, todayChecklist, activeIncidents } =
    await getDriverData(user.id, user.tenantId);

  if (!vehicle) {
    redirect('/home/checkin');
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const driverName = driver?.name?.split(' ')[0] ?? 'Conductor';

  const dateStr = now.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div>
      <header
        className="px-4 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#1E3A5F', color: '#F8FAFC' }}
      >
        <span className="font-bold text-lg">Fleet Care</span>
        <span className="text-xs text-slate-300 capitalize">
          {dateStr} · {timeStr}
        </span>
      </header>

      <div className="px-4 py-5 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">
          {greeting}, {driverName}
        </h1>

        {vehicle ? (
          <VehicleCard
            licensePlate={vehicle.licensePlate}
            brandName={vehicle.brand?.name}
            lineName={vehicle.line?.name}
            lastOdometerKm={vehicle.odometerLogs[0]?.kilometers}
            situation={vehicle.situation as VehicleSituation}
          />
        ) : null}

        {vehicle && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start gap-3">
              <ClipboardCheck
                className={`w-7 h-7 flex-shrink-0 mt-0.5 ${todayChecklist ? 'text-green-600' : 'text-primary'}`}
              />
              <div className="flex-1">
                <p className="font-semibold text-slate-800">
                  Checklist Pre-operacional
                </p>
                {todayChecklist ? (
                  <p className="text-sm text-green-600 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Completado hoy
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5">
                    Hoy no se ha realizado
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/checklist"
              className={`mt-3 flex items-center justify-center w-full h-12 rounded-lg font-semibold text-sm transition-colors ${
                todayChecklist
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {todayChecklist ? 'Ver checklist de hoy' : 'Iniciar checklist'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/incidents/new"
            className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 active:bg-slate-50"
          >
            <AlertCircle className="w-7 h-7 text-amber-500" />
            <span className="text-sm font-medium text-slate-700 text-center">
              Reportar novedad
            </span>
          </Link>
          <Link
            href="/history"
            className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 active:bg-slate-50"
          >
            <History className="w-7 h-7 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 text-center">
              Ver historial
            </span>
          </Link>
        </div>

        {activeIncidents.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Novedades activas
            </p>
            <div className="space-y-2">
              {activeIncidents.map(inc => (
                <div
                  key={inc.id}
                  className="bg-white rounded-xl shadow-sm p-3 flex items-start gap-3"
                >
                  <AlertCircle
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${SEVERITY_COLOR[inc.severity] ?? 'text-slate-500'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">
                      {inc.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inc.status === 'REPORTED' ? 'Reportado' : 'En revisión'}{' '}
                      · {new Date(inc.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-gray-200 mt-8">
          <form action={endDriverShift}>
            <button
              type="submit"
              className="w-full flex items-center justify-center py-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 active:bg-red-100 transition-colors"
            >
              Terminar Turno (Soltar Vehículo)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
