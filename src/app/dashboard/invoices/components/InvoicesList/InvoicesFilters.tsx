'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

type InvoicesFiltersProps = {
  filters: {
    search: string;
    status: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
};

export function InvoicesFilters({
  filters,
  onFilterChange,
  onClearFilters,
}: InvoicesFiltersProps) {
  const hasActiveFilters = filters.search || filters.status !== 'all';

  return (
    <div className="mb-6 p-4 border rounded-lg bg-muted/50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Búsqueda */}
        <div className="md:col-span-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Número de factura, proveedor o orden de trabajo..."
              value={filters.search}
              onChange={e => onFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Estado */}
        <div>
          <Label htmlFor="status">Estado</Label>
          <Select
            value={filters.status}
            onValueChange={value => onFilterChange('status', value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="PAID">Pagada</SelectItem>
              <SelectItem value="PARTIAL">Pago Parcial</SelectItem>
              <SelectItem value="OVERDUE">Vencida</SelectItem>
              <SelectItem value="CANCELLED">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botón limpiar filtros */}
      {hasActiveFilters && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
