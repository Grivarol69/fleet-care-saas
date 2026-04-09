'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { PurchaseInvoiceRow } from './PurchasesList.types';
import Link from 'next/link';
import { Eye, FilePlus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FormEditPurchase } from './FormEditPurchase';

export function PurchasesList() {
    const [data, setData] = useState<PurchaseInvoiceRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseInvoiceRow | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingPurchase, setDeletingPurchase] = useState<PurchaseInvoiceRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchPurchases = useCallback(
        async (searchTerm?: string) => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (searchTerm) params.set('search', searchTerm);

                const response = await axios.get<PurchaseInvoiceRow[]>(
                    `/api/inventory/purchases?${params.toString()}`
                );
                setData(response.data);
            } catch (error) {
                console.error('Error fetching purchases:', error);
                toast.error('Error al cargar compras', {
                    description: 'Por favor intentá de nuevo más tarde',
                });
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            void fetchPurchases(search);
        }, 350);
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [search, fetchPurchases]);

    const formatPrice = (price: unknown) => {
        if (!price) return '-';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(Number(price));
    };

    const handleEdit = (purchase: PurchaseInvoiceRow) => {
        setEditingPurchase(purchase);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (purchase: PurchaseInvoiceRow) => {
        setDeletingPurchase(purchase);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingPurchase) return;
        try {
            setIsDeleting(true);
            await axios.delete(`/api/inventory/purchases/${deletingPurchase.id}`);

            toast.success('Compra eliminada', {
                description: 'La factura ha sido marcada como cancelada',
            });

            setData(prev => prev.filter(p => p.id !== deletingPurchase.id));
        } catch (error) {
            console.error('Error deleting purchase:', error);
            toast.error('Error al eliminar', {
                description: 'No se pudo eliminar la compra',
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            setDeletingPurchase(null);
        }
    };

    const columns: ColumnDef<PurchaseInvoiceRow>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: 'N° Factura',
            cell: ({ row }) => {
                const isCancelled = row.original.status === 'CANCELLED';
                return (
                    <span className={`font-mono text-xs font-medium ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                        {row.original.invoiceNumber}
                    </span>
                );
            },
        },
        {
            accessorKey: 'supplier.name',
            header: 'Proveedor',
            cell: ({ row }) => {
                const isCancelled = row.original.status === 'CANCELLED';
                return <span className={isCancelled ? 'text-gray-400' : ''}>{row.original.supplier?.name || 'Desconocido'}</span>;
            },
        },
        {
            accessorKey: 'invoiceDate',
            header: 'Fecha Factura',
            cell: ({ row }) => {
                const isCancelled = row.original.status === 'CANCELLED';
                return (
                    <span className={isCancelled ? 'text-gray-400' : ''}>
                        {format(new Date(row.original.invoiceDate), 'dd/MM/yyyy', {
                            locale: es,
                        })}
                    </span>
                );
            },
        },
        {
            id: 'items',
            header: 'Artículos',
            cell: ({ row }) => {
                const isCancelled = row.original.status === 'CANCELLED';
                return <span className={isCancelled ? 'text-gray-400' : ''}>{row.original.items?.length || 0} items</span>;
            },
        },
        {
            accessorKey: 'totalAmount',
            header: 'Monto Total',
            cell: ({ row }) => {
                const isCancelled = row.original.status === 'CANCELLED';
                return (
                    <span className={`font-medium text-right w-full block ${isCancelled ? 'text-gray-400 line-through' : ''}`}>
                        {formatPrice(row.original.totalAmount)}
                    </span>
                );
            },
        },
        {
            id: 'estado',
            header: 'Estado',
            cell: ({ row }) => {
                const isApproved = row.original.status === 'APPROVED' || row.original.status === 'PAID';
                const isCancelled = row.original.status === 'CANCELLED';

                if (isCancelled) {
                    return (
                        <Badge variant="outline" className="border-gray-300 text-gray-500 bg-gray-50 uppercase">
                            Cancelada
                        </Badge>
                    );
                }

                return isApproved ? (
                    <Badge variant="outline" className="border-green-500 text-green-700">
                        Ingresado
                    </Badge>
                ) : (
                    <Badge variant="outline" className="border-yellow-400 text-yellow-600">
                        {row.original.status}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const isCancelled = row.original.status === 'CANCELLED';
                const isPaid = row.original.status === 'PAID';
                const canModify = !isCancelled && !isPaid;

                return (
                    <div className="flex items-center gap-2 justify-end">
                        <Link href={`/dashboard/inventory/purchases/${row.original.id}`}>
                            <Button variant="outline" size="sm" title="Ver detalle">
                                <Eye className="w-4 h-4" />
                            </Button>
                        </Link>
                        {canModify && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => handleEdit(row.original)} title="Editar">
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(row.original)} title="Eliminar">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 gap-2">
                    <Input
                        placeholder="Buscar por N° factura o proveedor..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <Link href="/dashboard/inventory/purchases/new">
                    <Button>
                        <FilePlus className="w-4 h-4 mr-2" /> Nueva Compra
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border bg-white">
                {loading ? (
                    <div className="flex items-center justify-center p-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <TableHead key={header.id}>
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.length ? (
                                table.getRowModel().rows.map(row => {
                                    const isCancelled = row.original.status === 'CANCELLED';
                                    return (
                                        <TableRow key={row.id} className={isCancelled ? 'bg-gray-50/50 hover:bg-gray-50' : ''}>
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No se encontraron compras
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {editingPurchase && (
                <FormEditPurchase
                    isOpen={isEditDialogOpen}
                    setIsOpen={setIsEditDialogOpen}
                    purchase={editingPurchase}
                    onEditPurchase={(updated) => {
                        setData(prev => prev.map(p => p.id === updated.id ? updated : p));
                    }}
                />
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro/a?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esto anulará la orden de compra N° {deletingPurchase?.invoiceNumber}. Esta acción no borrará los movimientos de stock ingresados (requerirá ajuste manual si corresponde), pero la factura quedará como cancelada y no aplicará para cuentas por pagar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
