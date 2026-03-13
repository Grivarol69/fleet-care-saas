'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ItemDetailSheetProps, MovementRow } from './ItemDetailSheet.types';
import { AdjustmentDialog } from '../AdjustmentDialog';
import { ThresholdsDialog } from '../ThresholdsDialog';

export function ItemDetailSheet({
    item,
    open,
    onOpenChange,
    userCanManage,
    onItemUpdated,
}: ItemDetailSheetProps) {
    const [movements, setMovements] = useState<MovementRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [adjustmentOpen, setAdjustmentOpen] = useState(false);
    const [thresholdsOpen, setThresholdsOpen] = useState(false);

    const fetchMovements = async (currentPage: number) => {
        if (!item?.id) return;
        try {
            setLoading(true);
            const response = await axios.get(`/api/inventory/items/${item.id}?page=${currentPage}`);
            setMovements(response.data.movements);
            setTotal(response.data.pagination.total);
        } catch (error) {
            console.error('Error fetching movements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && item?.id) {
            setPage(1);
            void fetchMovements(1);
        }
    }, [open, item?.id]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        void fetchMovements(newPage);
    };

    const formatCOP = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatMovementType = (type: string) => {
        switch (type) {
            case 'ADJUSTMENT_IN': return 'Entrada Ajuste';
            case 'ADJUSTMENT_OUT': return 'Salida Ajuste';
            case 'PURCHASE': return 'Compra';
            case 'CONSUMPTION': return 'Consumo';
            default: return type;
        }
    };

    const handleSuccess = (updatedItem: any) => {
        onItemUpdated(updatedItem);
        setPage(1);
        void fetchMovements(1);
    };

    if (!item) return null;

    const totalPages = Math.ceil(total / 20);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Detalle de Inventario</SheetTitle>
                </SheetHeader>

                <div className="space-y-6">
                    <div className="rounded-lg border bg-card p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Parte</p>
                                <p className="font-medium">{item.masterPart.description}</p>
                                <p className="font-mono text-xs text-muted-foreground">{item.masterPart.code}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Almacén</p>
                                <p className="font-medium">{item.warehouse}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Cantidad</p>
                                <p className={`font-medium ${item.quantity <= item.minStock ? 'text-orange-600' : ''}`}>
                                    {item.quantity} {item.masterPart.unit}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Estado</p>
                                {item.status === 'ACTIVE' && <Badge variant="outline" className="border-green-500 text-green-700">Activo</Badge>}
                                {item.status === 'LOW_STOCK' && <Badge variant="outline" className="border-orange-500 text-orange-700">Stock Bajo</Badge>}
                                {item.status === 'OUT_OF_STOCK' && <Badge variant="outline" className="border-red-500 text-red-600">Sin Stock</Badge>}
                                {item.status === 'DISCONTINUED' && <Badge variant="secondary">Descontinuado</Badge>}
                            </div>
                            <div>
                                <p className="text-muted-foreground">Mínimo / Máximo</p>
                                <p className="font-medium">{item.minStock} / {item.maxStock ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Ubicación</p>
                                <p className="font-medium">{item.location ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Costo Promedio</p>
                                <p className="font-medium">{formatCOP(item.averageCost)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Valor Total</p>
                                <p className="font-medium">{formatCOP(item.totalValue)}</p>
                            </div>
                        </div>

                        {userCanManage && (
                            <div className="mt-6 flex gap-3">
                                <Button variant="outline" onClick={() => setThresholdsOpen(true)}>
                                    Editar umbrales
                                </Button>
                                <Button onClick={() => setAdjustmentOpen(true)}>
                                    Ajuste manual
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="font-medium mb-4">Historial de Movimientos</h3>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead className="text-right">Cant.</TableHead>
                                        <TableHead className="text-right">Costo Unit.</TableHead>
                                        <TableHead className="text-right">Stock Ant.</TableHead>
                                        <TableHead className="text-right">Stock Nvo.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <div className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : movements.length > 0 ? (
                                        movements.map((movement) => (
                                            <TableRow key={movement.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {new Date(movement.performedAt).toLocaleDateString('es-CO')}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        {formatMovementType(movement.movementType)}
                                                        {movement.referenceType === 'MANUAL_ADJUSTMENT' && movement.referenceId && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]" title={movement.referenceId}>
                                                                {movement.referenceId}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={movement.newStock > movement.previousStock ? 'text-green-600' : 'text-red-600'}>
                                                        {movement.newStock > movement.previousStock ? '+' : '-'}{movement.quantity}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCOP(movement.unitCost)}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{movement.previousStock}</TableCell>
                                                <TableCell className="text-right font-medium">{movement.newStock}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                No hay movimientos registrados
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Página {page} de {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 1 || loading}
                                        onClick={() => handlePageChange(page - 1)}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === totalPages || loading}
                                        onClick={() => handlePageChange(page + 1)}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>

            <AdjustmentDialog
                open={adjustmentOpen}
                onOpenChange={setAdjustmentOpen}
                item={item}
                onSuccess={handleSuccess}
            />

            <ThresholdsDialog
                open={thresholdsOpen}
                onOpenChange={setThresholdsOpen}
                item={item}
                onSuccess={handleSuccess}
            />
        </Sheet>
    );
}
