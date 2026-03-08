import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin, canManagePurchases } from '@/lib/permissions';
import { PartsList } from './components/PartsList';

export default async function MasterPartsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const partsRaw = await prisma.masterPart.findMany({
    where: {
      OR: [{ tenantId: null }, { tenantId: user.tenantId }],
    },
    include: {
      inventoryItems: {
        where: { tenantId: user.tenantId },
      },
    },
    orderBy: { description: 'asc' },
  });

  const parts = partsRaw.map((part) => ({
    ...part,
    referencePrice: part.referencePrice ? Number(part.referencePrice) : null,
    inventoryItems: part.inventoryItems.map((inv) => ({
      ...inv,
      quantity: Number(inv.quantity),
      minStock: Number(inv.minStock),
      maxStock: inv.maxStock ? Number(inv.maxStock) : null,
      averageCost: Number(inv.averageCost),
      totalValue: Number(inv.totalValue),
    })),
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Catálogo de Partes
        </h1>
        <p className="text-muted-foreground mt-1">
          Administrá las autopartes y repuestos disponibles para tu flota
        </p>
      </div>

      <PartsList
        initialParts={parts}
        userIsSuperAdmin={isSuperAdmin(user)}
        userCanManage={canManagePurchases(user)}
      />
    </div>
  );
}
