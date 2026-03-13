import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canManagePurchases } from '@/lib/permissions';
import { PurchasesList } from './components/PurchasesList';

export default async function PurchasesPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/sign-in');
    }

    if (!canManagePurchases(user)) {
        redirect('/dashboard');
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">
                    Compras de Inventario
                </h1>
                <p className="text-muted-foreground mt-1">
                    Historial de facturas y órdenes de compra recibidas
                </p>
            </div>

            <PurchasesList />
        </div>
    );
}
