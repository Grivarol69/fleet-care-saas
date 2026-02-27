'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Car,
  Package,
  Wrench,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import {
  VehicleProgramsListProps,
  VehicleProgramPackage,
} from './VehicleProgramsList.types';
import { FormAssignProgramImproved } from '../FormAssignProgram/FormAssignProgramImproved';

// Componente de card ultra-compacta para programs
interface ProgramCardProps {
  program: VehicleProgramsListProps;
  onSelect: (program: VehicleProgramsListProps) => void;
  onEdit: (program: VehicleProgramsListProps) => void;
  onDelete: (id: string) => void;
}

function ProgramCard({
  program,
  onSelect,
  onEdit,
  onDelete,
}: ProgramCardProps) {
  const completedPackages = program.packages.filter(
    pkg => pkg.status === 'COMPLETED'
  ).length;
  const totalPackages = program.packages.length;
  const pendingItems = program.packages.reduce(
    (sum, pkg) =>
      sum + pkg.items.filter(item => item.status === 'PENDING').length,
    0
  );

  // Calcular siguiente mantenimiento (paquete PENDING con menor scheduledKm)
  // Excluir paquetes CORRECTIVOS (no tienen km programado específico)
  const nextMaintenance = program.packages
    .filter(pkg => pkg.status === 'PENDING' && pkg.packageType !== 'CORRECTIVE')
    .map(pkg => ({
      scheduledKm: pkg.scheduledKm || pkg.items[0]?.scheduledKm || 0, // ✅ BUG #4: Usar scheduledKm del paquete
      name: pkg.name,
    }))
    .filter(pkg => pkg.scheduledKm > 0) // ✅ Excluir paquetes sin km programado
    .sort((a, b) => a.scheduledKm - b.scheduledKm)[0];

  // Calcular alerta (diferencia entre km actual y próximo mantenimiento)
  const kmUntilNext = nextMaintenance
    ? nextMaintenance.scheduledKm - program.vehicle.mileage
    : null;
  const urgency =
    kmUntilNext !== null
      ? kmUntilNext <= 0
        ? 'CRITICO'
        : kmUntilNext <= 1000
          ? 'PROXIMO'
          : 'OK'
      : 'OK';

  // Progreso de paquetes
  const progressPercentage =
    totalPackages > 0 ? (completedPackages / totalPackages) * 100 : 0;

  return (
    <Card
      className={`hover:shadow-md transition-all duration-200 hover:scale-[1.01] cursor-pointer group ${
        urgency === 'CRITICO'
          ? 'border-red-500 border-2'
          : urgency === 'PROXIMO'
            ? 'border-yellow-500 border-2'
            : ''
      }`}
    >
      <CardContent className="p-3">
        {/* Header ultra-compacto */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {program.vehicle.licensePlate}
            </h3>
            <p className="text-xs text-gray-600">
              {program.vehicle.brand.name} {program.vehicle.line.name}
            </p>
          </div>
          <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                onEdit(program);
              }}
              className="h-6 w-6 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                onDelete(program.id);
              }}
              className="h-6 w-6 p-0 text-red-600"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Info crítica compacta */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Km actual:</span>
            <span className="font-medium">
              {program.vehicle.mileage.toLocaleString()}
            </span>
          </div>

          {nextMaintenance && (
            <div className="flex justify-between">
              <span className="text-gray-500">Próximo en:</span>
              <span
                className={`font-medium ${
                  urgency === 'CRITICO'
                    ? 'text-red-600'
                    : urgency === 'PROXIMO'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {kmUntilNext && kmUntilNext > 0
                  ? `${kmUntilNext.toLocaleString()} km`
                  : '¡Vencido!'}
              </span>
            </div>
          )}

          {/* Barra de progreso de paquetes */}
          <div className="pt-1">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Progreso:</span>
              <span className="font-medium">
                {completedPackages}/{totalPackages}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  progressPercentage === 100 ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {pendingItems > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Items pendientes:</span>
              <Badge variant="outline" className="text-xs h-4 px-1">
                {pendingItems}
              </Badge>
            </div>
          )}
        </div>

        {/* Footer compacto */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <Badge
            variant={program.isActive ? 'default' : 'secondary'}
            className="text-xs h-5"
          >
            {program.status}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              onSelect(program);
            }}
            className="text-blue-600 h-6 px-2 text-xs"
          >
            Paquetes <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function VehicleProgramsList() {
  const [activeTab, setActiveTab] = useState<'programs' | 'packages' | 'items'>(
    'programs'
  );
  const [programs, setPrograms] = useState<VehicleProgramsListProps[]>([]);
  const [selectedProgram, setSelectedProgram] =
    useState<VehicleProgramsListProps | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<VehicleProgramPackage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const { toast } = useToast();

  // Fetch programs
  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/maintenance/vehicle-programs');
      setPrograms(response.data);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los programas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Filtros
  const filteredPrograms = programs.filter(
    program =>
      program.vehicle.licensePlate
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      program.vehicle.brand.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  // Métricas
  const totalPrograms = programs.length;
  const activePrograms = programs.filter(p => p.isActive).length;
  const programsWithIssues = programs.filter(p =>
    p.packages.some(pkg => pkg.items.some(item => item.urgency))
  ).length;
  const completedPrograms = programs.filter(
    p =>
      p.packages.length > 0 &&
      p.packages.every(pkg => pkg.status === 'COMPLETED')
  ).length;

  // Handlers
  const handleSelectProgram = (program: VehicleProgramsListProps) => {
    setSelectedProgram(program);
    setActiveTab('packages');
  };

  const handleSelectPackage = (pkg: VehicleProgramPackage) => {
    setSelectedPackage(pkg);
    setActiveTab('items');
  };

  const handleEditProgram = (program: VehicleProgramsListProps) => {
    // TODO: Implementar edit modal
    console.log('Edit program:', program);
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm('¿Eliminar programa?')) return;

    try {
      await axios.delete(`/api/maintenance/vehicle-programs/${id}`);
      toast({
        title: 'Éxito',
        description: 'Programa eliminado',
      });
      fetchPrograms();
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-2">
      {/* Header ultra-compacto - 5% */}
      <h1 className="text-lg font-bold">Programas de Mantenimiento</h1>

      {/* Breadcrumbs mínimos */}
      <div className="flex items-center text-xs">
        <Car className="w-3 h-3 mr-1 text-blue-600" />
        <span>Programas</span>
        {selectedProgram && (
          <>
            <ChevronRight className="w-3 h-3 mx-1 text-gray-400" />
            <Package className="w-3 h-3 mr-1 text-green-600" />
            <span className="truncate max-w-32">
              {selectedProgram.vehicle.licensePlate}
            </span>
          </>
        )}
        {selectedPackage && (
          <>
            <ChevronRight className="w-3 h-3 mx-1 text-gray-400" />
            <Wrench className="w-3 h-3 mr-1 text-purple-600" />
            <span className="truncate max-w-32">{selectedPackage.name}</span>
          </>
        )}
      </div>

      {/* Tabs - 5% */}
      <Tabs
        value={activeTab}
        onValueChange={value =>
          setActiveTab(value as 'programs' | 'packages' | 'items')
        }
      >
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="programs" className="text-xs">
            <Car className="w-3 h-3 mr-1" />
            Programas
          </TabsTrigger>
          <TabsTrigger
            value="packages"
            disabled={!selectedProgram}
            className="text-xs"
          >
            <Package className="w-3 h-3 mr-1" />
            Paquetes
          </TabsTrigger>
          <TabsTrigger
            value="items"
            disabled={!selectedPackage}
            className="text-xs"
          >
            <Wrench className="w-3 h-3 mr-1" />
            Items
          </TabsTrigger>
        </TabsList>

        {/* CONTENIDO PRINCIPAL - 90% */}
        <TabsContent value="programs" className="space-y-2 mt-2">
          {/* Métricas mínimas - 5% */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded p-2 text-center">
              <div className="text-sm font-bold">{totalPrograms}</div>
              <div className="text-xs">Total</div>
            </div>
            <div className="bg-green-50 rounded p-2 text-center">
              <div className="text-sm font-bold">{activePrograms}</div>
              <div className="text-xs">Activos</div>
            </div>
            <div className="bg-red-50 rounded p-2 text-center">
              <div className="text-sm font-bold">{programsWithIssues}</div>
              <div className="text-xs">Issues</div>
            </div>
            <div className="bg-purple-50 rounded p-2 text-center">
              <div className="text-sm font-bold">{completedPrograms}</div>
              <div className="text-xs">Completos</div>
            </div>
          </div>

          {/* Controles ultra-compactos - 5% */}
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-7 h-7 text-xs w-40"
              />
            </div>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsAssignModalOpen(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Programa
            </Button>
          </div>

          {/* GRID PRINCIPAL - 80% del espacio total */}
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <Card className="text-center py-4">
              <CardContent>
                <Car className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold mb-1">Sin programas</h3>
                <p className="text-xs text-gray-500 mb-2">
                  Asigna template a vehículo
                </p>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsAssignModalOpen(true)}
                >
                  Crear
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
              {filteredPrograms.map(program => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onSelect={handleSelectProgram}
                  onEdit={handleEditProgram}
                  onDelete={handleDeleteProgram}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Packages Tab - Datos maximizados */}
        <TabsContent value="packages" className="space-y-2 mt-2">
          {selectedProgram && (
            <>
              {/* Contexto mínimo - 5% */}
              <Card className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {selectedProgram.vehicle.licensePlate}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProgram(null);
                        setActiveTab('programs');
                      }}
                      className="h-6 text-xs"
                    >
                      ←
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Grid de Packages - 95% */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectedProgram.packages.map(pkg => {
                  const scheduledKm = pkg.items[0]?.scheduledKm || 0;
                  const executedKm = pkg.executedKm || null;
                  const isCompleted = pkg.status === 'COMPLETED';
                  const isPending = pkg.status === 'PENDING';

                  return (
                    <Card
                      key={pkg.id}
                      className={`hover:shadow-sm transition-all cursor-pointer ${
                        isCompleted ? 'bg-green-50 border-green-200' : ''
                      }`}
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-semibold truncate">
                            {pkg.name}
                          </h3>
                          <Badge
                            variant={isCompleted ? 'default' : 'outline'}
                            className="text-xs h-4 ml-2"
                          >
                            {pkg.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tipo:</span>
                            <Badge variant="outline" className="text-xs h-4">
                              {pkg.packageType}
                            </Badge>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-500">Programado:</span>
                            <span className="font-medium">
                              {scheduledKm.toLocaleString()} km
                            </span>
                          </div>

                          {executedKm && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Ejecutado:</span>
                              <span className="font-medium text-green-600">
                                {executedKm.toLocaleString()} km
                              </span>
                            </div>
                          )}

                          {isPending && scheduledKm > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Faltan:</span>
                              <span className="font-medium">
                                {(
                                  scheduledKm - selectedProgram.vehicle.mileage
                                ).toLocaleString()}{' '}
                                km
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-gray-500">Items:</span>
                            <span className="text-blue-600 font-medium">
                              {pkg.items.length}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Items Tab - Lista densa */}
        <TabsContent value="items" className="space-y-2 mt-2">
          {selectedPackage && (
            <>
              {/* Contexto mínimo */}
              <Card className="bg-gradient-to-r from-green-50 to-purple-50">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {selectedPackage.name}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPackage(null);
                        setActiveTab('packages');
                      }}
                      className="h-6 text-xs"
                    >
                      ←
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lista densa de Items */}
              <div className="space-y-1">
                {selectedPackage.items.map(item => (
                  <Card
                    key={item.id}
                    className="hover:shadow-sm transition-all"
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">
                            {item.mantItem.name}
                          </h4>
                          <p className="text-xs text-gray-600 truncate">
                            {item.mantItem.description}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <Badge variant="outline" className="text-xs h-4">
                            {item.status}
                          </Badge>
                          {item.scheduledKm && (
                            <p className="text-xs text-gray-500">
                              {item.scheduledKm.toLocaleString()} km
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Asignar Programa */}
      <FormAssignProgramImproved
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        onSuccess={() => {
          fetchPrograms();
          toast({
            title: '¡Programa asignado!',
            description: 'El programa de mantenimiento se generó correctamente',
          });
        }}
      />
    </div>
  );
}
