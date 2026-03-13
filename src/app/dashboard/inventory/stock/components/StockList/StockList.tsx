'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
} from '@tanstack/react-table';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StockListProps, InventoryItemRow } from './StockList.types';
import { ItemDetailSheet } from '../ItemDetailSheet';

export function StockList({
    initialItems,
    userCanManage,
}: StockListProps) {
    const [data, setData] = useState<InventoryItemRow[]>(initialItems);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    const [selectedItem, setSelectedItem] = useState<InventoryItemRow | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { toast } = useToast();

    const fetchItems = useCallback(
        async (searchTerm: string, status: string, lowStock: boolean) => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (searchTerm) params.set('search', searchTerm);
                if (status && status !== 'all') params.set('status', status);
                if (lowStock) params.set('lowStock', 'true');

                const response = await axios.get<InventoryItemRow[]>(
                    `/api/inventory/items?${params.toString()}`
                );
                setData(response.data);
            } catch (error) {
                console.error('Error fetching inventory items:', error);
                toast({
                    title: 'Error al cargar inventario',
                    description: 'Por favor intentá de nuevo más tarde',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        },
        [toast]
    );

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            void fetchItems(search, statusFilter, lowStockOnly);
        }, 350);
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [search, statusFilter, lowStockOnly, fetchItems]);

    const formatCOP = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const handleRowClick = (item: InventoryItemRow) => {
        setSelectedItem(item);
        setSheetOpen(true);
    };

    const handleItemUpdated = (updatedItem: InventoryItemRow) => {
        setData(prev => prev.map(i => (i.id === updatedItem.id ? updatedItem : i)));
        if (selectedItem?.id === updatedItem.id) {
            setSelectedItem(updatedItem);
        }
    };

    const columns: ColumnDef<InventoryItemRow>[] = [
        {
            accessorKey: 'code',
            header: 'Código',
            cell: ({ row }) => (
                <span className="font-mono text-xs font-medium">
                    {row.original.masterPart.code}
                </span>
            ),
        },
        {
            accessorKey: 'description',
            header: 'Descripción',
            cell: ({ row }) => row.original.masterPart.description,
        },
        {
            accessorKey: 'warehouse',
            header: 'Almacén',
        },
        {
            accessorKey: 'quantity',
            header: 'Cantidad',
            cell: ({ row }) => {
                const item = row.original;
                const isLow = item.quantity <= item.minStock;
                return (
                    <div className="flex items-center gap-1">
                        <span className={isLow ? 'text-orange-600 font-medium' : ''}>
                            {item.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.masterPart.unit}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'minStock',
            header: 'Mínimo',
        },
        {
            accessorKey: 'totalValue',
            header: 'Valor Total',
            cell: ({ row }) => formatCOP(row.original.totalValue),
        },
        {
            accessorKey: 'status',
            header: 'Estado',
            cell: ({ row }) => {
                const status = row.original.status;
                switch (status) {
                    case 'ACTIVE':
                        return <Badge variant="outline" className="border-green-500 text-green-700">Activo</Badge>;
                    case 'LOW_STOCK':
                        return <Badge variant="outline" className="border-orange-500 text-orange-700">Stock Bajo</Badge>;
                    case 'OUT_OF_STOCK':
                        return <Badge variant="outline" className="border-red-500 text-red-600">Sin Stock</Badge>;
                    case 'DISCONTINUED':
                        return <Badge variant="secondary">Descontinuado</Badge>;
                    default:
                        return <Badge variant="outline">{status}</Badge>;
                }
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
                <div className="flex flex-1 flex-col sm:flex-row gap-3">
                    <Input
                        placeholder="Buscar por código o descripción..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="ACTIVE">Activo</SelectItem>
                            <SelectItem value="LOW_STOCK">Stock Bajo</SelectItem>
                            <SelectItem value="OUT_OF_STOCK">Sin Stock</SelectItem>
                            <SelectItem value="DISCONTINUED">Descontinuado</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2 h-10 px-2">
                        <Switch
                            id="low-stock-switch"
                            checked={lowStockOnly}
                            onCheckedChange={setLowStockOnly}
                        />
                        <Label htmlFor="low-stock-switch" className="cursor-pointer">Solo bajo mínimo</Label>
                    </div>
                </div>
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
                                    const isLow = row.original.quantity <= row.original.minStock;
                                    return (
                                        <TableRow
                                            key={row.id}
                                            className={`cursor-pointer ${isLow ? 'bg-orange-50 hover:bg-orange-100' : ''}`}
                                            onClick={() => handleRowClick(row.original)}
                                        >
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
                                        No se encontraron ítems de inventario
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <ItemDetailSheet
                item={selectedItem}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                userCanManage={userCanManage}
                onItemUpdated={handleItemUpdated}
            />
        </div>
    );
}
