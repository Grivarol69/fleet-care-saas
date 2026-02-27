'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Link as LinkIcon } from 'lucide-react';

type Invoice = {
  id: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    workOrderItem: {
      id: string;
      description: string;
      mantItem: {
        id: string;
        name: string;
        type: string;
      } | null;
    } | null;
    masterPart: {
      id: string;
      name: string;
      partNumber: string;
    } | null;
  }>;
};

type ItemsTabProps = {
  invoice: Invoice;
};

const mantItemTypeConfig = {
  SUPPLY: { label: 'Insumo', color: 'text-blue-600' },
  PART: { label: 'Repuesto', color: 'text-green-600' },
  SERVICE: { label: 'Servicio', color: 'text-purple-600' },
  INSPECTION: { label: 'Inspección', color: 'text-orange-600' },
};

export function ItemsTab({ invoice }: ItemsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Items de la Factura ({invoice.items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoice.items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay items registrados
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo/Vinculación</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, index) => {
                  const mantItemType = item.workOrderItem?.mantItem?.type
                    ? mantItemTypeConfig[
                        item.workOrderItem.mantItem
                          .type as keyof typeof mantItemTypeConfig
                      ]
                    : null;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.masterPart && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Repuesto: {item.masterPart.name} (
                              {item.masterPart.partNumber})
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.workOrderItem ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <LinkIcon className="h-3 w-3 text-green-600" />
                              <span className="text-green-600 font-medium">
                                Vinculado a WO
                              </span>
                            </div>
                            {item.workOrderItem.mantItem && (
                              <>
                                <p className="text-xs font-medium">
                                  {item.workOrderItem.mantItem.name}
                                </p>
                                {mantItemType && (
                                  <Badge variant="outline" className="text-xs">
                                    <span className={mantItemType.color}>
                                      {mantItemType.label}
                                    </span>
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No vinculado
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice.toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.subtotal.toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p>${item.taxAmount.toLocaleString('es-CO')}</p>
                          {item.taxRate > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ({item.taxRate}%)
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${item.total.toLocaleString('es-CO')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-medium">
                    Subtotal
                  </TableCell>
                  <TableCell colSpan={3} className="text-right font-medium">
                    ${invoice.subtotal.toLocaleString('es-CO')}{' '}
                    {invoice.currency}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-medium">
                    IVA Total
                  </TableCell>
                  <TableCell colSpan={3} className="text-right font-medium">
                    ${invoice.taxAmount.toLocaleString('es-CO')}{' '}
                    {invoice.currency}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-right font-bold text-lg"
                  >
                    TOTAL
                  </TableCell>
                  <TableCell
                    colSpan={3}
                    className="text-right font-bold text-lg"
                  >
                    ${invoice.totalAmount.toLocaleString('es-CO')}{' '}
                    {invoice.currency}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* Resumen de vinculaciones */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2 text-sm">
            Resumen de Vinculaciones
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Items vinculados a WO</p>
              <p className="font-semibold">
                {invoice.items.filter(i => i.workOrderItem).length} de{' '}
                {invoice.items.length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                Items con repuesto maestro
              </p>
              <p className="font-semibold">
                {invoice.items.filter(i => i.masterPart).length} de{' '}
                {invoice.items.length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
