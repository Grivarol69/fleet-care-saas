import { requireCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canManageCostCenters } from '@/lib/permissions';
import { CostCentersList } from './components/CostCentersList';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

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
        <PageContainer>
            <PageHeader
                title="Centros de Costos"
                description="Gestiona los centros de costos y empresas de terceros asociadas a los vehículos."
            />

            <div className="mt-6">
                <CostCentersList />
            </div>
        </PageContainer>
    );
}
