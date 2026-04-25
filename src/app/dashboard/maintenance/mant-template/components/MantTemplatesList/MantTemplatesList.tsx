'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Package,
  Wrench,
  Edit,
  Trash2,
  ChevronRight,
  Settings,
  Search,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CloneTemplateModal } from '@/components/maintenance/templates/CloneTemplateModal';
import { FormAddPackage } from '../FormEditMantTemplate/components/FormAddPackage';
import { FormEditPackage } from '../FormEditMantTemplate/components/FormEditPackage';
import { FormAddPackageItem } from '../FormEditMantTemplate/components/FormEditPackage/components/FormAddPackageItem';
import { FormEditPackageItem } from '../FormEditMantTemplate/components/FormEditPackage/components/FormEditPackageItem';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import {
  MantTemplatesListProps,
  MaintenancePackage,
  PackageItem,
} from './MantTemplatesList.types';

interface GlobalTemplateCardProps {
  template: MantTemplatesListProps;
  onSelect: (template: MantTemplatesListProps) => void;
  onCloneSuccess: () => void;
}

function GlobalTemplateCard({
  template,
  onSelect,
  onCloneSuccess,
}: GlobalTemplateCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex flex-col overflow-hidden">
      {/* Vehicle image header */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center h-32 p-4">
        <img
          src={template.imageUrl ?? '/vehicles/default.svg'}
          alt={template.vehicleType?.name ?? 'Vehículo'}
          className="h-full w-full object-contain"
          onError={e => {
            (e.currentTarget as HTMLImageElement).src = '/vehicles/default.svg';
          }}
        />
      </div>

      <CardContent className="p-4 flex flex-col flex-1">
        {/* Vehicle type badge */}
        <Badge
          variant="outline"
          className="self-start mb-2 bg-blue-50 text-blue-700 text-xs"
        >
          {template.vehicleType?.name}
        </Badge>

        {/* Name + description */}
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm leading-snug">
          {template.name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
          {template.description || 'Sin descripción'}
        </p>

        {/* Packages count */}
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
          <Package className="h-3 w-3" />
          <span>
            {template.packages?.length || 0} paquetes de mantenimiento
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(template)}
            className="flex-1 h-8 text-xs"
          >
            <ChevronRight className="h-3 w-3 mr-1" />
            Ver detalles
          </Button>
          <CloneTemplateModal
            templateId={template.id}
            originalName={template.name}
            onSuccess={onCloneSuccess}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function MantTemplatesList() {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] =
    useState<MantTemplatesListProps | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<MaintenancePackage | null>(null);

  const [templates, setTemplates] = useState<MantTemplatesListProps[]>([]);
  const [packages, setPackages] = useState<MaintenancePackage[]>([]);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<MaintenancePackage | null>(null);

  const [isAddPackageItemOpen, setIsAddPackageItemOpen] = useState(false);
  const [isEditPackageItemOpen, setIsEditPackageItemOpen] = useState(false);
  const [editingPackageItem, setEditingPackageItem] =
    useState<PackageItem | null>(null);

  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/maintenance/mant-template/global');
      setTemplates(res.data);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los planes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchPackages = useCallback(
    async (templateId: string) => {
      if (!templateId) return;
      try {
        const res = await axios.get(
          `/api/maintenance/packages?templateId=${templateId}`
        );
        setPackages(res.data);
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los paquetes',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const fetchPackageItems = useCallback(
    async (packageId: string) => {
      if (!packageId) return;
      try {
        const res = await axios.get(
          `/api/maintenance/package-items?packageId=${packageId}`
        );
        setPackageItems(res.data);
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los items',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = (template: MantTemplatesListProps) => {
    setSelectedTemplate(template);
    setSelectedPackage(null);
    setPackageItems([]);
    setActiveTab('packages');
    fetchPackages(template.id);
  };

  const handleSelectPackage = (pkg: MaintenancePackage) => {
    setSelectedPackage(pkg);
    setPackageItems([]);
    setActiveTab('items');
    fetchPackageItems(pkg.id);
  };

  const handleEditPackage = (pkg: MaintenancePackage) => {
    setEditingPackage(pkg);
    setIsEditPackageOpen(true);
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este paquete?')) return;
    try {
      await axios.delete(`/api/maintenance/packages/${id}`);
      setPackages(prev => prev.filter(p => p.id !== id));
      if (selectedPackage?.id === id) {
        setSelectedPackage(null);
        setPackageItems([]);
      }
      toast({ title: 'Paquete eliminado' });
    } catch {
      toast({
        title: 'Error',
        description: 'Error al eliminar el paquete.',
        variant: 'destructive',
      });
    }
  };

  const handleEditPackageItem = (item: PackageItem) => {
    setEditingPackageItem(item);
    setIsEditPackageItemOpen(true);
  };

  const handleDeletePackageItem = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este item?')) return;
    try {
      await axios.delete(`/api/maintenance/package-items/${id}`);
      setPackageItems(prev => prev.filter(i => i.id !== id));
      toast({ title: 'Item eliminado' });
    } catch {
      toast({
        title: 'Error',
        description: 'Error al eliminar el item.',
        variant: 'destructive',
      });
    }
  };

  const formatMantType = (mantType: string) => {
    const types: Record<string, string> = {
      PREVENTIVE: 'Preventivo',
      PREDICTIVE: 'Predictivo',
      CORRECTIVE: 'Correctivo',
      EMERGENCY: 'Emergencia',
    };
    return types[mantType] ?? mantType;
  };

  const getMantTypeColor = (mantType: string) => {
    const colors: Record<string, string> = {
      PREVENTIVE: 'bg-green-100 text-green-800',
      PREDICTIVE: 'bg-blue-100 text-blue-800',
      CORRECTIVE: 'bg-yellow-100 text-yellow-800',
      EMERGENCY: 'bg-red-100 text-red-800',
    };
    return colors[mantType] ?? 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return colors[priority] ?? 'bg-gray-100 text-gray-800';
  };

  const formatPriority = (priority: string) => {
    const priorities: Record<string, string> = {
      LOW: 'Baja',
      MEDIUM: 'Media',
      HIGH: 'Alta',
      CRITICAL: 'Crítica',
    };
    return priorities[priority] ?? priority;
  };

  const safePackages = Array.isArray(packages)
    ? packages
    : ((packages as any)?.data ?? []);
  const safePackageItems = Array.isArray(packageItems)
    ? packageItems
    : ((packageItems as any)?.data ?? []);

  const packageMetrics = selectedTemplate
    ? {
        total: safePackages.length,
        preventive: safePackages.filter(
          (p: MaintenancePackage) => p.packageType === 'PREVENTIVE'
        ).length,
        corrective: safePackages.filter(
          (p: MaintenancePackage) => p.packageType === 'CORRECTIVE'
        ).length,
        predictive: safePackages.filter(
          (p: MaintenancePackage) => p.packageType === 'PREDICTIVE'
        ).length,
      }
    : null;

  const itemMetrics = selectedPackage
    ? {
        total: safePackageItems.length,
        low: safePackageItems.filter((i: PackageItem) => i.priority === 'LOW')
          .length,
        medium: safePackageItems.filter(
          (i: PackageItem) => i.priority === 'MEDIUM'
        ).length,
        high: safePackageItems.filter((i: PackageItem) => i.priority === 'HIGH')
          .length,
        critical: safePackageItems.filter(
          (i: PackageItem) => i.priority === 'CRITICAL'
        ).length,
      }
    : null;

  const packageColumns: ColumnDef<MaintenancePackage>[] = [
    {
      accessorKey: 'triggerKm',
      header: 'Kilometraje',
      cell: ({ row }) => (
        <span className="font-semibold">
          {(row.getValue('triggerKm') as number).toLocaleString()} km
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre del Paquete',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">{row.getValue('name')}</div>
          <div className="text-sm text-gray-500">
            {row.original._count?.packageItems || 0} items
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'packageType',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge
          className={getMantTypeColor(row.getValue('packageType') as string)}
        >
          {formatMantType(row.getValue('packageType') as string)}
        </Badge>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      cell: ({ row }) => (
        <Badge className={getPriorityColor(row.getValue('priority') as string)}>
          {formatPriority(row.getValue('priority') as string)}
        </Badge>
      ),
    },
    {
      accessorKey: 'estimatedCost',
      header: 'Costo Est.',
      cell: ({ row }) => {
        const cost = row.getValue('estimatedCost') as number;
        return cost ? `$${cost.toLocaleString()}` : '-';
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectPackage(row.original)}
            className="text-blue-600 hover:text-blue-700"
          >
            <ChevronRight className="h-4 w-4 mr-1" /> Ver Items
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditPackage(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeletePackage(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const packageItemColumns: ColumnDef<PackageItem>[] = [
    {
      accessorKey: 'mantItem.name',
      header: 'Item de Mantenimiento',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">{row.original.mantItem.name}</div>
          <div className="text-sm text-gray-500">
            {row.original.mantItem.category.name}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'mantItem.mantType',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge className={getMantTypeColor(row.original.mantItem.mantType)}>
          {formatMantType(row.original.mantItem.mantType)}
        </Badge>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      cell: ({ row }) => (
        <Badge className={getPriorityColor(row.getValue('priority') as string)}>
          {formatPriority(row.getValue('priority') as string)}
        </Badge>
      ),
    },
    {
      accessorKey: 'triggerKm',
      header: 'Frecuencia',
      cell: ({ row }) => (
        <span className="font-mono">
          {(row.getValue('triggerKm') as number).toLocaleString()} km
        </span>
      ),
    },
    {
      accessorKey: 'estimatedTime',
      header: 'Tiempo Est.',
      cell: ({ row }) => {
        const t = row.original.estimatedTime;
        return t ? `${t}h` : '-';
      },
    },
    {
      accessorKey: 'estimatedCost',
      header: 'Costo Est.',
      cell: ({ row }) => {
        const c = row.original.estimatedCost;
        return c ? `$${c.toLocaleString()}` : '-';
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditPackageItem(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeletePackageItem(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredTemplates = templates.filter(
    t =>
      searchTerm === '' ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.vehicleType?.name ?? '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const packagesTable = useReactTable({
    data: safePackages,
    columns: packageColumns,
    getCoreRowModel: getCoreRowModel(),
  });
  const packageItemsTable = useReactTable({
    data: safePackageItems,
    columns: packageItemColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Cargando planes de mantenimiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Planes de Mantenimiento
          </h1>
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <FileText className="h-4 w-4 mr-1" />
            <span>Base de conocimiento de Fleet Care</span>
            {selectedTemplate && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <Package className="h-4 w-4 mr-1" />
                <span>{selectedTemplate.name}</span>
              </>
            )}
            {selectedPackage && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <Wrench className="h-4 w-4 mr-1" />
                <span>{selectedPackage.name}</span>
              </>
            )}
          </div>
        </div>

        {activeTab === 'packages' && selectedTemplate && (
          <Button
            onClick={() => setIsAddPackageOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Nuevo Paquete
          </Button>
        )}
        {activeTab === 'items' && selectedPackage && (
          <Button
            onClick={() => setIsAddPackageItemOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Nuevo Item
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="templates"
            className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
          >
            <FileText className="h-4 w-4" /> Planes ({templates.length})
          </TabsTrigger>
          <TabsTrigger
            value="packages"
            disabled={!selectedTemplate}
            className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
          >
            <Package className="h-4 w-4" /> Paquetes (
            {packageMetrics?.total || 0})
          </TabsTrigger>
          <TabsTrigger
            value="items"
            disabled={!selectedPackage}
            className="flex items-center gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
          >
            <Wrench className="h-4 w-4" /> Items ({itemMetrics?.total || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Global plans grid */}
        <TabsContent value="templates" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 h-3 w-3" />
            <Input
              placeholder="Buscar por nombre o tipo de vehículo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map(template => (
                <GlobalTemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  onCloneSuccess={fetchTemplates}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h4 className="text-lg font-semibold mb-2">
                  {templates.length === 0
                    ? 'No hay planes disponibles'
                    : 'No se encontraron planes'}
                </h4>
                <p className="text-gray-600">
                  {templates.length === 0
                    ? 'Los planes globales se cargan automáticamente al iniciar la plataforma.'
                    : 'Intenta ajustar el término de búsqueda.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Packages */}
        <TabsContent value="packages" className="space-y-3">
          {selectedTemplate && (
            <>
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          selectedTemplate.imageUrl ?? '/vehicles/default.svg'
                        }
                        alt={selectedTemplate.vehicleType?.name}
                        className="h-10 w-16 object-contain"
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).src =
                            '/vehicles/default.svg';
                        }}
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-green-800">
                          {selectedTemplate.name}
                        </h3>
                        <p className="text-green-600 text-xs">
                          {selectedTemplate.vehicleType?.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('templates')}
                      className="border-green-300 text-green-700 hover:bg-green-200 h-7 text-xs"
                    >
                      <ChevronRight className="h-3 w-3 mr-1 rotate-180" />{' '}
                      Cambiar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {packageMetrics && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-green-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-green-600">
                      {packageMetrics.total}
                    </div>
                    <div className="text-xs text-green-700">Total</div>
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-blue-600">
                      {packageMetrics.preventive}
                    </div>
                    <div className="text-xs text-blue-700">Preventivos</div>
                  </div>
                  <div className="bg-yellow-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-yellow-600">
                      {packageMetrics.corrective}
                    </div>
                    <div className="text-xs text-yellow-700">Correctivos</div>
                  </div>
                  <div className="bg-purple-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-purple-600">
                      {packageMetrics.predictive}
                    </div>
                    <div className="text-xs text-purple-700">Predictivos</div>
                  </div>
                </div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-green-500" /> Paquetes de
                    Mantenimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {packagesTable.getHeaderGroups().map(hg => (
                          <TableRow key={hg.id}>
                            {hg.headers.map(h => (
                              <TableHead key={h.id} className="font-semibold">
                                {h.isPlaceholder
                                  ? null
                                  : flexRender(
                                      h.column.columnDef.header,
                                      h.getContext()
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {packagesTable.getRowModel().rows?.length ? (
                          packagesTable.getRowModel().rows.map(row => (
                            <TableRow key={row.id} className="hover:bg-gray-50">
                              {row.getVisibleCells().map(cell => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={packageColumns.length}
                              className="h-24 text-center"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Package className="h-8 w-8 text-gray-400" />
                                <p className="text-gray-500">
                                  No hay paquetes en este plan
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsAddPackageOpen(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" /> Crear primer
                                  paquete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab 3: Package Items */}
        <TabsContent value="items" className="space-y-3">
          {selectedPackage && (
            <>
              <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-purple-800">
                        {selectedPackage.name}
                      </h3>
                      <p className="text-purple-600 text-xs">
                        {selectedPackage.triggerKm.toLocaleString()} km •{' '}
                        {formatMantType(selectedPackage.packageType)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('packages')}
                      className="border-purple-300 text-purple-700 hover:bg-purple-200 h-7 text-xs"
                    >
                      <ChevronRight className="h-3 w-3 mr-1 rotate-180" />{' '}
                      Cambiar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {itemMetrics && (
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-purple-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-purple-600">
                      {itemMetrics.total}
                    </div>
                    <div className="text-xs text-purple-700">Total</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-gray-600">
                      {itemMetrics.low}
                    </div>
                    <div className="text-xs text-gray-700">Baja</div>
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-blue-600">
                      {itemMetrics.medium}
                    </div>
                    <div className="text-xs text-blue-700">Media</div>
                  </div>
                  <div className="bg-orange-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-orange-600">
                      {itemMetrics.high}
                    </div>
                    <div className="text-xs text-orange-700">Alta</div>
                  </div>
                  <div className="bg-red-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-red-600">
                      {itemMetrics.critical}
                    </div>
                    <div className="text-xs text-red-700">Crítica</div>
                  </div>
                </div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-purple-500" /> Items del
                    Paquete
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {packageItemsTable.getHeaderGroups().map(hg => (
                          <TableRow key={hg.id}>
                            {hg.headers.map(h => (
                              <TableHead key={h.id} className="font-semibold">
                                {h.isPlaceholder
                                  ? null
                                  : flexRender(
                                      h.column.columnDef.header,
                                      h.getContext()
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {packageItemsTable.getRowModel().rows?.length ? (
                          packageItemsTable.getRowModel().rows.map(row => (
                            <TableRow key={row.id} className="hover:bg-gray-50">
                              {row.getVisibleCells().map(cell => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={packageItemColumns.length}
                              className="h-24 text-center"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Wrench className="h-8 w-8 text-gray-400" />
                                <p className="text-gray-500">
                                  No hay items en este paquete
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsAddPackageItemOpen(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" /> Agregar
                                  primer item
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {selectedTemplate && (
        <FormAddPackage
          isOpen={isAddPackageOpen}
          setIsOpen={setIsAddPackageOpen}
          templateId={selectedTemplate.id}
          onAddPackage={() => fetchPackages(selectedTemplate.id)}
        />
      )}

      {editingPackage && (
        <FormEditPackage
          isOpen={isEditPackageOpen}
          setIsOpen={setIsEditPackageOpen}
          packageData={editingPackage}
          onEditPackage={() => {
            if (selectedTemplate) fetchPackages(selectedTemplate.id);
          }}
        />
      )}

      {selectedPackage && (
        <FormAddPackageItem
          isOpen={isAddPackageItemOpen}
          setIsOpen={setIsAddPackageItemOpen}
          packageId={selectedPackage.id}
          onAddItem={() => fetchPackageItems(selectedPackage.id)}
        />
      )}

      {editingPackageItem && (
        <FormEditPackageItem
          isOpen={isEditPackageItemOpen}
          setIsOpen={setIsEditPackageItemOpen}
          item={editingPackageItem}
          onEditItem={() => {
            if (selectedPackage) fetchPackageItems(selectedPackage.id);
          }}
        />
      )}
    </div>
  );
}
