import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canManagePurchases } from '@/lib/permissions';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PurchaseItemActions } from './components/PurchaseItemActions';

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!canManagePurchases(user)) {
    redirect('/dashboard');
  }

  const tenantPrisma = await getTenantPrisma(user.tenantId);

  const purchase = await tenantPrisma.invoice.findUnique({
    where: {
      id,
      tenantId: user.tenantId,
    },
    include: {
      supplier: true,
      items: {
        include: {
          masterPart: true,
          serializedItems: {
            select: { id: true },
          },
        },
      },
      registrar: true,
    },
  });

  if (!purchase) {
    redirect('/dashboard/inventory/purchases');
  }

  const formatPrice = (price: unknown) => {
    if (!price) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const isApproved =
    purchase.status === 'APPROVED' || purchase.status === 'PAID';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/inventory/purchases">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Detalle de Compra
            {isApproved ? (
              <Badge
                variant="outline"
                className="border-green-500 text-green-700 ml-2"
              >
                Ingresado a Inventario
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-yellow-400 text-yellow-600 ml-2"
              >
                {purchase.status}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Revisá los detalles de la factura N° {purchase.invoiceNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">
                  N° Factura
                </span>
                <span className="font-medium text-base">
                  {purchase.invoiceNumber}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Fecha de Factura
                </span>
                <span className="font-medium text-base">
                  {format(new Date(purchase.invoiceDate), 'dd/MM/yyyy', {
                    locale: es,
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Registrado el
                </span>
                <span>
                  {format(new Date(purchase.createdAt), 'dd MMM yyyy HH:mm', {
                    locale: es,
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Registrado por
                </span>
                <span>
                  {purchase.registrar.firstName} {purchase.registrar.lastName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium block text-base">
                  {purchase.supplier.name}
                </span>
              </div>
              {purchase.supplier.nit && (
                <div>
                  <span className="text-muted-foreground">NIT/RUT: </span>
                  <span>{purchase.supplier.nit}</span>
                </div>
              )}
              {purchase.supplier.email && (
                <div>
                  <span className="text-muted-foreground">E-mail: </span>
                  <span>{purchase.supplier.email}</span>
                </div>
              )}
              {purchase.supplier.phone && (
                <div>
                  <span className="text-muted-foreground">Teléfono: </span>
                  <span>{purchase.supplier.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Artículos Ingresados</CardTitle>
          <CardDescription>
            Costo unitario y existencias contabilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo Unitario</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total Artículo</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    {item.masterPart?.code || '-'}
                  </TableCell>
                  <TableCell>
                    {item.masterPart?.description || item.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.taxRate)}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(item.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PurchaseItemActions
                      invoiceItemId={item.id}
                      description={
                        item.masterPart?.description || item.description
                      }
                      quantity={Number(item.quantity)}
                      serializedType={item.masterPart?.serializedType || null}
                      registeredSerials={item.serializedItems?.length || 0}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-6">
            <div className="w-1/3 min-w-[250px] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(purchase.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Impuestos Totales</span>
                <span>{formatPrice(purchase.taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t font-semibold text-lg">
                <span>Total Compra</span>
                <span>{formatPrice(purchase.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
