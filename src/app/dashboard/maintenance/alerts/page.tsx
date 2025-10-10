'use client';

import { useState } from 'react';
import { AlertsTable } from './components/AlertsTable';
import { CreateWorkOrderModal } from './components/CreateWorkOrderModal';
import { useAlertsGroupedByVehicle } from '@/lib/hooks/useMaintenanceAlerts';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MaintenanceAlertsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlertIds, setSelectedAlertIds] = useState<number[]>([]);

  // Fetch data
  const { groupedAlerts, isLoading } = useAlertsGroupedByVehicle(
    priorityFilter ? { priority: priorityFilter } : undefined
  );

  // Filtrar por búsqueda
  const filteredAlerts = groupedAlerts.filter(group =>
    group.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.lineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando alertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Filtros y búsqueda - 1 línea compacta */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Buscar por placa, marca o línea..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={priorityFilter || "ALL"} onValueChange={(val) => setPriorityFilter(val === "ALL" ? "" : val)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todas las prioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="URGENT">Urgente</SelectItem>
            <SelectItem value="HIGH">Alta</SelectItem>
            <SelectItem value="MEDIUM">Media</SelectItem>
            <SelectItem value="LOW">Baja</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline" className="text-sm py-2 px-3">
          {filteredAlerts.length} vehículos
        </Badge>
      </div>

      {/* Tabla de vehículos con alertas */}
      {filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            No hay alertas activas
          </p>
          <p className="text-gray-500 text-center max-w-md">
            {searchQuery || priorityFilter
              ? 'No se encontraron alertas con los filtros aplicados'
              : 'Todos los vehículos están al día con su mantenimiento'}
          </p>
        </div>
      ) : (
        <AlertsTable
          vehicles={filteredAlerts}
          selectedAlertIds={selectedAlertIds}
          onSelectionChange={setSelectedAlertIds}
          onCreateWorkOrder={() => setIsModalOpen(true)}
        />
      )}

      {/* Modal para crear WorkOrder */}
      <CreateWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedAlertIds={selectedAlertIds}
        onSuccess={() => {
          setIsModalOpen(false);
          setSelectedAlertIds([]);
        }}
      />
    </div>
  );
}
