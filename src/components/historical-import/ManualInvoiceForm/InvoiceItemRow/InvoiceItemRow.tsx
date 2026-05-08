'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InvoiceItemDraft } from '../ManualInvoiceForm.types';

export type MantItemOption = {
  id: string;
  name: string;
  categoryName: string;
  categoryId: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

type InvoiceItemRowProps = {
  draft: InvoiceItemDraft;
  candidates: MantItemOption[];
  onChange: (updated: InvoiceItemDraft) => void;
  onRemove: () => void;
  onNewMantItem: (item: MantItemOption) => void;
};

function computeTotal(quantity: string, unitPrice: string): string {
  const qty = parseFloat(quantity);
  const price = parseFloat(unitPrice);
  if (isNaN(qty) || isNaN(price)) return '';
  return (qty * price).toFixed(2);
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 70) {
    return (
      <Badge variant="default" className="bg-green-600 text-white text-xs">
        IA
      </Badge>
    );
  }
  if (confidence > 0) {
    return (
      <Badge
        variant="outline"
        className="border-yellow-500 text-yellow-700 text-xs"
      >
        Revisar
      </Badge>
    );
  }
  return null;
}

export function InvoiceItemRow({
  draft,
  candidates,
  onChange,
  onRemove,
  onNewMantItem,
}: InvoiceItemRowProps) {
  const [comboOpen, setComboOpen] = useState(false);
  const [comboQuery, setComboQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<'SERVICE' | 'PART'>('SERVICE');
  const [createCategoryId, setCreateCategoryId] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  function handleQuantityChange(val: string) {
    const newTotal = computeTotal(val, draft.unitPrice);
    onChange({ ...draft, quantity: val, total: newTotal || draft.total });
  }

  function handleUnitPriceChange(val: string) {
    const newTotal = computeTotal(draft.quantity, val);
    onChange({ ...draft, unitPrice: val, total: newTotal || draft.total });
  }

  function handleMantItemSelect(mantItemId: string) {
    if (mantItemId === '__none__') {
      onChange({
        ...draft,
        mantItemId: null,
        mantItemName: null,
        categoryId: null,
        confidence: 0,
      });
    } else {
      const candidate = candidates.find(c => c.id === mantItemId);
      onChange({
        ...draft,
        mantItemId,
        mantItemName: candidate?.name ?? null,
        categoryId: candidate?.categoryId ?? null,
        confidence: draft.confidence,
      });
    }
    setComboOpen(false);
    setComboQuery('');
  }

  function openCreateDialog() {
    setCreateName(comboQuery.trim());
    setCreateType('SERVICE');
    setCreateCategoryId('');
    setComboOpen(false);
    setDialogOpen(true);
  }

  useEffect(() => {
    if (!dialogOpen || categories.length > 0) return;
    setCategoriesLoading(true);
    fetch('/api/maintenance/mant-categories')
      .then(r => (r.ok ? r.json() : []))
      .then((data: CategoryOption[]) =>
        setCategories(Array.isArray(data) ? data : [])
      )
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, [dialogOpen, categories.length]);

  async function handleCreate() {
    if (!createName.trim() || !createCategoryId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/maintenance/mant-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          type: createType,
          categoryId: createCategoryId,
        }),
      });
      if (!res.ok) return;
      const created = (await res.json()) as {
        id: string;
        name: string;
        category?: { id: string; name: string };
      };
      const newOption: MantItemOption = {
        id: created.id,
        name: created.name,
        categoryName: created.category?.name ?? '',
        categoryId: created.category?.id ?? null,
      };
      onNewMantItem(newOption);
      onChange({
        ...draft,
        mantItemId: created.id,
        mantItemName: created.name,
        categoryId: created.category?.id ?? null,
      });
      setDialogOpen(false);
    } finally {
      setCreating(false);
    }
  }

  const selectedLabel = draft.mantItemId
    ? (candidates.find(c => c.id === draft.mantItemId)?.name ??
      draft.mantItemName ??
      'Sin categoría')
    : 'Sin categoría';

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(comboQuery.toLowerCase())
  );
  const showCreate =
    comboQuery.trim().length > 0 &&
    !candidates.some(
      c => c.name.toLowerCase() === comboQuery.trim().toLowerCase()
    );

  return (
    <>
      <div className="grid grid-cols-[4fr_1fr_1.5fr_1.5fr_3fr_40px] gap-2 items-start py-2 border-b last:border-0">
        {/* Description */}
        <div>
          <Input
            value={draft.description}
            onChange={e => onChange({ ...draft, description: e.target.value })}
            placeholder="Descripción del ítem"
            className="text-sm"
          />
        </div>

        {/* Quantity */}
        <div>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={draft.quantity}
            onChange={e => handleQuantityChange(e.target.value)}
            placeholder="Cant."
            className="text-sm"
          />
        </div>

        {/* Unit price */}
        <div>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={draft.unitPrice}
            onChange={e => handleUnitPriceChange(e.target.value)}
            placeholder="Precio unit."
            className="text-sm"
          />
        </div>

        {/* Total */}
        <div>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={draft.total}
            onChange={e => onChange({ ...draft, total: e.target.value })}
            placeholder="Total"
            className="text-sm"
          />
        </div>

        {/* MantItem combobox + confidence badge */}
        <div className="flex items-center gap-1">
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="h-9 flex-1 min-w-0 justify-between text-xs font-normal px-2"
              >
                <span className="truncate">{selectedLabel}</span>
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar ítem..."
                  value={comboQuery}
                  onValueChange={setComboQuery}
                />
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      value="__none__"
                      onSelect={() => handleMantItemSelect('__none__')}
                    >
                      <span className="text-muted-foreground">
                        Sin categoría
                      </span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    {filtered.map(c => (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => handleMantItemSelect(c.id)}
                      >
                        <Check
                          className={`mr-2 h-3 w-3 ${draft.mantItemId === c.id ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs">{c.name}</span>
                          {c.categoryName && (
                            <span className="text-xs text-muted-foreground truncate">
                              {c.categoryName}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {filtered.length === 0 && !showCreate && (
                    <CommandEmpty>No se encontró el ítem</CommandEmpty>
                  )}
                  {showCreate && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          value="__create__"
                          onSelect={openCreateDialog}
                          className="text-primary"
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Crear &ldquo;{comboQuery.trim()}&rdquo;
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <ConfidenceBadge confidence={draft.confidence} />
        </div>

        {/* Remove button */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create MantItem dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo ítem de mantenimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="create-name">Nombre</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="Ej: Revisión cuentakilómetros"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-type">Tipo</Label>
              <Select
                value={createType}
                onValueChange={v => setCreateType(v as 'SERVICE' | 'PART')}
              >
                <SelectTrigger id="create-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERVICE">Servicio</SelectItem>
                  <SelectItem value="PART">Repuesto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-category">Categoría</Label>
              {categoriesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando categorías...
                </div>
              ) : (
                <Select
                  value={createCategoryId}
                  onValueChange={setCreateCategoryId}
                >
                  <SelectTrigger id="create-category">
                    <SelectValue placeholder="Seleccioná una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!createName.trim() || !createCategoryId || creating}
              onClick={handleCreate}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Crear ítem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
