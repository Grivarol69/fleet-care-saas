import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Loader2,
  Search,
  Box,
  Sparkles,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  workOrderId: string;
  vehicleId?: string; // Optional as services might not need it, but Parts do
  type?: 'SERVICE' | 'PART';
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onSuccess?: (item?: any) => void;
  defaultItemSource?: 'EXTERNAL' | 'INTERNAL_STOCK';
  lockItemSource?: boolean; // Si true, oculta el select de fuente
  mode?: 'endpoint' | 'form'; // default: 'endpoint'
  onItemAdded?: (item: {
    mantItemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    itemSource: 'INTERNAL_STOCK' | 'EXTERNAL';
    providerId?: string | null;
    masterPartId?: string | null;
  }) => void;
};

type MantItem = {
  id: string;
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
  };
};

export function AddItemDialog({
  workOrderId,
  vehicleId,
  type = 'PART',
  open,
  onOpenChange,
  onClose,
  onSuccess,
  defaultItemSource,
  lockItemSource,
  mode = 'endpoint',
  onItemAdded,
}: AddItemDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [items, setItems] = useState<MantItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MantItem | null>(null);
  const [stock, setStock] = useState<InventoryStock | null>(null);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>(
    []
  );
  const [suggestions, setSuggestions] = useState<PartSuggestion[]>([]);

  // Catalog fallback — used when KB suggestions and direct parts are both empty
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogParts, setCatalogParts] = useState<
    {
      id: string;
      code: string;
      description: string;
      referencePrice: number | null;
    }[]
  >([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [showCatalogFallback, setShowCatalogFallback] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      unitPrice: 0,
      itemSource: defaultItemSource || 'EXTERNAL', // USAR PROP
      description: '',
      masterPartId: '',
    },
  });

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Clear all states when closing
      setSearchQuery('');
      setSelectedItem(null);
      setStock(null);
      setSuggestions([]);
      setCatalogSearch('');
      setCatalogParts([]);
      setShowCatalogFallback(false);
      form.reset({
        quantity: 1,
        unitPrice: 0,
        itemSource: defaultItemSource || 'EXTERNAL',
        description: '',
        masterPartId: '',
        mantItemId: '',
        providerId: '',
      });
    } else {
      // Ensure defaults are set when opening
      if (defaultItemSource) {
        form.setValue('itemSource', defaultItemSource);
      }
    }
  }, [open, defaultItemSource, form]);

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
        const baseUrl = '/api/maintenance/mant-items';
        const queryParams = new URLSearchParams();
        if (searchQuery.trim()) {
          queryParams.append('search', searchQuery.trim());
        }
        if (type === 'PART' || type === 'SERVICE') {
          queryParams.append('type', type);
        }

        const url = `${baseUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const res = await axios.get(url);
        const allItems: MantItem[] = Array.isArray(res.data)
          ? res.data
          : res.data.items || [];
        setItems(allItems);
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
          setShowCatalogFallback(false);
          setCatalogSearch('');
          setCatalogParts([]);
          // Siempre poblar descripción con nombre del item como baseline
          // (las sugerencias pueden sobreescribirla con algo más específico)
          form.setValue('description', item.name);

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
                      `${bestMatch.masterPart.code} - ${bestMatch.masterPart.description}`
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
                    // No KB suggestions and no direct parts — show catalog fallback
                    setStock({ quantity: 0, inventoryItemId: 0 });
                    setShowCatalogFallback(true);
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
        if (Number(res.data[0].quantity) > 0 && !lockItemSource) {
          form.setValue('itemSource', 'INTERNAL_STOCK');
        }
      } else {
        setStock({ quantity: 0, inventoryItemId: 0 });
        if (!lockItemSource) {
          form.setValue('itemSource', 'EXTERNAL');
        }
      }
    } catch (error) {
      console.error('Error checking stock', error);
      setStock(null);
    }
  };

  // Debounced catalog search
  const searchCatalog = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCatalogParts([]);
      return;
    }
    setIsCatalogLoading(true);
    try {
      const res = await axios.get(
        `/api/inventory/parts?search=${encodeURIComponent(query)}`
      );
      setCatalogParts(res.data ?? []);
    } catch {
      setCatalogParts([]);
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showCatalogFallback) return;
    const t = setTimeout(() => searchCatalog(catalogSearch), 300);
    return () => clearTimeout(t);
  }, [catalogSearch, showCatalogFallback, searchCatalog]);

  const applyCatalogPart = (part: {
    id: string;
    code: string;
    description: string;
    referencePrice: number | null;
  }) => {
    form.setValue('masterPartId', part.id);
    form.setValue('description', `${part.code} - ${part.description}`);
    form.setValue('unitPrice', Number(part.referencePrice ?? 0));
    checkStock(part.id);
  };

  const applySuggestion = (suggestion: PartSuggestion) => {
    form.setValue('unitPrice', Number(suggestion.masterPart.referencePrice));
    form.setValue(
      'description',
      `${suggestion.masterPart.code} - ${suggestion.masterPart.description}`
    );
    form.setValue('masterPartId', suggestion.masterPart.id);
    toast({
      title: 'Repuesto seleccionado',
      description: suggestion.masterPart.description,
    });
  };

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Form mode: call onItemAdded callback instead of POST
    if (mode === 'form' && onItemAdded) {
      onItemAdded({
        mantItemId: values.mantItemId,
        description: values.description ?? '',
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        itemSource: values.itemSource,
        providerId: values.providerId || null,
        masterPartId: values.masterPartId || null,
      });
      handleClose();
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `/api/maintenance/work-orders/${workOrderId}/items`,
        {
          mantItemId: values.mantItemId,
          quantity: values.quantity,
          unitPrice: values.unitPrice,
          description: values.description,
          itemSource: values.itemSource,
          providerId: values.providerId ? values.providerId : undefined,
          masterPartId: values.masterPartId || undefined,
        }
      );

      toast({
        title: 'Item Agregado',
        description: 'El item se ha agregado correctamente a la orden.',
      });
      if (onSuccess) onSuccess(response.data);
      handleClose();
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
    <Dialog open={open} onOpenChange={handleClose}>
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
          <form
            onSubmit={e => {
              e.stopPropagation();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            {/* Item Search */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="mantItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Buscar {type === 'SERVICE' ? 'Servicio' : 'Repuesto'}
                    </FormLabel>
                    <Popover open={comboOpen} onOpenChange={setComboOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            {field.value
                              ? (items.find(
                                  i => i.id.toString() === field.value
                                )?.name ?? 'Seleccionar...')
                              : 'Buscar y seleccionar...'}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[460px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Escribir para filtrar..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>Sin resultados.</CommandEmpty>
                            <CommandGroup>
                              {items.slice(0, 50).map(item => (
                                <CommandItem
                                  key={item.id}
                                  value={item.id.toString()}
                                  onSelect={val => {
                                    form.setValue('mantItemId', val);
                                    setComboOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${field.value === item.id.toString() ? 'opacity-100' : 'opacity-0'}`}
                                  />
                                  {item.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                          Ref: ${sugg.masterPart.referencePrice}
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

            {/* Catalog fallback — shown when no KB suggestions available */}
            {showCatalogFallback && suggestions.length === 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Sin coincidencia en ficha técnica — Buscar en catálogo
                  completo
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Escribí código o descripción del repuesto..."
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                  />
                </div>
                {isCatalogLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Buscando...
                  </div>
                )}
                {catalogParts.length > 0 && (
                  <div className="grid gap-1 max-h-48 overflow-y-auto">
                    {catalogParts.map(part => (
                      <div
                        key={part.id}
                        className={`flex items-center justify-between p-2 rounded border text-sm cursor-pointer hover:bg-muted ${form.watch('masterPartId') === part.id ? 'border-amber-500 bg-amber-50' : ''}`}
                        onClick={() => applyCatalogPart(part)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium font-mono text-xs">
                            {part.code}
                          </span>
                          <span>{part.description}</span>
                          {part.referencePrice && (
                            <span className="text-xs text-muted-foreground">
                              Ref: $
                              {Number(part.referencePrice).toLocaleString(
                                'es-CO'
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-amber-600 border border-amber-300 rounded px-1">
                            No verificado
                          </span>
                          {form.watch('masterPartId') === part.id && (
                            <Check className="h-4 w-4 text-amber-600 ml-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {catalogSearch.length >= 2 &&
                  !isCatalogLoading &&
                  catalogParts.length === 0 && (
                    <p className="text-xs text-muted-foreground py-1">
                      Sin resultados para &quot;{catalogSearch}&quot;
                    </p>
                  )}
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

            {/* Informational badge when source is locked but internal stock is available */}
            {lockItemSource &&
              type === 'PART' &&
              stock &&
              Number(stock.quantity) > 0 && (
                <div className="p-3 rounded border text-sm flex items-center gap-2 bg-amber-50 border-amber-300 text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Disponible en inventario propio:{' '}
                    <strong>{Number(stock.quantity)}</strong> unidades. Se
                    procesará como compra externa de todas formas.
                  </span>
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
              {!lockItemSource && (
                <FormField
                  control={form.control}
                  name="itemSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino del trabajo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INTERNAL_STOCK">
                            Taller Propio (interno)
                          </SelectItem>
                          <SelectItem value="EXTERNAL">
                            Proveedor Externo (compra)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
              <Button type="button" variant="outline" onClick={handleClose}>
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
