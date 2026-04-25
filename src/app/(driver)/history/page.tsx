import { requireCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { HistoryList } from './HistoryList';

async function getHistory(userId: string, tenantId: string) {
  const tp = getTenantPrisma(tenantId);

  const driver = await tp.driver.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!driver) return [];

  const checklists = await tp.dailyChecklist.findMany({
    where: { driverId: driver.id },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: {
      id: true,
      status: true,
      odometer: true,
      createdAt: true,
      vehicle: { select: { licensePlate: true } },
      items: {
        select: { status: true, category: true, label: true, notes: true },
      },
    },
  });

  return checklists;
}

export default async function HistoryScreen() {
  const { user } = await requireCurrentUser();
  if (!user) redirect('/sign-in');

  const checklists = await getHistory(user.id, user.tenantId);

  return (
    <div>
      <header
        className="px-4 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#1E3A5F', color: '#F8FAFC' }}
      >
        <span className="font-bold text-lg">Fleet Care</span>
        <span className="font-semibold">Mis Checklists</span>
      </header>

      <HistoryList checklists={checklists as any} />
    </div>
  );
}
