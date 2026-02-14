import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Search, Box, Sparkles, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';

const formSchema = z.object({
  mantItemId: z.string().min(1, 'Selecciona un item'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Cantidad mínima de 1'),
  unitPrice: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  itemSource: z.enum(['EXTERNAL', 'INTERNAL_STOCK']),
  providerId: z.string().optional(),
  masterPartId: z.string().optional(),
});

type AddItemDialogProps = {
  workOrderId: number;
  vehicleId?: number; // Optional as services might not need it, but Parts do
  type: 'SERVICE' | 'PART';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type MantItem = {
  id: number;
  name: string;
  type: string;
  parts?: {
    masterPart: {
      id: string;
      referencePrice: number;
    };
  }[];
};

type InventoryStock = {
  quantity: number;
  inventoryItemId: number;
};

type PartSuggestion = {
  masterPart: {
    id: string;
    code: string;
    description: string;
    referencePrice: number;
    manufacturer: string;
  };
  isRecommended: boolean;
};

export function AddItemDialog({
  workOrderId,
  vehicleId,
  type,
  open,
  onOpenChange,
  onSuccess,
}: AddItemDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<MantItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MantItem | null>(null);
  const [stock, setStock] = useState<InventoryStock | null>(null);
  const [providers, setProviders] = useState<{ id: number; name: string }[]>(
    []
  );
  const [suggestions, setSuggestions] = useState<PartSuggestion[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      unitPrice: 0,
      itemSource: 'EXTERNAL',
      description: '',
      masterPartId: '',
    },
  });

  // Fetch providers on mount
  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await axios.get('/api/people/providers');
        setProviders(res.data || []);
      } catch (e) {}
    }
    if (open) fetchProviders();
  }, [open]);

  // Search items - fetch on open and on search change
  useEffect(() => {
    if (!open) return;
    const searchItems = async () => {
      try {
        const url = searchQuery.trim()
          ? `/api/maintenance/mant-items?search=${encodeURIComponent(searchQuery.trim())}`
          : '/api/maintenance/mant-items';
        const res = await axios.get(url);
        const allItems: MantItem[] = Array.isArray(res.data)
          ? res.data
          : res.data.items || [];
        // Filtrar por tipo en cliente: SERVICE/ACTION para servicios, PART para repuestos
        const typeFilters =
          type === 'SERVICE' ? ['SERVICE', 'ACTION'] : ['PART'];
        setItems(allItems.filter(i => typeFilters.includes(i.type)));
      } catch (error) {
        console.error('Error searching items', error);
      }
    };
    const timeoutId = setTimeout(() => searchItems(), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, type, open]);

  // Watch selection
  const selectedItemId = form.watch('mantItemId');

  useEffect(() => {
    async function handleSelection() {
      if (selectedItemId) {
        const item = items.find(i => i.id.toString() === selectedItemId);
        if (item) {
          setSelectedItem(item);

          // Default logic: Reset price to 0 initially unless suggestion found
          form.setValue('unitPrice', 0);
          setSuggestions([]);
          form.setValue('masterPartId', '');

          if (type === 'PART') {
            // 1. Fetch Suggestions (Smart Part Suggestion)
            if (vehicleId) {
              try {
                const res = await axios.get(
                  `/api/maintenance/vehicle-parts/suggest?mantItemId=${item.id}&vehicleId=${vehicleId}`
                );
                const suggs = res.data.suggestions as PartSuggestion[];
                setSuggestions(suggs);

                // Auto-select the first recommended one if available
                if (suggs.length > 0) {
                  const bestMatch = suggs[0];
                  if (bestMatch) {
                    form.setValue(
                      'unitPrice',
                      Number(bestMatch.masterPart.referencePrice || 0)
                    );
                    form.setValue(
                      'description',
                      bestMatch.masterPart.description
                    );
                    form.setValue('masterPartId', bestMatch.masterPart.id);
                    // 2. Check stock using the suggested masterPartId
                    checkStock(bestMatch.masterPart.id);
                  }
                } else {
                  // Fallback to mant item defaults if any
                  if (item.parts?.[0]?.masterPart?.referencePrice) {
                    form.setValue(
                      'unitPrice',
                      Number(item.parts[0].masterPart.referencePrice)
                    );
                    checkStock(item.parts[0].masterPart.id);
                  } else {
                    setStock({ quantity: 0, inventoryItemId: 0 });
                  }
                }
              } catch (err) {
                console.error('Error fetching suggestions', err);
                setStock(null);
              }
            } else {
              setStock(null);
            }
          }
        }
      } else {
        setSelectedItem(null);
        setStock(null);
        setSuggestions([]);
      }
    }
    handleSelection();
  }, [selectedItemId, items, type, form, vehicleId]);

  const checkStock = async (masterPartId: string) => {
    try {
      const res = await axios.get(
        `/api/inventory/items?masterPartId=${encodeURIComponent(masterPartId)}`
      );
      if (res.data && res.data.length > 0) {
        setStock({
          quantity: Number(res.data[0].quantity),
          inventoryItemId: res.data[0].id,
        });
        if (Number(res.data[0].quantity) > 0) {
          form.setValue('itemSource', 'INTERNAL_STOCK');
        }
      } else {
        setStock({ quantity: 0, inventoryItemId: 0 });
        form.setValue('itemSource', 'EXTERNAL');
      }
    } catch (error) {
      console.error('Error checking stock', error);
      setStock(null);
    }
  };

  const applySuggestion = (suggestion: PartSuggestion) => {
    form.setValue('unitPrice', Number(suggestion.masterPart.referencePrice));
    form.setValue('description', suggestion.masterPart.description);
    form.setValue('masterPartId', suggestion.masterPart.id);
    toast({
      title: 'Repuesto seleccionado',
      description: suggestion.masterPart.description,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await axios.post(`/api/maintenance/work-orders/${workOrderId}/items`, {
        mantItemId: parseInt(values.mantItemId),
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        description: values.description,
        itemSource: values.itemSource,
        providerId: values.providerId ? parseInt(values.providerId) : undefined,
        masterPartId: values.masterPartId || undefined,
      });

      toast({
        title: 'Item Agregado',
        description: 'El item se ha agregado correctamente a la orden.',
      });
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error.response?.data?.error || 'No se pudo agregar el item',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Agregar {type === 'SERVICE' ? 'Servicio' : 'Repuesto'}
          </DialogTitle>
          <DialogDescription>
            Busca y agrega un item a la orden de trabajo actual.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Item Search */}
            <div className="space-y-2">
              <FormLabel>Buscar Item</FormLabel>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Escribe para buscar..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <FormField
                control={form.control}
                name="mantItemId"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un resultado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {items.slice(0, 10).map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
                        ))}
                        {items.length === 0 && (
                          <SelectItem value="none" disabled>
                            No se encontraron resultados
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                  <Sparkles className="h-4 w-4" />
                  Repuesto por Ficha Técnica (Exact Match)
                </div>
                <div className="grid gap-2">
                  {suggestions.map(sugg => (
                    <div
                      key={sugg.masterPart.id}
                      className={`flex items-center justify-between p-2 rounded border text-sm cursor-pointer hover:bg-muted ${form.watch('masterPartId') === sugg.masterPart.id ? 'border-blue-500 bg-blue-50' : ''}`}
                      onClick={() => applySuggestion(sugg)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {sugg.masterPart.code} - {sugg.masterPart.description}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sugg.masterPart.manufacturer} • Ref: $
                          {sugg.masterPart.referencePrice}
                        </span>
                      </div>
                      {form.watch('masterPartId') === sugg.masterPart.id && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Part Number (visible when a masterPart is selected) */}
            {form.watch('masterPartId') && (
              <div className="space-y-1">
                <FormLabel>Número de Parte</FormLabel>
                <div className="flex items-center gap-2 p-2.5 rounded border bg-muted/50 text-sm font-mono font-semibold">
                  {suggestions.find(
                    s => s.masterPart.id === form.watch('masterPartId')
                  )?.masterPart.code || form.watch('masterPartId')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Este código se propagará a la Orden de Compra y Factura
                </p>
              </div>
            )}

            {/* Stock Info (Parts only) */}
            {type === 'PART' && selectedItem && (
              <div
                className={`p-3 rounded border text-sm flex items-center gap-2 ${
                  stock && Number(stock.quantity) > 0
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                <Box className="h-4 w-4" />
                {stock ? (
                  <span>
                    Stock Disponible: <strong>{Number(stock.quantity)}</strong>{' '}
                    unid.
                  </span>
                ) : (
                  <span>No hay inventario registrado.</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Unitario</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-2.5 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-6"
                          min="0"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="itemSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuente / Origen</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXTERNAL">
                          Proveedor Externo (Compra)
                        </SelectItem>
                        {type === 'PART' && (
                          <SelectItem value="INTERNAL_STOCK">
                            Inventario Interno
                          </SelectItem>
                        )}
                        {type === 'SERVICE' && (
                          <SelectItem value="INTERNAL_STOCK">
                            Taller Propio (Interno)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('itemSource') === 'EXTERNAL' && (
                <FormField
                  control={form.control}
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor (Opcional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar proveedor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas / Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Detalles específicos..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
