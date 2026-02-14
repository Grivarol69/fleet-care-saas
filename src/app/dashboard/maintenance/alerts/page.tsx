'use client';

import { useState, useMemo } from 'react';
import { ImprovedAlertsTable } from './components/ImprovedAlertsTable';
import { AlertsKPICards } from './components/AlertsKPICards';
import { CreateWorkOrderModal } from './components/CreateWorkOrderModal';
import { useAlertsGroupedByVehicle } from '@/lib/hooks/useMaintenanceAlerts';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const filteredAlerts = groupedAlerts.filter(
    group =>
      group.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.lineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calcular KPIs
  const kpiData = useMemo(() => {
    const allAlerts = filteredAlerts.flatMap(v => v.alerts);

    return {
      totalVehiclesWithAlerts: filteredAlerts.length,
      criticalAlerts: allAlerts.filter(a => a.alertLevel === 'CRITICAL').length,
      upcomingAlerts: allAlerts.filter(
        a =>
          a.alertLevel === 'HIGH' &&
          a.kmToMaintenance > 0 &&
          a.kmToMaintenance <= 1000
      ).length,
      totalEstimatedCost: allAlerts.reduce(
        (sum, a) => sum + (a.estimatedCost || 0),
        0
      ),
      totalEstimatedHours: allAlerts.reduce(
        (sum, a) => sum + (a.estimatedDuration || 0),
        0
      ),
    };
  }, [filteredAlerts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">
            Cargando alertas de mantenimiento...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Analizando el estado de tu flota
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-32">
      {/* Header con Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-blue-600" />
            Alertas de Mantenimiento
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona el mantenimiento preventivo de tu flota
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <AlertsKPICards data={kpiData} />

      {/* Filtros y búsqueda */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Buscar por placa, marca o línea..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <Select
          value={priorityFilter || 'ALL'}
          onValueChange={val => setPriorityFilter(val === 'ALL' ? '' : val)}
        >
          <SelectTrigger className="w-[220px] border-gray-300">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todas las prioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las prioridades</SelectItem>
            <SelectItem value="URGENT">🔴 Urgente</SelectItem>
            <SelectItem value="HIGH">⚠️ Alta</SelectItem>
            <SelectItem value="MEDIUM">🕒 Media</SelectItem>
            <SelectItem value="LOW">ℹ️ Baja</SelectItem>
          </SelectContent>
        </Select>

        <Badge
          variant="outline"
          className="text-sm py-2.5 px-4 bg-blue-50 text-blue-700 border-blue-300 font-semibold"
        >
          {filteredAlerts.length} vehículo
          {filteredAlerts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Lista de vehículos con alertas */}
      {filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-300 rounded-2xl bg-gradient-to-br from-gray-50 to-white">
          <div className="bg-green-100 rounded-full p-6 mb-4">
            <AlertTriangle className="h-12 w-12 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {searchQuery || priorityFilter
              ? 'No hay resultados'
              : '¡Excelente!'}
          </p>
          <p className="text-gray-600 text-center max-w-md text-lg">
            {searchQuery || priorityFilter
              ? 'No se encontraron alertas con los filtros aplicados'
              : 'Todos los vehículos están al día con su mantenimiento'}
          </p>
        </div>
      ) : (
        <ImprovedAlertsTable
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
