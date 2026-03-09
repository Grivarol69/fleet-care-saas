import { requireCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canManageCostCenters } from '@/lib/permissions';
import { CostCentersList } from './components/CostCentersList';

export const metadata = {
  title: 'Centros de Costos | Fleet Care',
};

export default async function CostCentersPage() {
  const { user } = await requireCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  if (!canManageCostCenters(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Centros de Costos</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona los centros de costos y empresas de terceros asociadas a los
          vehículos.
        </p>
      </div>

      <div className="mt-6">
        <CostCentersList />
      </div>
    </div>
  );
}
