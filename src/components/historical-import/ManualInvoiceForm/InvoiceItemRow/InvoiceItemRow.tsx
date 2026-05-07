'use client';

import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

type InvoiceItemRowProps = {
  draft: InvoiceItemDraft;
  candidates: MantItemOption[];
  onChange: (updated: InvoiceItemDraft) => void;
  onRemove: () => void;
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
}: InvoiceItemRowProps) {
  function handleQuantityChange(val: string) {
    const newTotal = computeTotal(val, draft.unitPrice);
    onChange({ ...draft, quantity: val, total: newTotal || draft.total });
  }

  function handleUnitPriceChange(val: string) {
    const newTotal = computeTotal(draft.quantity, val);
    onChange({ ...draft, unitPrice: val, total: newTotal || draft.total });
  }

  function handleMantItemChange(mantItemId: string) {
    const candidate = candidates.find(c => c.id === mantItemId);
    onChange({
      ...draft,
      mantItemId: mantItemId === '__none__' ? null : mantItemId,
      mantItemName:
        mantItemId === '__none__' ? null : (candidate?.name ?? null),
      categoryId:
        mantItemId === '__none__' ? null : (candidate?.categoryId ?? null),
      // Reset confidence when operator overrides
      confidence: mantItemId === '__none__' ? 0 : draft.confidence,
    });
  }

  return (
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

      {/* Total — overrideable */}
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

      {/* MantItem Select + confidence badge */}
      <div className="flex items-center gap-1">
        <Select
          value={draft.mantItemId ?? '__none__'}
          onValueChange={handleMantItemChange}
        >
          <SelectTrigger className="text-xs h-9 flex-1 min-w-0">
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin categoría</SelectItem>
            {candidates.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  );
}
