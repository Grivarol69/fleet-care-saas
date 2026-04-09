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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { CostCenter } from './CostCentersList.types';
import { FormCostCenter } from './FormCostCenter';

export function CostCentersList() {
    const [data, setData] = useState<CostCenter[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CostCenter | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<CostCenter | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchItems = useCallback(
        async (searchTerm?: string) => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (searchTerm) params.set('search', searchTerm);

                const response = await axios.get<CostCenter[]>(
                    `/api/cost-centers?${params.toString()}`
                );
                setData(response.data);
            } catch (error) {
                console.error('Error fetching cost centers:', error);
                toast.error('Error al cargar centros de costos', {
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
            void fetchItems(search);
        }, 350);
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [search, fetchItems]);

    const handleCreate = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: CostCenter) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (item: CostCenter) => {
        setDeletingItem(item);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        try {
            setIsDeleting(true);
            await axios.delete(`/api/cost-centers/${deletingItem.id}`);

            toast.success('Centro de costos desactivado');

            setData(prev => prev.map(c => c.id === deletingItem.id ? { ...c, isActive: false } : c));
        } catch (error) {
            console.error('Error deleting cost center:', error);
            toast.error('Error al eliminar', {
                description: 'No se pudo desactivar el centro de costos',
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            setDeletingItem(null);
        }
    };

    const columns: ColumnDef<CostCenter>[] = [
        {
            accessorKey: 'code',
            header: 'Código',
            cell: ({ row }) => {
                const isInactive = !row.original.isActive;
                return (
                    <span className={`font-mono text-sm font-medium ${isInactive ? 'text-gray-400' : ''}`}>
                        {row.original.code}
                    </span>
                );
            },
        },
        {
            accessorKey: 'name',
            header: 'Nombre',
            cell: ({ row }) => {
                const isInactive = !row.original.isActive;
                return <span className={isInactive ? 'text-gray-400' : 'font-medium'}>{row.original.name}</span>;
            },
        },
        {
            accessorKey: 'taxId',
            header: 'NIT',
            cell: ({ row }) => {
                const isInactive = !row.original.isActive;
                return <span className={isInactive ? 'text-gray-400' : ''}>{row.original.taxId || '-'}</span>;
            },
        },
        {
            id: 'vehicles',
            header: 'Vehículos Vínc.',
            cell: ({ row }) => {
                const isInactive = !row.original.isActive;
                return <span className={isInactive ? 'text-gray-400' : ''}>{row.original._count?.vehicles || 0}</span>;
            },
        },
        {
            id: 'estado',
            header: 'Estado',
            cell: ({ row }) => {
                const isActive = row.original.isActive;

                return isActive ? (
                    <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                        Activo
                    </Badge>
                ) : (
                    <Badge variant="outline" className="border-gray-400 text-gray-500 bg-gray-50">
                        Inactivo
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const isActive = row.original.isActive;

                return (
                    <div className="flex items-center gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(row.original)} title="Editar">
                            <Pencil className="w-4 h-4" />
                        </Button>
                        {isActive && (
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(row.original)} title="Desactivar">
                                <Trash2 className="w-4 h-4" />
                            </Button>
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
                        placeholder="Buscar por código o nombre..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Centro de Costos
                </Button>
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
                                    const isInactive = !row.original.isActive;
                                    return (
                                        <TableRow key={row.id} className={isInactive ? 'bg-gray-50/50' : ''}>
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
                                        No se encontraron centros de costos
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <FormCostCenter
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                costCenter={editingItem}
                onSuccess={() => fetchItems(search)}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desactivar centro de costos?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esto marcará el centro de costos como inactivo. Los vehículos y órdenes de trabajo históricas asociadas se mantendrán, pero no podrás asignar este centro de costos de nuevo hasta reactivarlo.
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
                            {isDeleting ? 'Desactivando...' : 'Sí, desactivar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
