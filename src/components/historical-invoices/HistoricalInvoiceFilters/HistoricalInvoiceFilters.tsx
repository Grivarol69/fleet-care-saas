'use client';

import { useEffect, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { HistoricalInvoiceFiltersProps } from './HistoricalInvoiceFilters.types';

// ---------------------------------------------------------------------------
// Types (local)
// ---------------------------------------------------------------------------

type VehicleOption = {
  id: string;
  licensePlate: string;
  label: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HistoricalInvoiceFilters({
  value,
  onChange,
  onClear,
}: HistoricalInvoiceFiltersProps) {
  // Internal draft state for date inputs (committed on "Aplicar")
  const [draftDateFrom, setDraftDateFrom] = useState<string>(
    value.dateFrom ?? ''
  );
  const [draftDateTo, setDraftDateTo] = useState<string>(value.dateTo ?? '');
  const [dateError, setDateError] = useState<string | null>(null);

  // Vehicle combobox state
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const [comboQuery, setComboQuery] = useState('');

  // Load vehicles once on mount
  useEffect(() => {
    fetch('/api/vehicles/vehicles')
      .then(async res => {
        if (!res.ok) return;
        const data = await res.json();
        const list: VehicleOption[] = (
          Array.isArray(data) ? data : (data.vehicles ?? [])
        ).map(
          (v: {
            id: string;
            licensePlate: string;
            brand?: { name?: string };
            line?: { name?: string };
          }) => {
            const brandName = v.brand?.name ?? '';
            const lineName = v.line?.name ?? '';
            const suffix = `${brandName} ${lineName}`.trim();
            return {
              id: v.id,
              licensePlate: v.licensePlate,
              label: suffix ? `${v.licensePlate} — ${suffix}` : v.licensePlate,
            };
          }
        );
        setVehicles(list);
      })
      .catch(() => {
        // Non-blocking: vehicle filter simply won't populate
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleVehicleSelect(option: VehicleOption) {
    setComboOpen(false);
    setComboQuery('');
    onChange({ ...value, vehicleId: option.id });
  }

  function handleClearVehicle() {
    onChange({ ...value, vehicleId: null });
  }

  function handleApply() {
    // Validate date range
    if (draftDateFrom && draftDateTo && draftDateFrom > draftDateTo) {
      setDateError(
        'La fecha de inicio no puede ser posterior a la fecha final'
      );
      return;
    }
    setDateError(null);
    onChange({
      ...value,
      dateFrom: draftDateFrom || null,
      dateTo: draftDateTo || null,
    });
  }

  function handleClear() {
    setDraftDateFrom('');
    setDraftDateTo('');
    setDateError(null);
    onClear();
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const filteredVehicles = vehicles.filter(v =>
    v.licensePlate.toUpperCase().includes(comboQuery.toUpperCase())
  );

  const selectedVehicle = vehicles.find(v => v.id === value.vehicleId);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4">
      {/* Vehicle filter */}
      <div className="space-y-1 min-w-[200px]">
        <Label className="text-xs font-medium text-muted-foreground">
          Vehículo
        </Label>
        <div className="flex items-center gap-2">
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between bg-background text-sm"
                type="button"
              >
                {selectedVehicle?.label ?? 'Todos los vehículos'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar por placa..."
                  value={comboQuery}
                  onValueChange={setComboQuery}
                />
                <CommandList>
                  <CommandEmpty>No se encontró el vehículo</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__all__" onSelect={handleClearVehicle}>
                      Todos los vehículos
                    </CommandItem>
                    {filteredVehicles.map(v => (
                      <CommandItem
                        key={v.id}
                        value={v.id}
                        onSelect={() => handleVehicleSelect(v)}
                      >
                        {v.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Date from */}
      <div className="space-y-1">
        <Label
          htmlFor="filter-dateFrom"
          className="text-xs font-medium text-muted-foreground"
        >
          Desde
        </Label>
        <Input
          id="filter-dateFrom"
          type="date"
          value={draftDateFrom}
          onChange={e => {
            setDraftDateFrom(e.target.value);
            setDateError(null);
          }}
          className="bg-background text-sm"
        />
      </div>

      {/* Date to */}
      <div className="space-y-1">
        <Label
          htmlFor="filter-dateTo"
          className="text-xs font-medium text-muted-foreground"
        >
          Hasta
        </Label>
        <Input
          id="filter-dateTo"
          type="date"
          value={draftDateTo}
          onChange={e => {
            setDraftDateTo(e.target.value);
            setDateError(null);
          }}
          className="bg-background text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-end gap-2">
        <Button type="button" size="sm" onClick={handleApply}>
          Aplicar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          Limpiar
        </Button>
      </div>

      {/* Validation hint */}
      {dateError && (
        <p className="w-full text-xs text-destructive">{dateError}</p>
      )}
    </div>
  );
}
