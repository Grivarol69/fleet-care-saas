'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

type WorkOrdersFiltersProps = {
  filters: {
    search: string;
    status: string;
    mantType: string;
    priority: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
};

export function WorkOrdersFilters({
  filters,
  onFilterChange,
  onClearFilters,
}: WorkOrdersFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.status || filters.mantType || filters.priority;

  return (
    <div className="bg-muted/50 p-4 rounded-lg space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o vehículo..."
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Estado */}
        <Select
          value={filters.status}
          onValueChange={value => onFilterChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="PENDING">Abierta</SelectItem>
            <SelectItem value="IN_PROGRESS">En Trabajo</SelectItem>
            <SelectItem value="PENDING_INVOICE">Por Cerrar</SelectItem>
            <SelectItem value="COMPLETED">Cerrada</SelectItem>
            <SelectItem value="CANCELLED">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        {/* Tipo de Mantenimiento */}
        <Select
          value={filters.mantType}
          onValueChange={value => onFilterChange('mantType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo de mantenimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
            <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
            <SelectItem value="PREDICTIVE">Predictivo</SelectItem>
          </SelectContent>
        </Select>

        {/* Prioridad */}
        <Select
          value={filters.priority}
          onValueChange={value => onFilterChange('priority', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="LOW">Baja</SelectItem>
            <SelectItem value="MEDIUM">Media</SelectItem>
            <SelectItem value="HIGH">Alta</SelectItem>
            <SelectItem value="CRITICAL">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Botón limpiar filtros */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
