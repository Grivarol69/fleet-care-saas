'use client';

import { useState } from 'react';
import { AlertVehicleCard } from './components/AlertVehicleCard';
import { CreateWorkOrderModal } from './components/CreateWorkOrderModal';
import { useAlertsGroupedByVehicle, useAlertStats } from '@/lib/hooks/useMaintenanceAlerts';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, AlertTriangle, Clock, DollarSign, Wrench } from 'lucide-react';
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
  const [expandedVehicleId, setExpandedVehicleId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlertIds, setSelectedAlertIds] = useState<number[]>([]);

  // Fetch data
  const { groupedAlerts, isLoading } = useAlertsGroupedByVehicle(
    priorityFilter ? { priority: priorityFilter } : undefined
  );
  const stats = useAlertStats();

  // Filtrar por búsqueda
  const filteredAlerts = groupedAlerts.filter(group =>
    group.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.lineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleVehicle = (vehicleId: number) => {
    setExpandedVehicleId(expandedVehicleId === vehicleId ? null : vehicleId);
    // Limpiar selección al cambiar de vehículo
    if (expandedVehicleId !== vehicleId) {
      setSelectedAlertIds([]);
    }
  };

  const handleCreateWorkOrder = () => {
    setIsModalOpen(true);
  };

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Alertas de Mantenimiento
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona los mantenimientos preventivos de tu flota
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Críticas</p>
                <p className="text-3xl font-bold text-red-700">
                  {stats.byLevel.CRITICAL}
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Próximas</p>
                <p className="text-3xl font-bold text-yellow-700">
                  {stats.byLevel.HIGH + stats.byLevel.MEDIUM}
                </p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Costo Est.</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${Math.round(stats.totalEstimatedCost).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Tiempo Est.</p>
                <p className="text-2xl font-bold text-purple-700">
                  {stats.totalEstimatedDuration.toFixed(1)} hrs
                </p>
              </div>
              <Wrench className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
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

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todas las prioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
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

      {/* Lista de vehículos con alertas */}
      {filteredAlerts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay alertas activas
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              {searchQuery || priorityFilter
                ? 'No se encontraron alertas con los filtros aplicados'
                : 'Todos los vehículos están al día con su mantenimiento'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((vehicleGroup) => (
            <AlertVehicleCard
              key={vehicleGroup.vehicleId}
              vehicleGroup={vehicleGroup}
              isExpanded={expandedVehicleId === vehicleGroup.vehicleId}
              onToggle={() => handleToggleVehicle(vehicleGroup.vehicleId)}
              selectedAlertIds={selectedAlertIds}
              onSelectionChange={setSelectedAlertIds}
              onCreateWorkOrder={handleCreateWorkOrder}
            />
          ))}
        </div>
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
