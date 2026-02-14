'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Trash2, Plus, Save, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Types
type Supplier = { id: number; name: string };
type MasterPart = {
  id: string;
  code: string;
  description: string;
  referencePrice: number | null;
  category: string;
  unit: string;
};

type PurchaseItem = {
  masterPartId: string;
  description: string;
  code: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export default function NewPurchasePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Items
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // Part search
  const [partSearchOpen, setPartSearchOpen] = useState(false);
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [partSearchResults, setPartSearchResults] = useState<MasterPart[]>([]);
  const [partSearchLoading, setPartSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load Suppliers
    axios
      .get('/api/people/providers?type=supplier')
      .then(res => setSuppliers(res.data))
      .catch(console.error);
  }, []);

  // Fetch parts when search query changes (debounced)
  const searchParts = useCallback(async (query: string) => {
    setPartSearchLoading(true);
    try {
      const params = query.trim()
        ? `?search=${encodeURIComponent(query.trim())}`
        : '';
      const res = await axios.get(`/api/inventory/parts${params}`);
      setPartSearchResults(res.data);
    } catch (err) {
      console.error('Error buscando autopartes:', err);
      setPartSearchResults([]);
    } finally {
      setPartSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!partSearchOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchParts(partSearchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [partSearchQuery, partSearchOpen, searchParts]);

  // Load all parts when popover opens
  useEffect(() => {
    if (partSearchOpen) {
      setPartSearchQuery('');
      searchParts('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [partSearchOpen, searchParts]);

  const selectPart = (part: MasterPart) => {
    addItem(part);
    setPartSearchOpen(false);
    setPartSearchQuery('');
  };

  const addItem = (part: MasterPart) => {
    setItems([
      ...items,
      {
        masterPartId: part.id,
        description: part.description,
        code: part.code,
        quantity: 1,
        unitPrice: part.referencePrice ?? 0,
        taxRate: 19,
      },
    ]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    // @ts-ignore
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!invoiceNumber || !supplierId || items.length === 0) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    try {
      await axios.post('/api/inventory/purchases', {
        invoiceNumber,
        invoiceDate,
        supplierId: parseInt(supplierId),
        items,
      });
      toast({
        title: 'Compra Registrada',
        description: 'El inventario ha sido actualizado.',
      });
      router.push('/dashboard/inventory');
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar la compra',
        variant: 'destructive',
      });
    }
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxTotal = items.reduce(
    (sum, i) => sum + (i.quantity * i.unitPrice * i.taxRate) / 100,
    0
  );
  const total = subtotal + taxTotal;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Registrar Compra de Inventario</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de Factura</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>N° Factura</Label>
            <Input
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="FAC-12345"
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Items</CardTitle>
          <Popover open={partSearchOpen} onOpenChange={setPartSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Agregar Autoparte
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="end">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar por código o descripción..."
                    className="pl-8 h-9"
                    value={partSearchQuery}
                    onChange={e => setPartSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {partSearchLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : partSearchResults.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No se encontraron autopartes.
                  </div>
                ) : (
                  partSearchResults.map(part => (
                    <button
                      key={part.id}
                      className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                      onClick={() => selectPart(part)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">
                            {part.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {part.code} &middot; {part.category}
                          </div>
                        </div>
                        {part.referencePrice != null && (
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-2">
                            ${Number(part.referencePrice).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[100px]">Cantidad</TableHead>
                <TableHead className="w-[150px]">Precio Unit.</TableHead>
                <TableHead className="w-[100px]">% IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No hay items agregados.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-medium">{item.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e =>
                          updateItem(
                            idx,
                            'quantity',
                            parseFloat(e.target.value)
                          )
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={e =>
                          updateItem(
                            idx,
                            'unitPrice',
                            parseFloat(e.target.value)
                          )
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.taxRate}
                        onChange={e =>
                          updateItem(idx, 'taxRate', parseFloat(e.target.value))
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      $
                      {(
                        item.quantity *
                        item.unitPrice *
                        (1 + item.taxRate / 100)
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
          <div className="w-1/3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Impuestos:</span>
              <span>${taxTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>${total.toLocaleString()}</span>
            </div>
            <Button className="w-full mt-4" size="lg" onClick={handleSubmit}>
              <Save className="mr-2 h-4 w-4" />
              Registrar Compra
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
